import mongoose, { Schema, Document } from 'mongoose';

export enum PaymentStatus {
  PENDING = 'pending',
  HELD = 'held',
  RELEASED = 'released',
  REFUNDED = 'refunded',
  FAILED = 'failed',
  DISPUTED = 'disputed',
}

export enum PaymentProviderEnum {
  OPAY = 'opay',
  PAYSTACK = 'paystack',
  FLUTTERWAVE = 'flutterwave',
}

export interface IPayment extends Document {
  jobId?: mongoose.Types.ObjectId;
  customerId?: mongoose.Types.ObjectId;
  providerId?: mongoose.Types.ObjectId;
  amount: number;
  platformFee: number;
  providerEarnings: number;
  provider: PaymentProviderEnum;
  reference: string;
  transactionId?: string;
  status: PaymentStatus;
  paymentMetadata: Record<string, any>;
  heldAt?: Date | null;
  releasedAt?: Date | null;
  refundedAt?: Date | null;
  failedAt?: Date | null;
  failureReason?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    jobId: { type: Schema.Types.ObjectId, ref: 'Job', required: false, default: null },
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: false, default: null },
    providerId: { type: Schema.Types.ObjectId, ref: 'User', required: false, default: null },
    amount: { type: Number, required: true },
    platformFee: { type: Number, required: true, default: 0 },
    providerEarnings: { type: Number, required: true },
    provider: { type: String, enum: Object.values(PaymentProviderEnum), default: PaymentProviderEnum.PAYSTACK },
    reference: { type: String, required: true, unique: true },
    transactionId: { type: String, default: null },
    status: { type: String, enum: Object.values(PaymentStatus), default: PaymentStatus.PENDING },
    paymentMetadata: { type: Schema.Types.Mixed, default: {} },
    heldAt: { type: Date, default: null },
    releasedAt: { type: Date, default: null },
    refundedAt: { type: Date, default: null },
    failedAt: { type: Date, default: null },
    failureReason: { type: String, default: null },
  },
  {
    timestamps: true,
  }
);

export const Payment = mongoose.model<IPayment>('Payment', PaymentSchema);
