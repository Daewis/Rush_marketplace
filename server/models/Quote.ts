import mongoose, { Schema, Document } from 'mongoose';

export type QuoteStatus = 'pending' | 'accepted' | 'rejected';

export interface IQuote extends Document {
  jobId: mongoose.Types.ObjectId;
  artisanId: mongoose.Types.ObjectId;
  artisanName: string;
  artisanAvatar?: string | null;
  artisanRating?: number;
  artisanSkills?: string[];
  price: number;
  estimatedDuration: string;
  proposal: string;
  status: QuoteStatus;
  createdAt: Date;
  updatedAt: Date;
}

const QuoteSchema = new Schema<IQuote>(
  {
    jobId: {
      type: Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
      index: true,
    },
    artisanId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    artisanName: {
      type: String,
      required: true,
      trim: true,
    },
    artisanAvatar: {
      type: String,
      default: null,
    },
    artisanRating: {
      type: Number,
      default: 5.0,
    },
    artisanSkills: {
      type: [String],
      default: [],
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    estimatedDuration: {
      type: String,
      required: true,
      trim: true,
    },
    proposal: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
);

QuoteSchema.index({ jobId: 1, artisanId: 1 }, { unique: true });

export const Quote = mongoose.model<IQuote>('Quote', QuoteSchema);
