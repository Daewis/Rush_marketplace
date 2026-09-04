import mongoose, { Schema, Document } from 'mongoose';

export enum ViolationType {
  NO_SHOW = 'no_show',
  POOR_QUALITY = 'poor_quality',
  THEFT = 'theft',
  DAMAGE = 'damage',
  HARASSMENT = 'harassment',
  FRAUD = 'fraud',
  LATE_ARRIVAL = 'late_arrival',
  INCOMPLETE_WORK = 'incomplete_work',
  BAD_COMMUNICATION = 'bad_communication',
  CANCELLATION = 'cancellation',
  OTHER = 'other',
}

export enum ViolationSeverity {
  MINOR = 'minor',
  MAJOR = 'major',
  CRITICAL = 'critical',
}

export enum ViolationStatus {
  PENDING_REVIEW = 'pending_review',
  CONFIRMED = 'confirmed',
  DISMISSED = 'dismissed',
  APPEALED = 'appealed',
  RESOLVED = 'resolved',
}

export enum PenaltyType {
  WARNING = 'warning',
  SUSPENSION = 'suspension',
  BAN = 'ban',
  FINE = 'fine',
}

export interface IViolation extends Document {
  userId: mongoose.Types.ObjectId;
  jobId?: mongoose.Types.ObjectId | null;
  reportedBy?: mongoose.Types.ObjectId | null;
  type: ViolationType;
  severity: ViolationSeverity;
  title: string;
  description: string;
  evidence: any[];
  status: ViolationStatus;
  reviewedBy?: mongoose.Types.ObjectId | null;
  reviewedAt?: Date | null;
  resolution?: string | null;
  penaltyType?: PenaltyType | null;
  penaltyDetails: Record<string, any>;
  pointsDeducted: number;
  appealStatus?: string | null;
  appealReason?: string | null;
  appealAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const ViolationSchema = new Schema<IViolation>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    jobId: { type: Schema.Types.ObjectId, ref: 'Job', default: null },
    reportedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    type: { type: String, enum: Object.values(ViolationType), required: true },
    severity: { type: String, enum: Object.values(ViolationSeverity), default: ViolationSeverity.MINOR },
    title: { type: String, required: true },
    description: { type: String, required: true },
    evidence: { type: [Schema.Types.Mixed], default: [] },
    status: { type: String, enum: Object.values(ViolationStatus), default: ViolationStatus.PENDING_REVIEW },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
    resolution: { type: String, default: null },
    penaltyType: { type: String, enum: Object.values(PenaltyType), default: null },
    penaltyDetails: { type: Schema.Types.Mixed, default: {} },
    pointsDeducted: { type: Number, default: 0 },
    appealStatus: { type: String, default: null },
    appealReason: { type: String, default: null },
    appealAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

export const Violation = mongoose.model<IViolation>('Violation', ViolationSchema);
