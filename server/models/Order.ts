import mongoose, { Schema, Document } from 'mongoose';

/**
 * Order — a purchase of products from ONE vendor by ONE customer.
 *
 * Multi-vendor checkout splits a cart into multiple Orders (one per
 * vendor). Each order then independently goes through:
 *   PENDING → CONFIRMED → PROCESSING → READY_FOR_DELIVERY →
 *   OUT_FOR_DELIVERY → DELIVERED (or CANCELLED at any step)
 *
 * The handoff to logistics happens when status reaches
 * READY_FOR_DELIVERY — at that point a DeliveryRequest is created and
 * `deliveryRequestId` is set. From there the existing Dispatch/Driver
 * logistics flow takes over (see routes/logistics/deliveries.ts).
 */

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PROCESSING = 'PROCESSING',
  READY_FOR_DELIVERY = 'READY_FOR_DELIVERY',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  HELD = 'HELD',
}

export interface IOrderItem {
  productId: mongoose.Types.ObjectId;
  productName: string;
  productImage?: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface IOrder extends Document {
  orderNumber: string;

  customerId: mongoose.Types.ObjectId;
  vendorId: mongoose.Types.ObjectId;

  items: IOrderItem[];

  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  total: number;

  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;

  deliveryAddress: {
    fullName: string;
    phone: string;
    address: string;
    city?: string;
    state?: string;
    notes?: string;
  };

  /** Linked Ride/DeliveryRequest once the order enters logistics. */
  deliveryRequestId?: mongoose.Types.ObjectId | null;
  trackingCode?: string;

  paymentReference?: string | null;
  paymentGateway?: string | null;

  notes?: string | null;
  cancelledAt?: Date | null;
  cancellationReason?: string | null;

  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true },
    productImage: { type: String, default: null },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: true }
);

const OrderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, required: true, unique: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    vendorId: { type: Schema.Types.ObjectId, ref: 'VendorProfile', required: true, index: true },

    items: { type: [OrderItemSchema], required: true },

    subtotal: { type: Number, required: true, min: 0 },
    deliveryFee: { type: Number, default: 0, min: 0 },
    serviceFee: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },

    paymentStatus: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.PENDING,
    },
    orderStatus: {
      type: String,
      enum: Object.values(OrderStatus),
      default: OrderStatus.PENDING,
    },

    deliveryAddress: {
      fullName: { type: String, required: true },
      phone: { type: String, required: true },
      address: { type: String, required: true },
      city: { type: String, default: null },
      state: { type: String, default: null },
      notes: { type: String, default: null },
    },

    deliveryRequestId: { type: Schema.Types.ObjectId, ref: 'Ride', default: null },
    trackingCode: { type: String, default: null },

    paymentReference: { type: String, default: null },
    paymentGateway: { type: String, default: null },

    notes: { type: String, default: null },
    cancelledAt: { type: Date, default: null },
    cancellationReason: { type: String, default: null },
  },
  { timestamps: true }
);

OrderSchema.index({ customerId: 1, createdAt: -1 });
OrderSchema.index({ vendorId: 1, createdAt: -1 });
OrderSchema.index({ orderStatus: 1 });

export const Order = mongoose.model<IOrder>('Order', OrderSchema);
