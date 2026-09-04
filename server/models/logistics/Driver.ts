import mongoose, { Schema, Document } from 'mongoose';

/**
 * RiderProfile — the mobility-side profile for a user with the RIDER
 * capability.
 *
 * Kept as collection 'Driver' for backward compat with existing data
 * (the Driver.ts file name also stays). The capability enum string
 * is RIDER (see models/User.ts).
 *
 * Verification state (DRAFT / PENDING_VERIFICATION / ACTIVE / etc.)
 * lives on `user.capabilityStatus.RIDER`, NOT here — this profile only
 * holds operational data: which approved vehicles the rider can use,
 * what kinds of mobility they're cleared for, and their live status.
 */

export enum VehicleType {
  BIKE = 'bike',
  KEKE = 'keke',
  CAR = 'car',
  VAN = 'van',
}

export enum DriverStatus {
  OFFLINE = 'offline',
  AVAILABLE = 'available',
  ON_TRIP = 'on_trip',
}

export enum MobilityCapability {
  DELIVERY = 'DELIVERY',
  PASSENGER_RIDES = 'PASSENGER_RIDES',
}

export interface IDriver extends Document {
  userId: mongoose.Types.ObjectId;

  /** Vehicle selection is now stored in the Vehicle collection — this
   *  field is kept denormalized for the public driver listing. */
  vehicleType: VehicleType;
  vehiclePlateNumber: string;
  licenseNumber: string;
  licenseDocumentUrl?: string | null;
  licenseVerified: boolean;

  /** What this rider is cleared to do. A rider might be approved for
   *  deliveries but not passenger rides (e.g. they only have a
   *  cargo-capable vehicle, or haven't passed passenger-ride vetting). */
  mobilityCapabilities: MobilityCapability[];

  /** Approved vehicle IDs (Vehicle collection refs). A rider can have
   *  multiple vehicles registered but typically only one or two approved. */
  approvedVehicleIds: mongoose.Types.ObjectId[];

  status: DriverStatus;
  currentLocation?: { lat: number; lng: number } | null;
  rating: number;
  totalTrips: number;
  totalDeliveries: number;
  totalPassengerRides: number;
  totalEarnings: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DriverSchema = new Schema<IDriver>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    vehicleType: { type: String, enum: Object.values(VehicleType), required: true },
    vehiclePlateNumber: { type: String, required: true, trim: true },
    licenseNumber: { type: String, required: true, trim: true },
    licenseDocumentUrl: { type: String, default: null },
    licenseVerified: { type: Boolean, default: false },

    mobilityCapabilities: {
      type: [String],
      enum: Object.values(MobilityCapability),
      default: [MobilityCapability.DELIVERY],
    },
    approvedVehicleIds: {
      type: [Schema.Types.ObjectId],
      ref: 'Vehicle',
      default: [],
    },

    status: { type: String, enum: Object.values(DriverStatus), default: DriverStatus.OFFLINE },
    currentLocation: { type: Schema.Types.Mixed, default: null },
    rating: { type: Number, default: 5.0 },
    totalTrips: { type: Number, default: 0 },
    totalDeliveries: { type: Number, default: 0 },
    totalPassengerRides: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0.0 },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

DriverSchema.index({ status: 1 });

export const Driver = mongoose.model<IDriver>('Driver', DriverSchema);
