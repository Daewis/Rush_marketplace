import express, { Response } from 'express';
import { DeliveryRequest, DeliveryRequestStatus, DeliveryType } from '../../models/logistics/DeliveryRequest.js';
import { Ride, RideStatus } from '../../models/logistics/Ride.js';
import { Driver, DriverStatus } from '../../models/logistics/Driver.js';
import { Order, OrderStatus } from '../../models/Order.js';
import { Dispatch, DispatchEvent } from '../../models/logistics/Dispatch.js';
import { jwtRequired, AuthRequest } from '../../middleware/auth.js';
import { riderRequired } from '../../middleware/role-check.js';
import { NotificationService } from '../../services/notificationService.js';

const router = express.Router();

/**
 * Logistics handoff — the bridge between vendor product orders and the
 * rider network.
 *
 * Flow:
 *   1. Vendor marks order READY_FOR_DELIVERY (POST /api/orders/:id/ready)
 *   2. A DeliveryRequest is created (status: REQUESTED)
 *   3. A rider sees it in GET /api/logistics/deliveries and self-assigns
 *      via POST /api/logistics/deliveries/:id/accept
 *   4. That creates a Ride (the existing logistics model that powers
 *      dispatch events + live tracking) and links it back to the order
 *   5. Standard Ride dispatch flow takes over (picked_up → arrived →
 *      completed), and when the Ride completes, the Order is marked
 *      DELIVERED.
 */

