import mongoose, { Schema, Document } from 'mongoose';

/**
 * Rush multi-capability account model.
 *
 * Architecture (see merchant + rider design docs):
 *
 *   USER ACCOUNT (one identity)
 *        │
 *        ├── capabilities: Capability[]   ← marketplace identity
 *        │     (CUSTOMER, VENDOR, SERVICE_PROVIDER, RIDER)
 *        │
 *        ├── systemRoles: SystemRole[]     ← operational/admin identity
 *        │     (ADMIN, DISPATCHER, SUPPORT)
 *        │
 *        ├── capabilityStatus: { [cap]: CapabilityStatus }
 *        │     Per-capability verification state. A capability is only
 *        │     USABLE when (a) it appears in `capabilities[]` AND
 *        │     (b) its entry here is `ACTIVE`.
 *        │
 *        └── activeWorkspace: Capability   ← UI hint only, NOT a permission gate
 *
 * Hard cutover from the old `role`/`roles[]` shape: the single active
 * `role` field is GONE. Authorization checks use `capabilities[]` +
 * `capabilityStatus{}`, never `activeWorkspace`.
 */

export enum Capability {
  CUSTOMER = 'CUSTOMER',
  VENDOR = 'VENDOR',
  SERVICE_PROVIDER = 'SERVICE_PROVIDER',
  RIDER = 'RIDER',
}

export enum SystemRole {
  ADMIN = 'ADMIN',
  DISPATCHER = 'DISPATCHER',
  SUPPORT = 'SUPPORT',
}

export enum CapabilityStatus {
  DRAFT = 'DRAFT',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  REJECTED = 'REJECTED',
}

/**
 * Capabilities a normal account can self-activate via onboarding flows.
 * ADMIN/DISPATCHER/SUPPORT are excluded — those are assigned internally.
 */
export const SELF_SERVICE_CAPABILITIES: Capability[] = [
  Capability.CUSTOMER,
  Capability.VENDOR,
  Capability.SERVICE_PROVIDER,
  Capability.RIDER,
];

export interface IUser extends Document {
  email: string;
  phone: string;
  passwordHash: string;
  fullName: string;

  /** Marketplace capabilities this identity has activated. CUSTOMER is
   *  implicit — added at signup for every user. */
  capabilities: Capability[];

  /** Operational/admin roles, kept separate from marketplace identity
   *  per the architecture decision in §24 of the merchant doc. */
  systemRoles: SystemRole[];

  /** Per-capability verification state (excludes CUSTOMER, which is
   *  gated by `isVerified`). Authorization middleware checks BOTH
   *  `capabilities.includes(X)` AND `capabilityStatus[X] === ACTIVE`. */
  capabilityStatus: Partial<Record<Exclude<Capability, Capability.CUSTOMER>, CapabilityStatus>>;

  /** UI hint: which workspace the user is currently viewing. Persisted
   *  so reloads land back in the same workspace. NEVER used for authz. */
  activeWorkspace: Capability;

  isVerified: boolean;
  walletBalance: number;
  escrowHeld: number;
  campusHub?: string | null;
  firebaseUid?: string | null;
  verificationCode?: string | null;
  verificationSentAt?: Date | null;
  nin?: string | null;
  bvn?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string;
  profilePicture?: string | null;
  isActive: boolean;
  resetToken?: string | null;
  resetTokenExpires?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date | null;
  deletedAt?: Date | null;
  deletedBy?: string | null;
  deletionReason?: string | null;
}

const CapabilityStatusMapSchema = new Schema(
  {
    VENDOR: { type: String, enum: Object.values(CapabilityStatus), default: null },
    SERVICE_PROVIDER: { type: String, enum: Object.values(CapabilityStatus), default: null },
    RIDER: { type: String, enum: Object.values(CapabilityStatus), default: null },
  },
  { _id: false, strict: false }
);

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
    fullName: { type: String, required: true, trim: true },

    capabilities: {
      type: [{ type: String, enum: Object.values(Capability) }],
      default: [Capability.CUSTOMER],
    },
    systemRoles: {
      type: [{ type: String, enum: Object.values(SystemRole) }],
      default: [],
    },
    capabilityStatus: {
      type: CapabilityStatusMapSchema,
      default: {},
    },
    activeWorkspace: {
      type: String,
      enum: Object.values(Capability),
      default: Capability.CUSTOMER,
    },

    isVerified: { type: Boolean, default: false },
    walletBalance: { type: Number, default: 0, min: 0 },
    escrowHeld: { type: Number, default: 0, min: 0 },
    campusHub: { type: String, default: null },
    firebaseUid: { type: String, default: null },
    verificationCode: { type: String, default: null },
    verificationSentAt: { type: Date, default: null },
    nin: { type: String, default: null },
    bvn: { type: String, default: null },
    address: { type: String, default: null },
    city: { type: String, default: 'Lagos' },
    state: { type: String, default: 'Lagos' },
    country: { type: String, default: 'Nigeria' },
    profilePicture: { type: String, default: null },
    isActive: { type: Boolean, default: true },
    resetToken: { type: String, default: null },
    resetTokenExpires: { type: Date, default: null },
    lastLogin: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: String, default: null },
    deletionReason: { type: String, default: null },
  },
  {
    timestamps: true,
  }
);

UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ phone: 1 }, { unique: true });
UserSchema.index({ firebaseUid: 1 }, { unique: true, sparse: true });

/**
 * Convenience helper: is the given capability both ENABLED and ACTIVE?
 * Use this in route handlers/middleware instead of reaching into both
 * fields directly — keeps the authz rule in one place.
 */
UserSchema.methods.hasCapability = function (cap: Capability): boolean {
  if (!this.capabilities.includes(cap)) return false;
  if (cap === Capability.CUSTOMER) return true; // CUSTOMER has no per-cap status
  return this.capabilityStatus?.[cap] === CapabilityStatus.ACTIVE;
};

export interface IUser extends Document {
  hasCapability(cap: Capability): boolean;
}

export const User = mongoose.model<IUser>('User', UserSchema);
