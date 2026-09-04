import mongoose, { Schema, Document } from 'mongoose';

export interface IRating extends Document {
  jobId: mongoose.Types.ObjectId;
  raterId: mongoose.Types.ObjectId;
  targetId: mongoose.Types.ObjectId;
  rating: number;
  review?: string;
  createdAt: Date;
}

const RatingSchema = new Schema<IRating>(
  {
    jobId: { type: Schema.Types.ObjectId, ref: 'Job', required: true },
    raterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    targetId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    review: { type: String, default: '' },
  },
  {
    timestamps: true,
  }
);

export const Rating = mongoose.model<IRating>('Rating', RatingSchema);
