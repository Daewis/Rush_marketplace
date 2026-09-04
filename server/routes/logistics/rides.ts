import express, { Response } from 'express';
import { Ride, RideStatus } from '../../models/logistics/Ride.js';
import { Driver, DriverStatus } from '../../models/logistics/Driver.js';
import { Dispatch, DispatchEvent } from '../../models/logistics/Dispatch.js';
import { Capability } from '../../models/User.js';
import { jwtRequired, AuthRequest } from '../../middleware/auth.js';
import { NotificationService } from '../../services/notificationService.js';

const router = express.Router();

const POPULATE_CUSTOMER = { path: 'customerId', select: 'fullName phone' };
const POPULATE_DRIVER = { path: 'driverId', select: 'fullName phone' };
const POPULATE_JOB = { path: 'sourceJobId', select: 'title' };

async function formatRide(ride: any) {
  let driverLocation = null;
  const driverId = ride.driverId?._id?.toString() || ride.driverId?.toString();
  if (driverId && ['assigned', 'picked_up', 'in_transit'].includes(ride.status)) {
    const driverDoc = await Driver.findOne({ userId: driverId }).select('currentLocation');
    if (driverDoc?.currentLocation) {
      driverLocation = driverDoc.currentLocation;
    }
  }

  return {
    id: ride._id.toString(),
    customer_id: ride.customerId?._id?.toString() || ride.customerId?.toString(),
    customer_name: ride.customerId?.fullName || null,
    customer_phone: ride.customerId?.phone || null,
    driver_id: driverId || null,
    driver_name: ride.driverId?.fullName || null,
    driver_phone: ride.driverId?.phone || null,
    driver_location: driverLocation,
    source_job_id: ride.sourceJobId?._id?.toString() || ride.sourceJobId?.toString() || null,
    source_job_title: ride.sourceJobId?.title || null,
    pickup: ride.pickup,
    dropoff: ride.dropoff,
    item_type: ride.itemType,
    notes: ride.notes,
    status: ride.status,
    fare: ride.fare,
    tracking_code: ride.trackingCode,
    created_at: ride.createdAt.toISOString(),
    picked_up_at: ride.pickedUpAt ? ride.pickedUpAt.toISOString() : null,
    completed_at: ride.completedAt ? ride.completedAt.toISOString() : null,
    cancelled_at: ride.cancelledAt ? ride.cancelledAt.toISOString() : null,
    cancellation_reason: ride.cancellationReason || null,
  };
}

