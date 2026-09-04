import mongoose, { Schema, Document } from 'mongoose';

/**
 * Vehicle — a registered vehicle owned by a rider.
 *
 * Extracted from Driver.ts into its own model per the rider doc §5:
 * a rider may register multiple vehicles (e.g. a motorcycle for
 * deliveries + a car for passenger rides) and the RiderProfile
 * (Driver.ts) references the approved ones via `approvedVehicleIds`.
 */

export enum VehicleType {
  MOTORCYCLE = 'MOTORCYCLE',
  TRICYCLE = 'TRICYCLE',
  CAR = 'CAR',
  VAN = 'VAN',
  BICYCLE = 'BICYCLE',
}

export enum VehicleVerificationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export interface IVehicle extends Document {
  ownerId: mongoose.Types.ObjectId;

  type: VehicleType;
  make: string;
  /** Renamed from `model` to avoid shadowing mongoose Document's
   *  `.model<T>()` method, which caused a TS interface-extends conflict. */
  vehicleModel: string;
  year?: number | null;
  plateNumber: string;
  color?: string | null;

  verificationStatus: VehicleVerificationStatus;
  documents: string[];
  rejectionReason?: string | null;

  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const VehicleSchema = new Schema<IVehicle>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: Object.values(VehicleType), required: true },
    make: { type: String, required: true, trim: true },
    vehicleModel: { type: String, required: true, trim: true },
    year: { type: Number, default: null },
    plateNumber: { type: String, required: true, trim: true, uppercase: true },
    color: { type: String, default: null },
    verificationStatus: {
      type: String,
      enum: Object.values(VehicleVerificationStatus),
      default: VehicleVerificationStatus.PENDING,
    },
    documents: { type: [String], default: [] },
    rejectionReason: { type: String, default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// A rider can't register the same plate number twice.
VehicleSchema.index({ ownerId: 1, plateNumber: 1 }, { unique: true });
VehicleSchema.index({ verificationStatus: 1 });

export const Vehicle = mongoose.model<IVehicle>('Vehicle', VehicleSchema);
