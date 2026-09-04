import express, { Response } from 'express';
import { VendorProfile, StoreVisibility } from '../models/VendorProfile.js';
import { Product, ProductStatus } from '../models/Product.js';
import { Order, OrderStatus } from '../models/Order.js';
import { jwtRequired, AuthRequest, vendorRequired } from '../middleware/auth.js';
import { validateSlugFormat } from '../lib/slugValidator.js';

const router = express.Router();

// Every vendor route requires the VENDOR capability AND ACTIVE status.
// The vendorRequired middleware enforces both — see middleware/auth.ts.
router.use(jwtRequired(false), vendorRequired);

/**
 * GET /api/vendor/profile
 * Returns the authenticated vendor's profile, or 404 if they haven't
 * completed onboarding yet (they should call /api/onboarding/vendor first).
 */
router.get('/profile', async (req: AuthRequest, res: Response) => {
  try {
    const profile = await VendorProfile.findOne({ userId: req.userId });
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Vendor profile not found — complete onboarding first' });
    }

    return res.json({
      success: true,
      data: {
        vendor_profile: {
          id: profile._id.toString(),
          business_name: profile.businessName,
          slug: profile.slug,
          description: profile.description,
          logo: profile.logo,
          cover_image: profile.coverImage,
          category: profile.category,
          phone: profile.phone,
          whatsapp: profile.whatsapp,
          email: profile.email,
          instagram: profile.instagram,
          tiktok: profile.tiktok,
          facebook: profile.facebook,
          location: profile.location,
          store_theme: profile.storeTheme,
          store_cover_color: profile.storeCoverColor,
          store_visibility: profile.storeVisibility,
          delivery_enabled: profile.deliveryEnabled,
          delivery_fee: profile.deliveryFee,
          delivery_radius_km: profile.deliveryRadiusKm,
          store_views: profile.storeViews,
          total_products: profile.totalProducts,
          total_orders: profile.totalOrders,
          total_revenue: profile.totalRevenue,
          rating: profile.rating,
        },
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PATCH /api/vendor/profile
 * Updates editable fields on the vendor profile. Slug changes are
 * allowed but go through the full format + uniqueness check — once a
 * slug is published and shared, changing it breaks every link the
 * vendor has shared on WhatsApp/Instagram, so we don't make it trivial.
 */
router.patch('/profile', async (req: AuthRequest, res: Response) => {
  try {
    const profile = await VendorProfile.findOne({ userId: req.userId });
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Vendor profile not found' });
    }

    const {
      businessName,
      slug,
      description,
      logo,
      coverImage,
      category,
      phone,
      whatsapp,
      email,
      instagram,
      tiktok,
      facebook,
      city,
      state,
      address,
    } = req.body;

    if (businessName !== undefined) profile.businessName = businessName;
    if (description !== undefined) profile.description = description;
    if (logo !== undefined) profile.logo = logo;
    if (coverImage !== undefined) profile.coverImage = coverImage;
    if (category !== undefined) profile.category = category;
    if (phone !== undefined) profile.phone = phone;
    if (whatsapp !== undefined) profile.whatsapp = whatsapp;
    if (email !== undefined) profile.email = email;
    if (instagram !== undefined) profile.instagram = instagram;
    if (tiktok !== undefined) profile.tiktok = tiktok;
    if (facebook !== undefined) profile.facebook = facebook;
    if (city !== undefined || state !== undefined || address !== undefined) {
      profile.location = {
        ...(profile.location?.toObject?.() || profile.location || {}),
        ...(city !== undefined ? { city } : {}),
        ...(state !== undefined ? { state } : {}),
        ...(address !== undefined ? { address } : {}),
      };
    }

    if (slug !== undefined && slug !== profile.slug) {
      const slugCheck = validateSlugFormat(slug);
      if (!slugCheck.valid) {
        return res.status(400).json({ success: false, error: slugCheck.reason });
      }
      const slugTaken = await VendorProfile.findOne({ slug, _id: { $ne: profile._id } });
      if (slugTaken) {
        return res.status(409).json({ success: false, error: `Slug '${slug}' is already taken` });
      }
      profile.slug = slug;
    }

    await profile.save();

    return res.json({
      success: true,
      message: 'Vendor profile updated',
      data: { slug: profile.slug },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PATCH /api/vendor/store
 * Updates store-specific settings: visibility, theme, delivery config.
 * This is separate from /profile because it changes whether the store
 * is publicly discoverable — a UI affordance, not just metadata.
 */
router.patch('/store', async (req: AuthRequest, res: Response) => {
  try {
    const profile = await VendorProfile.findOne({ userId: req.userId });
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Vendor profile not found' });
    }

    const { storeVisibility, storeTheme, storeCoverColor, deliveryEnabled, deliveryFee, deliveryRadiusKm, estimatedDeliveryHours } = req.body;

    if (storeVisibility !== undefined) {
      if (!Object.values(StoreVisibility).includes(storeVisibility)) {
        return res.status(400).json({ success: false, error: 'Invalid storeVisibility' });
      }
      profile.storeVisibility = storeVisibility;
    }
    if (storeTheme !== undefined) profile.storeTheme = storeTheme;
    if (storeCoverColor !== undefined) profile.storeCoverColor = storeCoverColor;
    if (deliveryEnabled !== undefined) profile.deliveryEnabled = deliveryEnabled;
    if (deliveryFee !== undefined) profile.deliveryFee = deliveryFee;
    if (deliveryRadiusKm !== undefined) profile.deliveryRadiusKm = deliveryRadiusKm;
    if (estimatedDeliveryHours !== undefined) profile.estimatedDeliveryHours = estimatedDeliveryHours;

    await profile.save();

    return res.json({
      success: true,
      message: 'Store settings updated',
      data: {
        store_visibility: profile.storeVisibility,
        store_theme: profile.storeTheme,
        delivery_enabled: profile.deliveryEnabled,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// Products
// ============================================================

/**
 * POST /api/vendor/products
 * Body: { name, slug?, description?, price, compareAtPrice?, images?, category?, tags?, stock?, status? }
 *
 * Creates a product under the authenticated vendor's profile. Slug is
 * auto-derived from name if not provided; must be unique per vendor.
 */
router.post('/products', async (req: AuthRequest, res: Response) => {
  try {
    const profile = await VendorProfile.findOne({ userId: req.userId });
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Vendor profile not found' });
    }

    const { name, slug, description, price, compareAtPrice, images, category, tags, stock, status } = req.body;
    if (!name || price === undefined) {
      return res.status(400).json({ success: false, error: 'name and price are required' });
    }

    // Auto-derive slug from name if not provided.
    const finalSlug = (slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')).toLowerCase();

    // Per-vendor uniqueness check.
    const existing = await Product.findOne({ vendorId: profile._id, slug: finalSlug });
    if (existing) {
      return res.status(409).json({ success: false, error: `You already have a product with slug '${finalSlug}'` });
    }

    const product = await Product.create({
      vendorId: profile._id,
      userId: req.userId,
      name,
      slug: finalSlug,
      description: description || '',
      price,
      compareAtPrice: compareAtPrice || null,
      images: images || [],
      category: category || null,
      tags: tags || [],
      stock: stock !== undefined ? stock : 0,
      status: status || ProductStatus.DRAFT,
    });

    // Bump the denormalized count on the profile so the vendor
    // dashboard doesn't need an aggregation to show "12 products".
    profile.totalProducts = (profile.totalProducts || 0) + 1;
    await profile.save();

    return res.status(201).json({
      success: true,
      message: 'Product created',
      data: {
        product: {
          id: product._id.toString(),
          name: product.name,
          slug: product.slug,
          price: product.price,
          status: product.status,
        },
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/vendor/products
 * Lists the vendor's own products. Supports ?status=ACTIVE to filter.
 */
router.get('/products', async (req: AuthRequest, res: Response) => {
  try {
    const profile = await VendorProfile.findOne({ userId: req.userId });
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Vendor profile not found' });
    }

    const filter: any = { vendorId: profile._id };
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const products = await Product.find(filter).sort({ createdAt: -1 });
    return res.json({
      success: true,
      data: {
        products: products.map((p) => ({
          id: p._id.toString(),
          name: p.name,
          slug: p.slug,
          description: p.description,
          images: p.images,
          category: p.category,
          tags: p.tags,
          price: p.price,
          compare_at_price: p.compareAtPrice,
          stock: p.stock,
          status: p.status,
          views: p.views,
          total_sold: p.totalSold,
          rating: p.rating,
          created_at: p.createdAt.toISOString(),
        })),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PATCH /api/vendor/products/:id
 * Updates an existing product. Only the owning vendor can edit.
 */
router.patch('/products/:id', async (req: AuthRequest, res: Response) => {
  try {
    const profile = await VendorProfile.findOne({ userId: req.userId });
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Vendor profile not found' });
    }

    const product = await Product.findOne({ _id: req.params.id, vendorId: profile._id });
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const { name, slug, description, price, compareAtPrice, images, category, tags, stock, status } = req.body;
    if (name !== undefined) product.name = name;
    if (description !== undefined) product.description = description;
    if (price !== undefined) product.price = price;
    if (compareAtPrice !== undefined) product.compareAtPrice = compareAtPrice;
    if (images !== undefined) product.images = images;
    if (category !== undefined) product.category = category;
    if (tags !== undefined) product.tags = tags;
    if (stock !== undefined) product.stock = stock;
    if (status !== undefined) {
      if (!Object.values(ProductStatus).includes(status)) {
        return res.status(400).json({ success: false, error: 'Invalid status' });
      }
      product.status = status;
    }

    // Slug changes go through uniqueness re-check.
    if (slug !== undefined && slug !== product.slug) {
      const taken = await Product.findOne({ vendorId: profile._id, slug, _id: { $ne: product._id } });
      if (taken) {
        return res.status(409).json({ success: false, error: `You already have a product with slug '${slug}'` });
      }
      product.slug = slug;
    }

    // Auto-flip to OUT_OF_STOCK if stock drops to 0 (only if currently ACTIVE).
    if (product.stock === 0 && product.status === ProductStatus.ACTIVE) {
      product.status = ProductStatus.OUT_OF_STOCK;
    }

    await product.save();

    return res.json({
      success: true,
      message: 'Product updated',
      data: { id: product._id.toString(), status: product.status },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/vendor/products/:id
 * Soft-archives a product (sets status to ARCHIVED) rather than
 * physically deleting it — historical orders still reference the
 * product and need its name for display.
 */
router.delete('/products/:id', async (req: AuthRequest, res: Response) => {
  try {
    const profile = await VendorProfile.findOne({ userId: req.userId });
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Vendor profile not found' });
    }

    const product = await Product.findOne({ _id: req.params.id, vendorId: profile._id });
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    product.status = ProductStatus.ARCHIVED;
    await product.save();

    profile.totalProducts = Math.max(0, (profile.totalProducts || 0) - 1);
    await profile.save();

    return res.json({ success: true, message: 'Product archived' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// Orders received by this vendor
// ============================================================

/**
 * GET /api/vendor/orders
 * Lists orders for this vendor. Supports ?status= filter.
 */
router.get('/orders', async (req: AuthRequest, res: Response) => {
  try {
    const profile = await VendorProfile.findOne({ userId: req.userId });
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Vendor profile not found' });
    }

    const filter: any = { vendorId: profile._id };
    if (req.query.status) filter.orderStatus = req.query.status;

    const orders = await Order.find(filter)
      .populate('customerId', 'fullName email phone')
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: {
        orders: orders.map((o) => ({
          id: o._id.toString(),
          order_number: o.orderNumber,
          customer_name: o.customerId?.fullName || 'Customer',
          customer_phone: o.customerId?.phone || null,
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

export default router;
