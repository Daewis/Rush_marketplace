import mongoose, { Schema, Document } from 'mongoose';

/**
 * In the two-independent-apps design, these were webhook events fired
 * from Logistics to Merchant over HTTP (courier.assigned,
 * courier.picked_up, courier.arrived, courier.completed).
 *
 * In the unified monolith, there's no network hop needed — a Dispatch
 * record is just an event log entry written directly to the same DB.
 * NotificationService (server/services/notificationService.ts) can read
 * off this collection to push the same "Driver has arrived" alerts,
 * no webhook signature verification required.
 */
export enum DispatchEvent {
  DRIVER_ASSIGNED = 'driver_assigned',
  PICKED_UP = 'picked_up',
  ARRIVED = 'arrived',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export interface IDispatch extends Document {
  rideId: mongoose.Types.ObjectId;
  event: DispatchEvent;
  actorId?: mongoose.Types.ObjectId | null; // driver or dispatcher who triggered it
  location?: { lat: number; lng: number } | null;
  meta?: Record<string, any> | null;
  createdAt: Date;
}

const DispatchSchema = new Schema<IDispatch>(
  {
    rideId: { type: Schema.Types.ObjectId, ref: 'Ride', required: true },
    event: { type: String, enum: Object.values(DispatchEvent), required: true },
    actorId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    location: { type: Schema.Types.Mixed, default: null },
    meta: { type: Schema.Types.Mixed, default: null },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

DispatchSchema.index({ rideId: 1, createdAt: 1 });

export const Dispatch = mongoose.model<IDispatch>('Dispatch', DispatchSchema);