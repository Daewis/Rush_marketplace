import express, { Response } from 'express';
import { Order, OrderStatus, PaymentStatus } from '../models/Order.js';
import { VendorProfile } from '../models/VendorProfile.js';
import { Product } from '../models/Product.js';
import { DeliveryRequest, DeliveryType, DeliveryRequestStatus } from '../models/logistics/DeliveryRequest.js';
import { Ride, RideStatus } from '../models/logistics/Ride.js';
import { Capability } from '../models/User.js';
import { jwtRequired, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// All order routes require authentication.
router.use(jwtRequired(false));

/**
 * GET /api/orders
 * Lists orders for the authenticated user (as customer OR as vendor).
 * The role check uses capability, not activeWorkspace — a vendor who's
 * currently in customer mode still needs to see incoming orders.
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const filter: any = {};

    // Customer view: orders they placed.
    // Vendor view: orders for their store.
    // A user with BOTH capabilities sees both sets.
    const or: any[] = [{ customerId: user._id }];
    if (user.hasCapability(Capability.VENDOR)) {
      const profile = await VendorProfile.findOne({ userId: user._id }).select('_id');
      if (profile) or.push({ vendorId: profile._id });
    }

    filter.$or = or;

    if (req.query.status) filter.orderStatus = req.query.status;

    const orders = await Order.find(filter)
      .populate('customerId', 'fullName email phone')
      .populate('vendorId', 'businessName slug logo storeTheme')
      .sort({ createdAt: -1 })
      .limit(100);

    return res.json({
      success: true,
      data: {
        orders: orders.map((o) => ({
          id: o._id.toString(),
          order_number: o.orderNumber,
          customer_name: o.customerId?.fullName || null,
          customer_phone: o.customerId?.phone || null,
          vendor_name: (o.vendorId as any)?.businessName || null,
          vendor_slug: (o.vendorId as any)?.slug || null,
          items: o.items,
          subtotal: o.subtotal,
          delivery_fee: o.deliveryFee,
          total: o.total,
          payment_status: o.paymentStatus,
          order_status: o.orderStatus,
          delivery_address: o.deliveryAddress,
          tracking_code: o.trackingCode,
          created_at: o.createdAt.toISOString(),
        })),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/orders/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customerId', 'fullName email phone')
      .populate('vendorId', 'businessName slug logo storeTheme storeCoverColor phone whatsapp');

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    // Authorization: only the customer who placed it, the vendor who
    // received it, or an admin can view order details.
    const user = req.user!;
    const isCustomer = order.customerId?._id?.toString() === user._id.toString();
    const vendorProfile = await VendorProfile.findOne({ userId: user._id }).select('_id');
    const isVendor = vendorProfile && order.vendorId?.toString() === vendorProfile._id.toString();
    const isAdmin = user.systemRoles.includes('ADMIN');
    if (!isCustomer && !isVendor && !isAdmin) {
      return res.status(403).json({ success: false, error: 'Not authorized to view this order' });
    }

    return res.json({
      success: true,
      data: {
        order: {
          id: order._id.toString(),
          order_number: order.orderNumber,
          customer: order.customerId
            ? {
                name: (order.customerId as any).fullName,
                phone: (order.customerId as any).phone,
                email: (order.customerId as any).email,
              }
            : null,
          vendor: order.vendorId
            ? {
                business_name: (order.vendorId as any).businessName,
                slug: (order.vendorId as any).slug,
                logo: (order.vendorId as any).logo,
                phone: (order.vendorId as any).phone,
                whatsapp: (order.vendorId as any).whatsapp,
              }
            : null,
          items: order.items,
          subtotal: order.subtotal,
          delivery_fee: order.deliveryFee,
          service_fee: order.serviceFee,
          total: order.total,
          payment_status: order.paymentStatus,
          order_status: order.orderStatus,
          delivery_address: order.deliveryAddress,
          tracking_code: order.trackingCode,
          delivery_request_id: order.deliveryRequestId?.toString() || null,
          notes: order.notes,
          created_at: order.createdAt.toISOString(),
        },
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/orders/:id/confirm
 * Vendor confirms the order (payment received, stock reserved).
 * Transitions PENDING → CONFIRMED. Only the order's vendor can do this.
 */
router.post('/:id/confirm', async (req: AuthRequest, res: Response) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

    const vendorProfile = await VendorProfile.findOne({ userId: req.userId }).select('_id');
    if (!vendorProfile || order.vendorId?.toString() !== vendorProfile._id.toString()) {
      return res.status(403).json({ success: false, error: 'Only the order vendor can confirm' });
    }
    if (order.orderStatus !== OrderStatus.PENDING) {
      return res.status(409).json({ success: false, error: `Order is already ${order.orderStatus}` });
    }

    order.orderStatus = OrderStatus.CONFIRMED;
    await order.save();

    return res.json({ success: true, message: 'Order confirmed', data: { id: order._id.toString(), order_status: order.orderStatus } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/orders/:id/ready
 * Vendor marks the order READY_FOR_DELIVERY — this is the logistics
 * handoff trigger. Creates a DeliveryRequest for the order, sets
 * orderStatus = READY_FOR_DELIVERY, and links deliveryRequestId
 * back on the Order. From here the existing Dispatch/Driver logistics
 * flow takes over (see routes/logistics/deliveries.ts).
 */
router.post('/:id/ready', async (req: AuthRequest, res: Response) => {
  try {
    const order = await Order.findById(req.params.id).populate({
      path: 'vendorId',
      select: 'businessName location',
    });
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

    const vendorProfile = await VendorProfile.findOne({ userId: req.userId }).select('_id businessName location');
    if (!vendorProfile || order.vendorId?.toString() !== vendorProfile._id.toString()) {
      return res.status(403).json({ success: false, error: 'Only the order vendor can mark ready' });
    }
    if (order.orderStatus !== OrderStatus.CONFIRMED && order.orderStatus !== OrderStatus.PROCESSING) {
      return res.status(409).json({
        success: false,
        error: `Order must be CONFIRMED or PROCESSING (currently ${order.orderStatus})`,
      });
    }

    // Create the DeliveryRequest — the bridge to logistics.
    // Pickup is the vendor's location, dropoff is the customer's
    // deliveryAddress. itemType = the order's items summary.
    const vendor = vendorProfile;
    const customerAddress = order.deliveryAddress;

    const itemSummary = order.items.map((i) => `${i.quantity}× ${i.productName}`).join(', ').slice(0, 200);

    const deliveryRequest = await DeliveryRequest.create({
      orderId: order._id,
      type: DeliveryType.GOODS,
      customerId: order.customerId,
      vendorId: order.vendorId,
      pickup: {
        name: vendor.businessName,
        address: vendor.location?.address || 'Vendor location',
        lat: null,
        lng: null,
      },
      dropoff: {
        name: customerAddress.fullName,
        address: customerAddress.address,
        lat: null,
        lng: null,
      },
      itemType: itemSummary,
      notes: customerAddress.notes || null,
      fare: order.deliveryFee,
      status: DeliveryRequestStatus.REQUESTED,
      trackingCode: order.trackingCode,
    });

    order.orderStatus = OrderStatus.READY_FOR_DELIVERY;
    order.deliveryRequestId = deliveryRequest._id;
    await order.save();

    return res.json({
      success: true,
      message: 'Order marked ready for delivery — a rider will be assigned shortly.',
      data: {
        order_id: order._id.toString(),
        order_status: order.orderStatus,
        delivery_request_id: deliveryRequest._id.toString(),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/orders/:id/cancel
 * Either the customer or the vendor can cancel. Refunds the stock
 * and frees the rider (if a DeliveryRequest was already assigned).
 */
router.post('/:id/cancel', async (req: AuthRequest, res: Response) => {
  try {
    const { reason } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

    const isCustomer = order.customerId?.toString() === req.userId;
    const vendorProfile = await VendorProfile.findOne({ userId: req.userId }).select('_id');
    const isVendor = vendorProfile && order.vendorId?.toString() === vendorProfile._id.toString();
    if (!isCustomer && !isVendor) {
      return res.status(403).json({ success: false, error: 'Not authorized to cancel this order' });
    }
    if (order.orderStatus === OrderStatus.DELIVERED || order.orderStatus === OrderStatus.CANCELLED) {
      return res.status(409).json({ success: false, error: `Cannot cancel a ${order.orderStatus} order` });
    }

    // Refund stock.
    for (const item of order.items) {
      await Product.updateOne(
        { _id: item.productId },
        { $inc: { stock: item.quantity, totalSold: -item.quantity } }
      );
    }

    // Cancel the linked DeliveryRequest if any.
    if (order.deliveryRequestId) {
      await DeliveryRequest.findByIdAndUpdate(order.deliveryRequestId, {
        status: DeliveryRequestStatus.CANCELLED,
      });
    }

    order.orderStatus = OrderStatus.CANCELLED;
    order.cancelledAt = new Date();
    order.cancellationReason = reason || null;
    await order.save();

    return res.json({
      success: true,
      message: 'Order cancelled — stock returned to vendor',
      data: { id: order._id.toString(), order_status: order.orderStatus },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
