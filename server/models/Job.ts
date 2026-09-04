import mongoose, { Schema, Document } from 'mongoose';

export enum JobStatus {
  POSTED = 'posted',
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  DISPUTED = 'disputed',
}

export enum JobCategory {
  PLUMBING = 'plumbing',
  ELECTRICAL = 'electrical',
  CARPENTRY = 'carpentry',
  PAINTING = 'painting',
  TILING = 'tiling',
  MASONRY = 'masonry',
  WELDING = 'welding',
  CLEANING = 'cleaning',
  LAUNDRY = 'laundry',
  SHOPPING = 'shopping',
  ERRANDS = 'errands',
  REPAIR = 'repair',
  MAINTENANCE = 'maintenance',
  INSTALLATION = 'installation',
  OTHER = 'other',
}

export interface IJob extends Document {
  customerId: mongoose.Types.ObjectId;
  providerId?: mongoose.Types.ObjectId | null;
  category: JobCategory;
  subcategory?: string | null;
  title: string;
  description: string;
  location: {
    lat: number;
    lng: number;
  };
  address: string;
  city?: string;
  state?: string;
  status: JobStatus;
  estimatedPrice?: number;
  finalPrice?: number;
  serviceFee?: number;
  startTime?: Date;
  endTime?: Date;
  checkInTime?: Date | null;
  checkOutTime?: Date | null;
  checkInPhoto?: string | null;
  checkOutPhoto?: string | null;
  checkInOtpHash?: string | null;
  checkOutOtpHash?: string | null;
  checkInLocation?: { lat: number; lng: number } | null;
  checkOutLocation?: { lat: number; lng: number } | null;
  trackingCode?: string;
  cancelledAt?: Date | null;
  cancellationReason?: string | null;
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const JobSchema = new Schema<IJob>(
  {
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    providerId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    category: { type: String, enum: Object.values(JobCategory), required: true },
    subcategory: { type: String, default: null },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    location: {
      lat: { type: Number, required: true, default: 6.5244 },
      lng: { type: Number, required: true, default: 3.3792 },
    },
    address: { type: String, required: true },
    city: { type: String, default: 'Lagos' },
    state: { type: String, default: 'Lagos' },
    status: { type: String, enum: Object.values(JobStatus), default: JobStatus.POSTED },
    estimatedPrice: { type: Number, default: 0 },
    finalPrice: { type: Number, default: 0 },
    serviceFee: { type: Number, default: 0 },
    startTime: { type: Date, default: null },
    endTime: { type: Date, default: null },
    checkInTime: { type: Date, default: null },
    checkOutTime: { type: Date, default: null },
    checkInPhoto: { type: String, default: null },
    checkOutPhoto: { type: String, default: null },
    checkInOtpHash: { type: String, default: null },
    checkOutOtpHash: { type: String, default: null },
    checkInLocation: { type: Schema.Types.Mixed, default: null },
    checkOutLocation: { type: Schema.Types.Mixed, default: null },
    trackingCode: { type: String, default: () => `RUSH-${Math.floor(100000 + Math.random() * 900000)}` },
    cancelledAt: { type: Date, default: null },
    cancellationReason: { type: String, default: null },
    completedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

export const Job = mongoose.model<IJob>('Job', JobSchema);
