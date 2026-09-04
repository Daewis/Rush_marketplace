import mongoose, { Schema, Document } from 'mongoose';

export type WalletTransactionType =
  | 'top_up'
  | 'escrow_hold'
  | 'escrow_release'
  | 'refund'
  | 'withdrawal'
  | 'transfer'
  | 'fee';

export type WalletTransactionStatus = 'pending' | 'completed' | 'failed' | 'reversed';

export interface IWalletLedgerEntry extends Document {
  userId: mongoose.Types.ObjectId;
  type: WalletTransactionType;
  amount: number;
  balanceAfter: number;
  escrowHeldAfter: number;
  reference: string;
  gateway: string;
  status: WalletTransactionStatus;
  jobId?: mongoose.Types.ObjectId | null;
  jobTitle?: string | null;
  notes?: string | null;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const WalletLedgerEntrySchema = new Schema<IWalletLedgerEntry>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['top_up', 'escrow_hold', 'escrow_release', 'refund', 'withdrawal', 'transfer', 'fee'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    balanceAfter: {
      type: Number,
      required: true,
      min: 0,
    },
    escrowHeldAfter: {
      type: Number,
      required: true,
      min: 0,
    },
    reference: {
      type: String,
      required: true,
      index: true,
    },
    gateway: {
      type: String,
      default: 'RushWallet',
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'reversed'],
      default: 'completed',
    },
    jobId: {
      type: Schema.Types.ObjectId,
      ref: 'Job',
      default: null,
    },
    jobTitle: {
      type: String,
      default: null,
    },
    notes: {
      type: String,
      default: null,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

WalletLedgerEntrySchema.index({ userId: 1, createdAt: -1 });

export const WalletLedgerEntry = mongoose.model<IWalletLedgerEntry>(
  'WalletLedgerEntry',
  WalletLedgerEntrySchema
);
