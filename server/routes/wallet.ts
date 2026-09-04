import express, { Response } from 'express';
import { jwtRequired, AuthRequest } from '../middleware/auth.js';
import { WalletService } from '../services/walletService.js';
import { User } from '../models/User.js';

const router = express.Router();

// GET /api/wallet/me - Get current user wallet balance and escrow held
router.get('/me', jwtRequired(true), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const wallet = await WalletService.getWallet(userId);
    return res.json({
      success: true,
      data: {
        balance: wallet.balance,
        escrow_held: wallet.escrowHeld,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/wallet/transactions - List ledger transactions for user
router.get('/transactions', jwtRequired(true), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const skip = parseInt(req.query.skip as string) || 0;

    const entries = await WalletService.getTransactions(userId, limit, skip);

    const formatted = entries.map((entry) => ({
      id: entry._id.toString(),
      userId: entry.userId.toString(),
      type: entry.type,
      amount: entry.amount,
      balanceAfter: entry.balanceAfter,
      escrowHeldAfter: entry.escrowHeldAfter,
      reference: entry.reference,
      gateway: entry.gateway || 'RushWallet',
      status: entry.status,
      jobId: entry.jobId ? entry.jobId.toString() : undefined,
      jobTitle: entry.jobTitle || undefined,
      notes: entry.notes || undefined,
      createdAt: entry.createdAt ? entry.createdAt.toISOString() : new Date().toISOString(),
    }));

    return res.json({
      success: true,
      data: {
        transactions: formatted,
        total: formatted.length,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/wallet/withdraw - Withdraw funds from wallet balance
router.post('/withdraw', jwtRequired(true), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { amount, bankName, accountNumber } = req.body;
    const numAmount = Number(amount);

    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({ success: false, error: 'Valid withdrawal amount is required' });
    }
    if (!bankName || !accountNumber) {
      return res.status(400).json({ success: false, error: 'Bank name and account number are required' });
    }

    const result = await WalletService.withdraw({
      userId,
      amount: numAmount,
      bankName,
      accountNumber,
    });

    return res.json({
      success: true,
      message: `Withdrawal request of ₦${numAmount.toLocaleString()} processed successfully`,
      data: {
        entry: {
          id: result.entry._id.toString(),
          reference: result.entry.reference,
          amount: result.entry.amount,
          balanceAfter: result.entry.balanceAfter,
        },
        balance: result.user.walletBalance,
      },
    });
  } catch (error: any) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

// POST /api/wallet/topup - Direct wallet top-up (e.g. for testing / direct funding)
router.post('/topup', jwtRequired(true), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { amount, gateway = 'RushWallet', reference } = req.body;
    const numAmount = Number(amount);

    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({ success: false, error: 'Valid top-up amount is required' });
    }

    const result = await WalletService.topUp({
      userId,
      amount: numAmount,
      gateway,
      reference,
      notes: `Manual / Direct wallet top-up of ₦${numAmount.toLocaleString()} via ${gateway}`,
    });

    return res.json({
      success: true,
      message: `₦${numAmount.toLocaleString()} added to your wallet`,
      data: {
        balance: result.user.walletBalance,
        entry: {
          id: result.entry._id.toString(),
          reference: result.entry.reference,
          amount: result.entry.amount,
        },
      },
    });
  } catch (error: any) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

export default router;
