import mongoose from 'mongoose';
import { User, IUser } from '../models/User.js';
import { WalletLedgerEntry, IWalletLedgerEntry, WalletTransactionType } from '../models/WalletLedgerEntry.js';

export interface TopUpParams {
  userId: string | mongoose.Types.ObjectId;
  amount: number;
  reference?: string;
  gateway?: string;
  notes?: string;
  metadata?: Record<string, any>;
}

export interface HoldEscrowParams {
  userId: string | mongoose.Types.ObjectId;
  amount: number;
  jobId?: string | mongoose.Types.ObjectId;
  jobTitle?: string;
  reference?: string;
  notes?: string;
}

export interface ReleaseEscrowParams {
  customerId: string | mongoose.Types.ObjectId;
  providerId: string | mongoose.Types.ObjectId;
  amount: number;
  platformFeeRate?: number;
  jobId?: string | mongoose.Types.ObjectId;
  jobTitle?: string;
  reference?: string;
}

export interface RefundParams {
  customerId: string | mongoose.Types.ObjectId;
  amount: number;
  jobId?: string | mongoose.Types.ObjectId;
  jobTitle?: string;
  reference?: string;
  notes?: string;
}

export interface WithdrawParams {
  userId: string | mongoose.Types.ObjectId;
  amount: number;
  bankName: string;
  accountNumber: string;
  reference?: string;
  notes?: string;
}

export class WalletService {
  /**
   * Get user wallet balance and escrow held directly from User model
   */
  static async getWallet(userId: string | mongoose.Types.ObjectId): Promise<{
    balance: number;
    escrowHeld: number;
  }> {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    return {
      balance: user.walletBalance || 0,
      escrowHeld: user.escrowHeld || 0,
    };
  }

  /**
   * Top up a user's wallet (e.g. from Paystack verification or admin credit)
   */
  static async topUp(params: TopUpParams): Promise<{
    user: IUser;
    entry: IWalletLedgerEntry;
  }> {
    const { userId, amount, reference, gateway = 'Paystack', notes, metadata } = params;
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      throw new Error('Top-up amount must be greater than zero');
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found for wallet top-up');
    }

    const currentBalance = user.walletBalance || 0;
    const currentEscrow = user.escrowHeld || 0;
    const newBalance = currentBalance + numAmount;

    user.walletBalance = newBalance;
    await user.save();

    const ref = reference || `TOPUP-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    const entry = await WalletLedgerEntry.create({
      userId: user._id,
      type: 'top_up',
      amount: numAmount,
      balanceAfter: newBalance,
      escrowHeldAfter: currentEscrow,
      reference: ref,
      gateway,
      status: 'completed',
      notes: notes || `Wallet top-up of ₦${numAmount.toLocaleString()} via ${gateway}`,
      metadata: metadata || {},
    });

    return { user, entry };
  }

  /**
   * Hold funds in escrow when a job is posted or booked
   */
  static async holdEscrow(params: HoldEscrowParams): Promise<{
    user: IUser;
    entry: IWalletLedgerEntry;
  }> {
    const { userId, amount, jobId, jobTitle, reference, notes } = params;
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      throw new Error('Escrow hold amount must be positive');
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new Error('Customer account not found');
    }

    const currentBalance = user.walletBalance || 0;
    const currentEscrow = user.escrowHeld || 0;

    if (currentBalance < numAmount) {
      throw new Error(
        `Insufficient wallet balance. You have ₦${currentBalance.toLocaleString()} available, but ₦${numAmount.toLocaleString()} is required.`
      );
    }

    const newBalance = currentBalance - numAmount;
    const newEscrow = currentEscrow + numAmount;

    user.walletBalance = newBalance;
    user.escrowHeld = newEscrow;
    await user.save();

    const ref = reference || `ESCROW-HOLD-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    const entry = await WalletLedgerEntry.create({
      userId: user._id,
      type: 'escrow_hold',
      amount: numAmount,
      balanceAfter: newBalance,
      escrowHeldAfter: newEscrow,
      reference: ref,
      gateway: 'RushWallet',
      status: 'completed',
      jobId: jobId ? new mongoose.Types.ObjectId(jobId.toString()) : null,
      jobTitle: jobTitle || null,
      notes: notes || `Escrow locked for job: ${jobTitle || 'Campus Job'}`,
    });

