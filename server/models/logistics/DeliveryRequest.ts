import mongoose, { Schema, Document } from 'mongoose';

/**
 * DeliveryRequest — the link between a vendor's product order and the
 * logistics network (riders/drivers).
 *
 * Flow (per the user's architecture doc §16):
 *
 *   Order:  READY_FOR_DELIVERY
 *        ↓  vendor confirms "ready to ship"
 *   DeliveryRequest created (status: REQUESTED, sourceOrderId set)
 *        ↓  a rider accepts
 *   DeliveryRequest → Ride linked via `rideId`
 *        ↓  standard Ride dispatch flow (Dispatch events)
 *   Order:  DELIVERED (when Ride reaches COMPLETED)
 *
 * The existing Ride model (logistics/Ride.ts) handles the live tracking
 * side — this model is the bridge so vendor orders don't directly
 * couple to the Ride schema (a Ride could exist for non-order reasons,
 * like a passenger ride).
 */

export enum DeliveryType {
  GOODS = 'GOODS',
  PASSENGER = 'PASSENGER',
}

export enum DeliveryRequestStatus {
  REQUESTED = 'REQUESTED',
  ASSIGNED = 'ASSIGNED',
  PICKED_UP = 'PICKED_UP',
  IN_TRANSIT = 'IN_TRANSIT',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface IDeliveryRequest extends Document {
  orderId?: mongoose.Types.ObjectId | null;
  rideId?: mongoose.Types.ObjectId | null;

  type: DeliveryType;

  customerId: mongoose.Types.ObjectId;
  vendorId?: mongoose.Types.ObjectId | null;
  riderId?: mongoose.Types.ObjectId | null;

  pickup: {
    name: string;
    address: string;
    lat?: number | null;
    lng?: number | null;
  };
  dropoff: {
    name: string;
    address: string;
    lat?: number | null;
    lng?: number | null;
  };

  itemType?: string | null;
  notes?: string | null;
  fare?: number;

  status: DeliveryRequestStatus;
  trackingCode?: string;

  createdAt: Date;
  updatedAt: Date;
}

const DeliveryRequestSchema = new Schema<IDeliveryRequest>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', default: null, index: true },
    rideId: { type: Schema.Types.ObjectId, ref: 'Ride', default: null },

    type: {
      type: String,
      enum: Object.values(DeliveryType),
      default: DeliveryType.GOODS,
    },

    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    vendorId: { type: Schema.Types.ObjectId, ref: 'VendorProfile', default: null },
    riderId: { type: Schema.Types.ObjectId, ref: 'User', default: null },

    pickup: {
      name: { type: String, required: true },
      address: { type: String, required: true },
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    dropoff: {
      name: { type: String, required: true },
      address: { type: String, required: true },
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },

    itemType: { type: String, default: null },
    notes: { type: String, default: null },
    fare: { type: Number, default: 0 },

    status: {
      type: String,
      enum: Object.values(DeliveryRequestStatus),
      default: DeliveryRequestStatus.REQUESTED,
    },
    trackingCode: { type: String, default: null },
  },
  { timestamps: true }
);

DeliveryRequestSchema.index({ status: 1, type: 1 });
DeliveryRequestSchema.index({ riderId: 1, status: 1 });

export const DeliveryRequest = mongoose.model<IDeliveryRequest>(
  'DeliveryRequest',
  DeliveryRequestSchema
);
