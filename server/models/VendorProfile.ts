import mongoose, { Schema, Document } from 'mongoose';

/**
 * Vendor profile — the merchant/business presence for a user with the
 * VENDOR capability. Completely separate from Provider (services) so
 * the same user can both sell goods AND offer services from one account.
 *
 * Verification state lives on `user.capabilityStatus.VENDOR`, NOT here
 * — see the architecture doc §14. This profile only holds business data.
 */

export enum StoreVisibility {
  PUBLIC = 'PUBLIC',
  LINK_ONLY = 'LINK_ONLY',
  PRIVATE = 'PRIVATE',
}

export interface IVendorProfile extends Document {
  userId: mongoose.Types.ObjectId;
  businessName: string;
  slug: string;
  description?: string;
  logo?: string | null;
  coverImage?: string | null;
  category?: string | null;

  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  instagram?: string | null;
  tiktok?: string | null;
  facebook?: string | null;

  location?: {
    country?: string;
    state?: string;
    city?: string;
    address?: string;
  } | null;

  storeTheme: string;
  storeCoverColor: string;
  storeVisibility: StoreVisibility;

  deliveryEnabled: boolean;
  deliveryFee?: number;
  deliveryRadiusKm?: number;
  estimatedDeliveryHours?: number;

  storeViews: number;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  rating: number;

  socialLinks: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

const VendorProfileSchema = new Schema<IVendorProfile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    businessName: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, default: '' },
    logo: { type: String, default: null },
    coverImage: { type: String, default: null },
    category: { type: String, default: null },

    phone: { type: String, default: null },
    whatsapp: { type: String, default: null },
    email: { type: String, default: null },
    instagram: { type: String, default: null },
    tiktok: { type: String, default: null },
    facebook: { type: String, default: null },

    location: {
      country: { type: String, default: 'Nigeria' },
      state: { type: String, default: null },
      city: { type: String, default: null },
      address: { type: String, default: null },
    },

    storeTheme: { type: String, default: 'orange' },
    storeCoverColor: { type: String, default: '#f97316' },
    storeVisibility: {
      type: String,
      enum: Object.values(StoreVisibility),
      default: StoreVisibility.PRIVATE,
    },

    deliveryEnabled: { type: Boolean, default: true },
    deliveryFee: { type: Number, default: 0 },
    deliveryRadiusKm: { type: Number, default: 10 },
    estimatedDeliveryHours: { type: Number, default: 24 },

    storeViews: { type: Number, default: 0 },
    totalProducts: { type: Number, default: 0 },
    totalOrders: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    rating: { type: Number, default: 0 },

    socialLinks: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

VendorProfileSchema.index({ slug: 1 }, { unique: true });
VendorProfileSchema.index({ storeVisibility: 1, category: 1 });

export const VendorProfile = mongoose.model<IVendorProfile>('VendorProfile', VendorProfileSchema);