    return { user, entry };
  }

  /**
   * Release escrow from customer to provider upon job confirmation
   */
  static async releaseEscrowToProvider(params: ReleaseEscrowParams): Promise<{
    platformFee: number;
    providerEarnings: number;
    customerEntry: IWalletLedgerEntry;
    providerEntry: IWalletLedgerEntry;
  }> {
    const { customerId, providerId, amount, platformFeeRate = 0.1, jobId, jobTitle, reference } = params;
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      throw new Error('Release amount must be positive');
    }

    const customer = await User.findById(customerId);
    if (!customer) {
      throw new Error('Customer account not found');
    }

    const provider = await User.findById(providerId);
    if (!provider) {
      throw new Error('Provider account not found');
    }

    const platformFee = Math.round(numAmount * platformFeeRate);
    const providerEarnings = numAmount - platformFee;

    // Deduct from customer escrow
    const custEscrow = customer.escrowHeld || 0;
    const custNewEscrow = Math.max(0, custEscrow - numAmount);
    customer.escrowHeld = custNewEscrow;
    await customer.save();

    // Credit provider wallet
    const provBalance = provider.walletBalance || 0;
    const provNewBalance = provBalance + providerEarnings;
    provider.walletBalance = provNewBalance;
    await provider.save();

    const baseRef = reference || `ESCROW-REL-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    // Ledger for customer (escrow release)
    const customerEntry = await WalletLedgerEntry.create({
      userId: customer._id,
      type: 'escrow_release',
      amount: numAmount,
      balanceAfter: customer.walletBalance || 0,
      escrowHeldAfter: custNewEscrow,
      reference: `${baseRef}-CUST`,
      gateway: 'RushWallet',
      status: 'completed',
      jobId: jobId ? new mongoose.Types.ObjectId(jobId.toString()) : null,
      jobTitle: jobTitle || null,
      notes: `Escrow released for completed job: ${jobTitle || 'Campus Job'}`,
    });

    // Ledger for provider (payout credited)
    const providerEntry = await WalletLedgerEntry.create({
      userId: provider._id,
      type: 'escrow_release',
      amount: providerEarnings,
      balanceAfter: provNewBalance,
      escrowHeldAfter: provider.escrowHeld || 0,
      reference: `${baseRef}-PROV`,
      gateway: 'RushWallet',
      status: 'completed',
      jobId: jobId ? new mongoose.Types.ObjectId(jobId.toString()) : null,
      jobTitle: jobTitle || null,
      notes: `Payout received for job: ${jobTitle || 'Campus Job'} (Fee: ₦${platformFee.toLocaleString()})`,
    });

    return {
      platformFee,
      providerEarnings,
      customerEntry,
      providerEntry,
    };
  }

  /**
   * Refund held escrow back to customer (on job cancel or dispute refund)
   */
  static async refundToCustomer(params: RefundParams): Promise<{
    user: IUser;
    entry: IWalletLedgerEntry;
  }> {
    const { customerId, amount, jobId, jobTitle, reference, notes } = params;
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      throw new Error('Refund amount must be positive');
    }

    const customer = await User.findById(customerId);
    if (!customer) {
      throw new Error('Customer account not found');
    }

    const currentEscrow = customer.escrowHeld || 0;
    const currentBalance = customer.walletBalance || 0;

    const newEscrow = Math.max(0, currentEscrow - numAmount);
    const newBalance = currentBalance + numAmount;

    customer.escrowHeld = newEscrow;
    customer.walletBalance = newBalance;
    await customer.save();

    const ref = reference || `REFUND-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    const entry = await WalletLedgerEntry.create({
      userId: customer._id,
      type: 'refund',
      amount: numAmount,
      balanceAfter: newBalance,
      escrowHeldAfter: newEscrow,
      reference: ref,
      gateway: 'RushWallet',
      status: 'completed',
      jobId: jobId ? new mongoose.Types.ObjectId(jobId.toString()) : null,
      jobTitle: jobTitle || null,
      notes: notes || `Escrow refunded to wallet balance for job: ${jobTitle || 'Campus Job'}`,
    });

    return { user: customer, entry };
  }

  /**
   * Withdraw funds from wallet balance to bank account
   */
  static async withdraw(params: WithdrawParams): Promise<{
    user: IUser;
    entry: IWalletLedgerEntry;
  }> {
    const { userId, amount, bankName, accountNumber, reference, notes } = params;
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      throw new Error('Withdrawal amount must be greater than zero');
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User account not found');
    }

    const currentBalance = user.walletBalance || 0;
    if (currentBalance < numAmount) {
      throw new Error(
        `Insufficient funds. Available balance: ₦${currentBalance.toLocaleString()}, Requested: ₦${numAmount.toLocaleString()}`
      );
    }

    const newBalance = currentBalance - numAmount;
    user.walletBalance = newBalance;
    await user.save();

    const ref = reference || `WITHDRAW-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    const entry = await WalletLedgerEntry.create({
      userId: user._id,
      type: 'withdrawal',
      amount: numAmount,
      balanceAfter: newBalance,
      escrowHeldAfter: user.escrowHeld || 0,
      reference: ref,
      gateway: 'RushWallet',
      status: 'completed',
      notes: notes || `Payout transfer to ${bankName} (Acct: ${accountNumber})`,
      metadata: { bankName, accountNumber },
    });

    return { user, entry };
  }

  /**
   * Get ledger transaction history for user
   */
  static async getTransactions(
    userId: string | mongoose.Types.ObjectId,
    limit = 50,
    skip = 0
  ): Promise<IWalletLedgerEntry[]> {
    return WalletLedgerEntry.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
  }
}