// POST /api/logistics/rides
router.post('/', jwtRequired(false), async (req: AuthRequest, res: Response) => {
  try {
    const { pickup, dropoff, itemType, notes, sourceJobId } = req.body;

    if (!pickup?.address || !dropoff?.address) {
      return res.status(400).json({ success: false, error: 'pickup and dropoff addresses are required' });
    }

    const ride = await Ride.create({
      customerId: req.userId,
      pickup,
      dropoff,
      itemType: itemType || null,
      notes: notes || null,
      sourceJobId: sourceJobId || null,
      status: RideStatus.REQUESTED,
    });

    const populated = await ride.populate([POPULATE_CUSTOMER, POPULATE_JOB]);

    return res.status(201).json({ success: true, data: { ride: await formatRide(populated) } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/logistics/rides
router.get('/', jwtRequired(false), async (req: AuthRequest, res: Response) => {
  try {
    const rides = await Ride.find({ status: RideStatus.REQUESTED })
      .populate([POPULATE_CUSTOMER, POPULATE_JOB])
      .sort({ createdAt: -1 });

    return res.json({ success: true, data: { rides: await Promise.all(rides.map(formatRide)) } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/logistics/rides/my
router.get('/my', jwtRequired(false), async (req: AuthRequest, res: Response) => {
  try {
    const rides = await Ride.find({
      $or: [{ customerId: req.userId }, { driverId: req.userId }],
    })
      .populate([POPULATE_CUSTOMER, POPULATE_DRIVER, POPULATE_JOB])
      .sort({ createdAt: -1 });

    return res.json({ success: true, data: { rides: await Promise.all(rides.map(formatRide)) } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/logistics/rides/:id/status
router.get('/:id/status', jwtRequired(false), async (req: AuthRequest, res: Response) => {
  try {
    const ride = await Ride.findById(req.params.id).populate([POPULATE_CUSTOMER, POPULATE_DRIVER, POPULATE_JOB]);
    if (!ride) {
      return res.status(404).json({ success: false, error: 'Ride not found' });
    }
    return res.json({ success: true, data: { ride: await formatRide(ride) } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/logistics/rides/:id/assign
 *
 * Capability-aware self-assign: a rider self-assigns if they hold
 * the RIDER capability AND it's ACTIVE. Admins/dispatchers can also
 * assign any rider to any ride.
 *
 * The OLD code checked `req.user.role === UserRole.DRIVER` against
 * the single-role field — that broke for users with CUSTOMER+RIDER
 * since their active role might be CUSTOMER even though they're a
 * verified rider. Now we check `user.hasCapability(RIDER)` which
 * inspects both capabilities[] and capabilityStatus.RIDER.
 */
router.post('/:id/assign', jwtRequired(false), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const isSelfAssigning = req.user.hasCapability(Capability.RIDER);
    const isDispatching = req.user.systemRoles.includes('DISPATCHER') || req.user.systemRoles.includes('ADMIN');
    if (!isSelfAssigning && !isDispatching) {
      return res.status(403).json({
        success: false,
        error: 'Only active riders or dispatchers can assign a delivery',
      });
    }

    const driverUserId = isSelfAssigning ? req.userId : req.body.driverUserId;
    const driver = await Driver.findOne({ userId: driverUserId, status: DriverStatus.AVAILABLE });
    if (!driver) {
      return res.status(400).json({ success: false, error: 'Rider not available' });
    }

    const existingRide = await Ride.findById(req.params.id);
    if (!existingRide) {
      return res.status(404).json({ success: false, error: 'Ride not found' });
    }
    if (existingRide.status !== RideStatus.REQUESTED) {
      return res.status(409).json({ success: false, error: 'This delivery has already been assigned or is no longer open' });
    }

    existingRide.driverId = driverUserId as any;
    existingRide.status = RideStatus.ASSIGNED;
    await existingRide.save();
    const ride = await existingRide.populate([POPULATE_CUSTOMER, POPULATE_DRIVER, POPULATE_JOB]);

    driver.status = DriverStatus.ON_TRIP;
    await driver.save();

    await Dispatch.create({ rideId: ride._id, event: DispatchEvent.DRIVER_ASSIGNED, actorId: driverUserId });
    await NotificationService.sendNotification(
      ride.customerId.toString(),
      'Rider Assigned',
      'A rider has been assigned to your delivery.',
      'ride_update'
    );

    return res.json({ success: true, data: { ride: await formatRide(ride) } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/logistics/rides/:id/cancel
router.post('/:id/cancel', jwtRequired(false), async (req: AuthRequest, res: Response) => {
  try {
    const { reason } = req.body;
    const ride = await Ride.findByIdAndUpdate(
      req.params.id,
      { status: RideStatus.CANCELLED, cancelledAt: new Date(), cancellationReason: reason || null },
      { new: true }
    ).populate([POPULATE_CUSTOMER, POPULATE_DRIVER, POPULATE_JOB]);
    if (!ride) {
      return res.status(404).json({ success: false, error: 'Ride not found' });
    }

    if (ride.driverId) {
      await Driver.findOneAndUpdate({ userId: ride.driverId }, { status: DriverStatus.AVAILABLE });
    }

    await Dispatch.create({ rideId: ride._id, event: DispatchEvent.CANCELLED, actorId: req.userId });

    return res.json({ success: true, data: { ride: await formatRide(ride) } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
