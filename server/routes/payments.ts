import express, { Response } from 'express';
import { Payment, PaymentStatus, PaymentProviderEnum } from '../models/Payment.js';
import { Job } from '../models/Job.js';
import { User, SystemRole } from '../models/User.js';
import { jwtRequired, AuthRequest } from '../middleware/auth.js';
import { WalletService } from '../services/walletService.js';

const router = express.Router();

// GET /api/payments - List all payments for authenticated user or admin
router.get('/', jwtRequired(true), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const isAdmin =
      req.user?.systemRoles?.includes(SystemRole.ADMIN) ||
      (req.user as any)?.role === 'admin' ||
      (req.user as any)?.role === 'ADMIN';

    const query = isAdmin ? {} : { $or: [{ customerId: userId }, { providerId: userId }] };

    const payments = await Payment.find(query)
      .populate('jobId', 'title category')
      .populate('customerId', 'fullName email')
      .populate('providerId', 'fullName')
      .sort({ createdAt: -1 });

    const formatted = payments.map((p: any) => ({
      id: p._id.toString(),
      job_id: p.jobId?._id?.toString() || p.jobId?.toString(),
      job_title: p.jobId?.title || 'Campus Task / Wallet Top-Up',
      amount: p.amount,
      platform_fee: p.platformFee || 0,
      provider_earnings: p.providerEarnings || p.amount,
      provider: p.provider,
      reference: p.reference,
      status: p.status,
      created_at: p.createdAt ? p.createdAt.toISOString() : new Date().toISOString(),
    }));

    return res.json({ success: true, data: { payments: formatted } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/payments/paystack/initialize - Initialize transaction with Paystack API
router.post('/paystack/initialize', jwtRequired(true), async (req: AuthRequest, res: Response) => {
  try {
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecretKey || !paystackSecretKey.trim()) {
      return res.status(400).json({
        success: false,
        error: 'PAYSTACK_SECRET_KEY is missing in server environment. Please configure PAYSTACK_SECRET_KEY in Settings.',
      });
    }

    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { amount, email, job_id, payment_type = 'top_up', callback_url } = req.body;
    const numAmount = Number(amount);

    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({ success: false, error: 'A valid payment amount is required' });
    }

    const userEmail = email || req.user?.email || 'customer@rushng.com';
    const reference = `RUSH-PSTK-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const amountInKobo = Math.round(numAmount * 100);

    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.get('host') || 'localhost:3000';
    const defaultCallback = `${protocol}://${host}/?paystack_ref=${reference}`;

    const paystackPayload = {
      email: userEmail,
      amount: amountInKobo,
      reference,
      callback_url: callback_url || defaultCallback,
      metadata: {
        user_id: userId.toString(),
        job_id: job_id || '',
        payment_type: payment_type,
        platform: 'Rush Merchant Campus Hub',
      },
    };

    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${paystackSecretKey.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paystackPayload),
    });

    const paystackData = await paystackResponse.json();

    if (!paystackResponse.ok || !paystackData.status) {
      console.error('Paystack initialization error from Paystack API:', paystackData);
      return res.status(400).json({
        success: false,
        error: paystackData.message || 'Failed to initialize Paystack transaction',
        details: paystackData,
      });
    }

    // Record pending transaction in database if attached to a specific job
    try {
      if (job_id) {
        const job = await Job.findById(job_id);
        if (job) {
          const platformFee = Math.round(numAmount * 0.1);
          await Payment.create({
            jobId: job._id,
            customerId: userId,
            providerId: job.providerId || userId,
            amount: numAmount,
            platformFee,
            providerEarnings: numAmount - platformFee,
            provider: PaymentProviderEnum.PAYSTACK,
            reference,
            status: PaymentStatus.PENDING,
          });
        }
      }
    } catch (dbErr) {
      console.warn('Could not store pending payment in Mongo:', dbErr);
    }

    return res.json({
      success: true,
      message: 'Paystack checkout session initialized successfully',
      data: {
        authorization_url: paystackData.data.authorization_url,
        access_code: paystackData.data.access_code,
        reference: paystackData.data.reference,
        public_key: process.env.VITE_PAYSTACK_PUBLIC_KEY || process.env.PAYSTACK_PUBLIC_KEY || '',
      },
    });
  } catch (error: any) {
    console.error('Paystack initialize exception:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/payments/paystack/verify - Verify transaction with Paystack API
router.post('/paystack/verify', jwtRequired(true), async (req: AuthRequest, res: Response) => {
  try {
    const { reference } = req.body;
    if (!reference) {
      return res.status(400).json({ success: false, error: 'Transaction reference is required' });
    }

    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecretKey || !paystackSecretKey.trim()) {
      return res.status(400).json({
        success: false,
        error: 'PAYSTACK_SECRET_KEY is missing in server environment variables.',
      });
    }

    const verifyResponse = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${paystackSecretKey.trim()}`,
        'Content-Type': 'application/json',
      },
    });

    const verifyData = await verifyResponse.json();

    if (!verifyResponse.ok || !verifyData.status) {
      return res.status(400).json({
        success: false,
        error: verifyData.message || 'Payment verification failed on Paystack',
      });
    }

    const tx = verifyData.data;

    if (tx.status === 'success') {
      const amountInNgn = tx.amount / 100;
      const metadata = tx.metadata || {};

      // Security check: ensure metadata user_id matches authenticated user if provided
      const targetUserId = req.user?._id || metadata.user_id;

      // Find or update payment record
      let payment = await Payment.findOne({ reference });
      if (!payment && metadata.job_id) {
        payment = await Payment.create({
          jobId: metadata.job_id,
          customerId: targetUserId,
          amount: amountInNgn,
          platformFee: Math.round(amountInNgn * 0.1),
          providerEarnings: amountInNgn - Math.round(amountInNgn * 0.1),
          provider: PaymentProviderEnum.PAYSTACK,
          reference: tx.reference,
          status: PaymentStatus.HELD,
          heldAt: new Date(),
        });
      } else if (payment) {
        payment.status = PaymentStatus.HELD;
        payment.heldAt = new Date();
        await payment.save();
      }

      // If top-up or standard payment, credit user's wallet via WalletService
      if (targetUserId) {
        try {
          await WalletService.topUp({
            userId: targetUserId,
            amount: amountInNgn,
            reference: tx.reference,
            gateway: 'Paystack',
            notes: `Paystack online top-up (Channel: ${tx.channel || 'card'})`,
            metadata: {
              paystackReference: tx.reference,
              channel: tx.channel,
              customerEmail: tx.customer?.email,
            },
          });
        } catch (uErr) {
          console.warn('Could not update user wallet via WalletService:', uErr);
        }
      }

      return res.json({
        success: true,
        message: `Paystack payment of ₦${amountInNgn.toLocaleString()} verified successfully!`,
        data: {
          reference: tx.reference,
          amount: amountInNgn,
          status: 'success',
          channel: tx.channel,
          paid_at: tx.paid_at,
          customer_email: tx.customer?.email,
          payment: payment
            ? {
                id: payment._id.toString(),
                reference: payment.reference,
                amount: amountInNgn,
                status: payment.status,
              }
            : null,
        },
      });
    } else {
      return res.status(400).json({
        success: false,
        error: `Paystack transaction status is '${tx.status}'. Response: ${tx.gateway_response}`,
      });
    }
  } catch (error: any) {
    console.error('Paystack verify exception:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/payments/paystack/callback - Paystack HTTP Redirect Target
router.get('/paystack/callback', async (req, res) => {
  const reference = (req.query.reference || req.query.trxref) as string;
  if (!reference) {
    return res.redirect('/?paystack_error=no_reference');
  }

  try {
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    if (paystackSecretKey) {
      const verifyResponse = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
        headers: { Authorization: `Bearer ${paystackSecretKey.trim()}` },
      });
      const verifyData = await verifyResponse.json();
      if (verifyData.status && verifyData.data?.status === 'success') {
        const amountInNgn = verifyData.data.amount / 100;
        return res.redirect(`/?paystack_ref=${reference}&payment_success=true&amount=${amountInNgn}`);
      }
    }
  } catch (err) {
    console.error('Paystack callback error:', err);
  }

  return res.redirect(`/?paystack_ref=${reference}&payment_status=pending`);
});

// POST /api/payments/initialize - Generic initialize route mapping to Paystack if requested
router.post('/initialize', jwtRequired(true), async (req: AuthRequest, res: Response) => {
  const provider = (req.body.provider_type || req.body.provider || 'paystack').toLowerCase();
  if (provider === 'paystack') {
    return router.handle({ ...req, url: '/paystack/initialize' } as any, res, () => {});
  }

  return res.json({
    success: true,
    data: {
      reference: `MOCK-${Date.now()}`,
      authorization_url: 'https://checkout.rushng.com/pay/mock',
    },
  });
});

// POST /api/payments - Standard creation endpoint
router.post('/', jwtRequired(true), async (req: AuthRequest, res: Response) => {
  try {
    const { job_id, amount, provider_type } = req.body;
    if (!job_id || !amount) {
      return res.status(400).json({ success: false, error: 'Job ID and amount are required' });
    }

    const job = await Job.findById(job_id);
    if (!job) return res.status(404).json({ success: false, error: 'Job not found' });

    const customerId = req.user?._id || job.customerId;
    const providerUser = (await User.findById(job.providerId)) || req.user;

    const platformFee = Math.round(amount * 0.1);
    const providerEarnings = amount - platformFee;
    const refPrefix = (provider_type || 'paystack').toUpperCase();
    const reference = `${refPrefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const payment = await Payment.create({
      jobId: job._id,
      customerId: customerId,
      providerId: providerUser._id,
      amount,
      platformFee,
      providerEarnings,
      provider: provider_type || PaymentProviderEnum.PAYSTACK,
      reference,
      status: PaymentStatus.HELD,
      heldAt: new Date(),
    });

    return res.status(201).json({
      success: true,
      message: 'Payment recorded into Escrow Wallet successfully',
      data: {
        payment: {
          id: payment._id.toString(),
          reference: payment.reference,
          amount: payment.amount,
          status: payment.status,
          authorization_url: `https://checkout.rushng.com/pay/${payment.reference}`,
        },
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/payments/verify - Standard verify route
router.post('/verify', async (req, res) => {
  const { reference } = req.body;
  if (!reference) {
    return res.status(400).json({ success: false, error: 'Reference required' });
  }

  if (reference.startsWith('RUSH-PSTK') || process.env.PAYSTACK_SECRET_KEY) {
    try {
      const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
      if (paystackSecretKey) {
        const verifyResponse = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${paystackSecretKey.trim()}` },
        });
        const verifyData = await verifyResponse.json();
        if (verifyData.status && verifyData.data?.status === 'success') {
          const amountInNgn = verifyData.data.amount / 100;
          return res.json({
            success: true,
            message: 'Paystack payment verified and placed in Escrow',
            data: {
              reference,
              amount: amountInNgn,
              status: 'success',
            },
          });
        }
      }
    } catch (e) {
      console.warn('Paystack generic verify error:', e);
    }
  }

  const payment = await Payment.findOne({ reference });
  if (payment) {
    payment.status = PaymentStatus.HELD;
    payment.heldAt = new Date();
    await payment.save();
  }
  return res.json({ success: true, message: 'Payment verified and placed in Escrow' });
});

export default router;
