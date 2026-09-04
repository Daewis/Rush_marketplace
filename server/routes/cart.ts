import express, { Response } from 'express';
import { Cart } from '../models/Cart.js';
import { Product, ProductStatus } from '../models/Product.js';
import { VendorProfile } from '../models/VendorProfile.js';
import { Order, OrderStatus, PaymentStatus as OrderPaymentStatus } from '../models/Order.js';
import { Capability } from '../models/User.js';
import { jwtRequired, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// All cart routes require an authenticated user. CUSTOMER is implicit
// on every account, so we don't gate on a specific capability here —
// even a vendor or rider can add to their cart to buy from another store.
router.use(jwtRequired(false));

/**
 * GET /api/cart
 * Returns the authenticated user's cart (auto-creates an empty one
 * if missing). Items include a snapshot of product name + price so
 * the cart UI doesn't have to do N extra product fetches on render.
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    let cart = await Cart.findOne({ userId: req.userId });
    if (!cart) {
      cart = await Cart.create({ userId: req.userId, items: [] });
    }

    // Compute vendor-grouped subtotals for the checkout preview.
    const byVendor = new Map<string, number>();
    for (const item of cart.items) {
      const key = item.vendorId?.toString() || 'unknown';
      byVendor.set(key, (byVendor.get(key) || 0) + item.unitPrice * item.quantity);
    }

    return res.json({
      success: true,
      data: {
        cart: {
          items: cart.items.map((item) => ({
            product_id: item.productId.toString(),
            vendor_id: item.vendorId.toString(),
            vendor_name: item.vendorName,
            product_name: item.productName,
            product_image: item.productImage,
            unit_price: item.unitPrice,
            quantity: item.quantity,
            line_total: item.unitPrice * item.quantity,
            added_at: item.addedAt.toISOString(),
          })),
          vendor_subtotals: Array.from(byVendor.entries()).map(([vendorId, total]) => ({ vendor_id: vendorId, subtotal: total })),
          total: cart.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
          total_items: cart.items.reduce((sum, item) => sum + item.quantity, 0),
        },
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/cart/items
 * Body: { productId, quantity? }
 *
 * Adds a product to the cart (or increments quantity if already there).
 * Snapshots the product name + price at add-time so the cart shows a
 * stable price even if the vendor raises it later — the customer sees
 * what they agreed to, not the live price.
 */
router.post('/items', async (req: AuthRequest, res: Response) => {
  try {
    const { productId, quantity } = req.body;
    if (!productId) {
      return res.status(400).json({ success: false, error: 'productId is required' });
    }
    const qty = Math.max(1, Number(quantity) || 1);

    const product = await Product.findById(productId).populate({
      path: 'vendorId',
      select: 'businessName slug userId',
    });
    if (!product || product.status !== ProductStatus.ACTIVE) {
      return res.status(404).json({ success: false, error: 'Product not available' });
    }
    if (product.stock < qty) {
      return res.status(409).json({ success: false, error: `Only ${product.stock} in stock` });
    }

    let cart = await Cart.findOne({ userId: req.userId });
    if (!cart) {
      cart = await Cart.create({ userId: req.userId, items: [] });
    }

    const vendorProfile = product.vendorId as any;
    const vendorId = vendorProfile?._id || product.vendorId;

    const existingIdx = cart.items.findIndex(
      (i) => i.productId.toString() === productId && i.vendorId.toString() === vendorId?.toString()
    );

    if (existingIdx >= 0) {
      cart.items[existingIdx].quantity += qty;
      // Re-snapshot price in case it changed since the last add.
      cart.items[existingIdx].unitPrice = product.price;
      cart.items[existingIdx].productName = product.name;
      cart.items[existingIdx].productImage = product.images?.[0] || null;
      cart.items[existingIdx].vendorName = vendorProfile?.businessName || '';
    } else {
      cart.items.push({
        productId: product._id,
        vendorId,
        vendorName: vendorProfile?.businessName || '',
        productName: product.name,
        productImage: product.images?.[0] || null,
        unitPrice: product.price,
        quantity: qty,
        addedAt: new Date(),
      });
    }

    await cart.save();

    return res.json({
      success: true,
      message: 'Added to cart',
      data: { total_items: cart.items.reduce((s, i) => s + i.quantity, 0) },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PATCH /api/cart/items/:productId
 * Body: { quantity }
 *
 * Updates the quantity of an item in the cart. If quantity is 0 or
 * negative, the item is removed (same as DELETE — kept as a PATCH for
 * frontend convenience: the +/- stepper can use one endpoint).
 */
router.patch('/items/:productId', async (req: AuthRequest, res: Response) => {
  try {
    const { quantity } = req.body;
    if (typeof quantity !== 'number' || quantity < 0) {
      return res.status(400).json({ success: false, error: 'quantity must be a non-negative number' });
    }

    const cart = await Cart.findOne({ userId: req.userId });
    if (!cart) {
      return res.status(404).json({ success: false, error: 'Cart not found' });
    }

    const idx = cart.items.findIndex((i) => i.productId.toString() === req.params.productId);
    if (idx < 0) {
      return res.status(404).json({ success: false, error: 'Item not in cart' });
    }

    if (quantity === 0) {
      cart.items.splice(idx, 1);
    } else {
      // Re-validate against current stock — vendor might have sold out
      // since the customer added it.
      const product = await Product.findById(req.params.productId).select('stock price');
      if (!product) {
        cart.items.splice(idx, 1);
      } else {
        if (quantity > product.stock) {
          return res.status(409).json({ success: false, error: `Only ${product.stock} in stock` });
        }
        cart.items[idx].quantity = quantity;
        cart.items[idx].unitPrice = product.price;
      }
    }

    await cart.save();
    return res.json({ success: true, message: 'Cart updated' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/cart/items/:productId
router.delete('/items/:productId', async (req: AuthRequest, res: Response) => {
  try {
    const cart = await Cart.findOne({ userId: req.userId });
    if (!cart) return res.json({ success: true, message: 'Cart already empty' });

    cart.items = cart.items.filter((i) => i.productId.toString() !== req.params.productId);
    await cart.save();

    return res.json({ success: true, message: 'Item removed from cart' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/cart
router.delete('/', async (req: AuthRequest, res: Response) => {
  try {
    await Cart.findOneAndUpdate({ userId: req.userId }, { items: [] });
    return res.json({ success: true, message: 'Cart cleared' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/cart/checkout
 * Body: { deliveryAddress: { fullName, phone, address, city?, state?, notes? } }
 *
 * Multi-vendor checkout: splits the cart into one Order per vendor.
 * Each order gets its own orderNumber, its own delivery fee (from the
 * vendor's profile), and its own logistics handoff. The cart is
 * cleared after the split succeeds.
 *
 * Payment is marked PENDING — a real implementation would call into
 * PaymentService here (Paystack/Opay/Flutterwave). For preview we
 * simulate a successful hold by marking the order PAID.
 */
router.post('/checkout', async (req: AuthRequest, res: Response) => {
  try {
    const { deliveryAddress } = req.body;
    if (!deliveryAddress?.fullName || !deliveryAddress?.phone || !deliveryAddress?.address) {
      return res.status(400).json({
        success: false,
        error: 'deliveryAddress with fullName, phone, and address is required',
      });
    }

    const cart = await Cart.findOne({ userId: req.userId });
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, error: 'Cart is empty' });
    }

    // Group items by vendor — the actual "split" step.
    const byVendor = new Map<string, typeof cart.items>();
    for (const item of cart.items) {
      const key = item.vendorId.toString();
      if (!byVendor.has(key)) byVendor.set(key, []);
      byVendor.get(key)!.push(item);
    }

    // Look up each vendor's delivery fee once.
    const vendorIds = Array.from(byVendor.keys());
    const vendors = await VendorProfile.find({ _id: { $in: vendorIds } }).select('businessName slug deliveryFee deliveryEnabled');

    const createdOrders = [];

    // Create one Order per vendor in parallel.
    const orderCreations = Array.from(byVendor.entries()).map(async ([vendorId, items]) => {
      const vendor = vendors.find((v) => v._id.toString() === vendorId);
      if (!vendor) {
        throw new Error(`Vendor ${vendorId} not found`);
      }
      if (!vendor.deliveryEnabled) {
        throw new Error(`${vendor.businessName} does not offer delivery`);
      }

      const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
      const deliveryFee = vendor.deliveryFee || 0;
      const serviceFee = Math.round(subtotal * 0.05); // 5% platform fee
      const total = subtotal + deliveryFee + serviceFee;

      const orderNumber = `RUSH-${Date.now()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

      const order = await Order.create({
        orderNumber,
        customerId: req.userId,
        vendorId,
        items: items.map((i) => ({
          productId: i.productId,
          productName: i.productName,
          productImage: i.productImage,
          unitPrice: i.unitPrice,
          quantity: i.quantity,
          lineTotal: i.unitPrice * i.quantity,
        })),
        subtotal,
        deliveryFee,
        serviceFee,
        total,
        paymentStatus: OrderPaymentStatus.PAID, // simulated
        orderStatus: OrderStatus.PENDING,
        deliveryAddress,
        trackingCode: `RUSH-ORD-${Math.floor(100000 + Math.random() * 900000)}`,
        paymentReference: `SIM-${orderNumber}`,
        paymentGateway: 'rush_wallet',
      });

      // Decrement stock atomically — if any product is OOS the whole
      // checkout for that vendor fails. In production this should be
      // a transaction; here we do best-effort.
      for (const item of items) {
        const updated = await Product.updateOne(
          { _id: item.productId, stock: { $gte: item.quantity } },
          { $inc: { stock: -item.quantity, totalSold: item.quantity } }
        );
        if (updated.modifiedCount === 0) {
          throw new Error(`${item.productName} is out of stock`);
        }
      }

      // Bump the vendor's denormalized counters.
      await VendorProfile.updateOne({ _id: vendorId }, { $inc: { totalOrders: 1, totalRevenue: subtotal } });

      return order;
    });

    try {
      const results = await Promise.all(orderCreations);
      createdOrders.push(...results);
    } catch (err: any) {
      // If any vendor's checkout failed midway, the orders that
      // already succeeded are still real (payment was charged). The
      // failure is returned to the customer with the error message —
      // a real impl would roll back or partial-refund here.
      return res.status(409).json({
        success: false,
        error: err.message || 'Checkout failed midway — some orders may have been placed',
      });
    }

    // Clear the cart only after all orders succeed.
    cart.items = [];
    await cart.save();

    return res.status(201).json({
      success: true,
      message: `Checkout complete — ${createdOrders.length} order${createdOrders.length === 1 ? '' : 's'} placed`,
      data: {
        orders: createdOrders.map((o) => ({
          id: o._id.toString(),
          order_number: o.orderNumber,
          vendor_id: o.vendorId.toString(),
          total: o.total,
          tracking_code: o.trackingCode,
          order_status: o.orderStatus,
        })),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