// GET /api/logistics/deliveries
// Open delivery requests — the rider's "available deliveries" feed.
// Mirrors GET /api/logistics/rides but for vendor-originated deliveries.
router.get('/', jwtRequired(false), async (req: AuthRequest, res: Response) => {
  try {
    const deliveries = await DeliveryRequest.find({ status: DeliveryRequestStatus.REQUESTED })
      .populate('customerId', 'fullName phone')
      .populate('vendorId', 'businessName slug logo')
      .sort({ createdAt: -1 })
      .limit(50);

    return res.json({
      success: true,
      data: {
        deliveries: deliveries.map((d) => ({
          id: d._id.toString(),
          order_id: d.orderId?.toString() || null,
          type: d.type,
          customer_name: (d.customerId as any)?.fullName || null,
          customer_phone: (d.customerId as any)?.phone || null,
          vendor_name: (d.vendorId as any)?.businessName || null,
          vendor_slug: (d.vendorId as any)?.slug || null,
          pickup: d.pickup,
          dropoff: d.dropoff,
          item_type: d.itemType,
          notes: d.notes,
          fare: d.fare,
          tracking_code: d.trackingCode,
          created_at: d.createdAt.toISOString(),
        })),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/logistics/deliveries/my
// Rider's accepted deliveries + deliveries they've completed.
router.get('/my', jwtRequired(false), async (req: AuthRequest, res: Response) => {
  try {
    const deliveries = await DeliveryRequest.find({
      riderId: req.userId,
      status: { $in: [DeliveryRequestStatus.ASSIGNED, DeliveryRequestStatus.PICKED_UP, DeliveryRequestStatus.IN_TRANSIT, DeliveryRequestStatus.COMPLETED] },
    })
      .populate('customerId', 'fullName phone')
      .populate('vendorId', 'businessName slug logo')
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: {
        deliveries: deliveries.map((d) => ({
          id: d._id.toString(),
          order_id: d.orderId?.toString() || null,
          ride_id: d.rideId?.toString() || null,
          status: d.status,
          type: d.type,
          customer_name: (d.customerId as any)?.fullName || null,
          customer_phone: (d.customerId as any)?.phone || null,
          vendor_name: (d.vendorId as any)?.businessName || null,
          pickup: d.pickup,
          dropoff: d.dropoff,
          item_type: d.itemType,
          fare: d.fare,
          tracking_code: d.trackingCode,
          created_at: d.createdAt.toISOString(),
        })),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/logistics/deliveries/:id/accept
 * A rider accepts an open delivery request. This:
 *   1. Sets the DeliveryRequest.status = ASSIGNED + riderId = current user
 *   2. Creates a Ride (links it via rideId) — the existing logistics
 *      model that powers dispatch events + live tracking
 *   3. Flips the rider's Driver.status to ON_TRIP
 *   4. Updates the Order.orderStatus to OUT_FOR_DELIVERY
 *   5. Notifies the customer
 */
router.post('/:id/accept', jwtRequired(false), riderRequired, async (req: AuthRequest, res: Response) => {
  try {
    const delivery = await DeliveryRequest.findById(req.params.id);
    if (!delivery) {
      return res.status(404).json({ success: false, error: 'Delivery request not found' });
    }
    if (delivery.status !== DeliveryRequestStatus.REQUESTED) {
      return res.status(409).json({ success: false, error: 'This delivery has already been assigned' });
    }

    // Check rider is available.
    const driver = await Driver.findOne({ userId: req.userId });
    if (!driver) {
      return res.status(404).json({ success: false, error: 'Rider profile not found' });
    }
    if (driver.status !== DriverStatus.AVAILABLE) {
      return res.status(409).json({ success: false, error: `Rider is currently ${driver.status}` });
    }

    // Create the linked Ride record — this is what the existing dispatch
    // flow (routes/logistics/dispatch.ts) reads from.
    const ride = await Ride.create({
      customerId: delivery.customerId,
      driverId: req.userId,
      sourceJobId: null, // vendor orders don't have a Job, they have an Order
      pickup: delivery.pickup,
      dropoff: delivery.dropoff,
      itemType: delivery.itemType,
      notes: delivery.notes,
      status: RideStatus.ASSIGNED,
      fare: delivery.fare || 0,
    });

    delivery.riderId = req.userId as any;
    delivery.rideId = ride._id;
    delivery.status = DeliveryRequestStatus.ASSIGNED;
    await delivery.save();

    // Flip the rider's operational status.
    driver.status = DriverStatus.ON_TRIP;
    await driver.save();

    // Update the Order's status — order is now in the logistics pipeline.
    if (delivery.orderId) {
      await Order.updateOne(
        { _id: delivery.orderId },
        { orderStatus: OrderStatus.OUT_FOR_DELIVERY }
      );
    }

    await Dispatch.create({ rideId: ride._id, event: DispatchEvent.DRIVER_ASSIGNED, actorId: req.userId });
    await NotificationService.sendNotification(
      delivery.customerId.toString(),
      'Rider Assigned',
      'A rider has been assigned to your delivery.',
      'ride_update'
    );

    return res.json({
      success: true,
      message: 'Delivery accepted — head to the pickup location',
      data: {
        delivery_id: delivery._id.toString(),
        ride_id: ride._id.toString(),
        status: delivery.status,
        pickup: delivery.pickup,
        dropoff: delivery.dropoff,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/logistics/deliveries/:id/complete
 * Rider marks the delivery as COMPLETED. This is a convenience route
 * for vendor-order deliveries — the existing dispatch flow at
 * /api/logistics/dispatch/:rideId/event also works (since we created
 * a Ride), but this route closes the loop on the Order side too:
 *   1. DeliveryRequest.status = COMPLETED
 *   2. Ride.status = COMPLETED (via Dispatch event)
 *   3. Order.orderStatus = DELIVERED
 *   4. Rider's Driver.status back to AVAILABLE + totalDeliveries++
 */
router.post('/:id/complete', jwtRequired(false), riderRequired, async (req: AuthRequest, res: Response) => {
  try {
    const delivery = await DeliveryRequest.findById(req.params.id);
    if (!delivery) {
      return res.status(404).json({ success: false, error: 'Delivery request not found' });
    }
    if (delivery.riderId?.toString() !== req.userId) {
      return res.status(403).json({ success: false, error: 'You are not assigned to this delivery' });
    }
    if (delivery.status === DeliveryRequestStatus.COMPLETED) {
      return res.status(409).json({ success: false, error: 'Delivery already completed' });
    }

    delivery.status = DeliveryRequestStatus.COMPLETED;
    await delivery.save();

    // Complete the linked Ride + record dispatch event.
    if (delivery.rideId) {
      await Ride.findByIdAndUpdate(delivery.rideId, {
        status: RideStatus.COMPLETED,
        completedAt: new Date(),
      });
      await Dispatch.create({
        rideId: delivery.rideId,
        event: DispatchEvent.COMPLETED,
        actorId: req.userId,
      });
    }

    // Mark the Order as DELIVERED.
    if (delivery.orderId) {
      await Order.updateOne({ _id: delivery.orderId }, { orderStatus: OrderStatus.DELIVERED });
    }

    // Free up the rider.
    await Driver.findOneAndUpdate(
      { userId: req.userId },
      {
        status: DriverStatus.AVAILABLE,
        $inc: { totalTrips: 1, totalDeliveries: 1 },
      }
    );

    await NotificationService.sendNotification(
      delivery.customerId.toString(),
      'Delivery Complete',
      'Your order has been delivered. Enjoy!',
      'delivery_complete'
    );

    return res.json({
      success: true,
      message: 'Delivery completed',
      data: { delivery_id: delivery._id.toString(), status: delivery.status },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
