import mongoose, { Schema, Document } from 'mongoose';

/**
 * Product — a physical/digital good listed by a VENDOR for sale on
 * their mini-site (rush.com/store/:slug) and in the marketplace.
 *
 * Vendor is identified two ways:
 *   - vendorId: the VendorProfile._id (for joins to store branding)
 *   - userId:   the User._id who owns the vendor profile (for authz)
 * Both indexed so listing-by-store and listing-by-owner are both fast.
 */

export enum ProductStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
  ARCHIVED = 'ARCHIVED',
}

export interface IProduct extends Document {
  vendorId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;

  name: string;
  slug: string;
  description?: string;

  images: string[];
  category?: string | null;
  tags: string[];

  price: number;
  compareAtPrice?: number | null;
  sku?: string | null;
  stock: number;

  status: ProductStatus;

  variants: any[];
  attributes: Record<string, any>;

  views: number;
  totalSold: number;
  rating: number;

  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    vendorId: { type: Schema.Types.ObjectId, ref: 'VendorProfile', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true },
    description: { type: String, default: '' },

    images: { type: [String], default: [] },
    category: { type: String, default: null, index: true },
    tags: { type: [String], default: [] },

    price: { type: Number, required: true, min: 0 },
    compareAtPrice: { type: Number, default: null, min: 0 },
    sku: { type: String, default: null },
    stock: { type: Number, default: 0, min: 0 },

    status: {
      type: String,
      enum: Object.values(ProductStatus),
      default: ProductStatus.DRAFT,
    },

    // Future-proofing — variants (size/color/storage) get added in a
    // later phase, but the array is here so we don't have to migrate
    // the schema later.
    variants: { type: [Schema.Types.Mixed], default: [] },
    attributes: { type: Schema.Types.Mixed, default: {} },

    views: { type: Number, default: 0 },
    totalSold: { type: Number, default: 0 },
    rating: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Compound uniqueness: a vendor can't have two products with the same slug.
ProductSchema.index({ vendorId: 1, slug: 1 }, { unique: true });
ProductSchema.index({ status: 1, category: 1 });

export const Product = mongoose.model<IProduct>('Product', ProductSchema);
