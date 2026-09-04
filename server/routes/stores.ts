import express, { Response } from 'express';
import { VendorProfile, StoreVisibility } from '../models/VendorProfile.js';
import { Product, ProductStatus } from '../models/Product.js';
import { Rating } from '../models/Rating.js';

const router = express.Router();

/**
 * Public storefront routes — NO AUTH REQUIRED for GET endpoints.
 * Powers the embedded /store/:slug route in the frontend (vendor
 * dashboard page doubles as public storefront, see frontend App.tsx).
 *
 * Visibility rules:
 *   - PUBLIC     → listed in /api/stores and accessible at /:slug
 *   - LINK_ONLY  → accessible at /:slug if you know it, NOT listed
 *   - PRIVATE    → not accessible publicly (vendor is mid-onboarding)
 *
 * Only ACTIVE products are returned by the public endpoints.
 */

// GET /api/stores
// Lists all PUBLIC stores. Used by the marketplace browse page.
router.get('/', async (req, res) => {
  try {
    const { category, search } = req.query;
    const filter: any = { storeVisibility: StoreVisibility.PUBLIC };

    if (category) filter.category = category;
    if (search) {
      filter.$or = [
        { businessName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const stores = await VendorProfile.find(filter)
      .populate('userId', 'fullName profilePicture')
      .sort({ storeViews: -1, createdAt: -1 })
      .limit(50);

    return res.json({
      success: true,
      data: {
        stores: stores.map((s) => ({
          id: s._id.toString(),
          business_name: s.businessName,
          slug: s.slug,
          description: s.description,
          logo: s.logo,
          cover_image: s.coverImage,
          category: s.category,
          store_theme: s.storeTheme,
          store_cover_color: s.storeCoverColor,
          total_products: s.totalProducts,
          rating: s.rating,
          store_views: s.storeViews,
          location: s.location,
        })),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/stores/check-slug?slug=campus-gadgets
// Pre-flight check the frontend calls as the user types their slug
// in the onboarding form. Returns { available: boolean }.
router.get('/check-slug', async (req, res) => {
  try {
    const slug = String(req.query.slug || '').toLowerCase();
    if (!slug) return res.json({ success: true, data: { available: false, reason: 'Slug is required' } });

    // Use the same validator the onboarding route uses — keeps the
    // "reserved words" list in one place (server/lib/slugValidator.ts).
    const { validateSlugFormat } = await import('../lib/slugValidator.js');
    const formatCheck = validateSlugFormat(slug);
    if (!formatCheck.valid) {
      return res.json({ success: true, data: { available: false, reason: formatCheck.reason } });
    }

    const taken = await VendorProfile.findOne({ slug });
    if (taken) {
      return res.json({ success: true, data: { available: false, reason: 'Slug already taken' } });
    }

    return res.json({ success: true, data: { available: true } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/stores/:slug
 * Returns the full storefront: vendor profile + first page of ACTIVE
 * products. Bumps storeViews asynchronously (fire-and-forget) so the
 * view counter stays roughly accurate without slowing down the page.
 *
 * PRIVATE stores return 404 — a vendor who hasn't published yet
 * shouldn't be discoverable even if someone guesses their slug.
 */
router.get('/:slug', async (req, res) => {
  try {
    const store = await VendorProfile.findOne({ slug: req.params.slug.toLowerCase() }).populate('userId', 'fullName profilePicture');
    if (!store) {
      return res.status(404).json({ success: false, error: 'Store not found' });
    }
    if (store.storeVisibility === StoreVisibility.PRIVATE) {
      // Same response as "not found" — don't leak the existence of
      // unpublished stores to scanners.
      return res.status(404).json({ success: false, error: 'Store not found' });
    }

    // Fire-and-forget view increment.
    VendorProfile.updateOne({ _id: store._id }, { $inc: { storeViews: 1 } }).catch(() => {});

    const products = await Product.find({
      vendorId: store._id,
      status: ProductStatus.ACTIVE,
    }).sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: {
        store: {
          id: store._id.toString(),
          business_name: store.businessName,
          slug: store.slug,
          description: store.description,
          logo: store.logo,
          cover_image: store.coverImage,
          category: store.category,
          phone: store.phone,
          whatsapp: store.whatsapp,
          email: store.email,
          instagram: store.instagram,
          tiktok: store.tiktok,
          facebook: store.facebook,
          location: store.location,
          store_theme: store.storeTheme,
          store_cover_color: store.storeCoverColor,
          delivery_enabled: store.deliveryEnabled,
          delivery_fee: store.deliveryFee,
          estimated_delivery_hours: store.estimatedDeliveryHours,
          rating: store.rating,
          total_products: store.totalProducts,
          store_views: store.storeViews,
        },
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
          rating: p.rating,
          total_sold: p.totalSold,
        })),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/stores/:slug/products
// Paginated product list for a store — used by the storefront's
// "Load more" button when a vendor has many products.
router.get('/:slug/products', async (req, res) => {
  try {
    const store = await VendorProfile.findOne({ slug: req.params.slug.toLowerCase() });
    if (!store) {
      return res.status(404).json({ success: false, error: 'Store not found' });
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const perPage = Math.min(50, Math.max(1, Number(req.query.per_page) || 20));

    const products = await Product.find({
      vendorId: store._id,
      status: ProductStatus.ACTIVE,
    })
      .sort({ createdAt: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage);

    return res.json({
      success: true,
      data: {
        products: products.map((p) => ({
          id: p._id.toString(),
          name: p.name,
          slug: p.slug,
          description: p.description,
          images: p.images,
          price: p.price,
          compare_at_price: p.compareAtPrice,
          stock: p.stock,
        })),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/products/:id
// Single product detail page. Works whether you arrive from a store
// or a marketplace search — the storefront layout is the same.
router.get('/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate({
      path: 'vendorId',
      select: 'businessName slug logo storeTheme storeCoverColor phone whatsapp',
    });
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    if (product.status !== ProductStatus.ACTIVE) {
      // DRAFT / ARCHIVED / OUT_OF_STOCK products are only visible to
      // the vendor themselves via /api/vendor/products. Public 404.
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    // Fire-and-forget product view increment.
    Product.updateOne({ _id: product._id }, { $inc: { views: 1 } }).catch(() => {});

    return res.json({
      success: true,
      data: {
        product: {
          id: product._id.toString(),
          name: product.name,
          slug: product.slug,
          description: product.description,
          images: product.images,
          category: product.category,
          tags: product.tags,
          price: product.price,
          compare_at_price: product.compareAtPrice,
          stock: product.stock,
          attributes: product.attributes,
          variants: product.variants,
          rating: product.rating,
          total_sold: product.totalSold,
        },
        store: product.vendorId
          ? {
              id: (product.vendorId as any)._id.toString(),
              business_name: (product.vendorId as any).businessName,
              slug: (product.vendorId as any).slug,
              logo: (product.vendorId as any).logo,
              store_theme: (product.vendorId as any).storeTheme,
              store_cover_color: (product.vendorId as any).storeCoverColor,
              phone: (product.vendorId as any).phone,
              whatsapp: (product.vendorId as any).whatsapp,
            }
          : null,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/stores/:slug/reviews
// Public reviews for a store. Stub for now — the existing Rating model
// is keyed by job_id (service jobs), so we don't have product reviews
// wired up yet. Returns an empty list rather than 404 so the UI can
// always render the reviews section.
router.get('/:slug/reviews', async (req, res) => {
  try {
    // TODO: add a ProductReview model + wire up post-purchase reviews.
    return res.json({ success: true, data: { reviews: [], average_rating: 0, total_reviews: 0 } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
