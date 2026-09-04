import mongoose, { Schema, Document } from 'mongoose';

export enum RideStatus {
  REQUESTED = 'requested',
  ASSIGNED = 'assigned',
  PICKED_UP = 'picked_up',
  IN_TRANSIT = 'in_transit',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

/**
 * A "ride" here covers both person transport (bike/keke) and
 * parts/supply delivery (e.g. an artisan needing tools picked up
 * from Alaba Market — see sourceJobId below). Same model handles
 * both use cases rather than forking into two collections.
 */
export interface IRide extends Document {
  customerId: mongoose.Types.ObjectId;
  driverId?: mongoose.Types.ObjectId | null;
  // Links back to a Merchant Job when this ride exists to fetch
  // supplies for an in-progress job — this is what replaces the
  // "server-to-server API" pattern now that both domains share one DB.
  sourceJobId?: mongoose.Types.ObjectId | null;
  pickup: {
    name: string;
    address: string;
    lat?: number;
    lng?: number;
  };
  dropoff: {
    name: string;
    address: string;
    lat?: number;
    lng?: number;
  };
  itemType?: string | null;
  notes?: string | null;
  status: RideStatus;
  fare?: number;
  trackingCode?: string;
  pickedUpAt?: Date | null;
  completedAt?: Date | null;
  cancelledAt?: Date | null;
  cancellationReason?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const LocationSubSchema = {
  name: { type: String, required: true },
  address: { type: String, required: true },
  // Not required yet — no geocoding/map picker in the frontend. Add
  // `required: true` back once RideBoard.tsx collects real coordinates.
  lat: { type: Number, default: null },
  lng: { type: Number, default: null },
};

const RideSchema = new Schema<IRide>(
  {
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    driverId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    sourceJobId: { type: Schema.Types.ObjectId, ref: 'Job', default: null },
    pickup: { type: LocationSubSchema, required: true },
    dropoff: { type: LocationSubSchema, required: true },
    itemType: { type: String, default: null },
    notes: { type: String, default: null },
    status: { type: String, enum: Object.values(RideStatus), default: RideStatus.REQUESTED },
    fare: { type: Number, default: 0 },
    trackingCode: { type: String, default: () => `RUSH-TRK-${Math.floor(100000 + Math.random() * 900000)}` },
    pickedUpAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    cancellationReason: { type: String, default: null },
  },
  {
    timestamps: true,
  }
);

RideSchema.index({ status: 1 });
RideSchema.index({ sourceJobId: 1 });

export const Ride = mongoose.model<IRide>('Ride', RideSchema);