import express, { Response } from 'express';
import { Job, JobStatus, JobCategory } from '../models/Job.js';
import { Provider } from '../models/Provider.js';
import { Payment, PaymentStatus } from '../models/Payment.js';
import { User } from '../models/User.js';
import { jwtRequired, AuthRequest } from '../middleware/auth.js';
import { PaymentService } from '../services/paymentService.js';
import { WalletService } from '../services/walletService.js';

const router = express.Router();

// GET /api/jobs
router.get('/', async (req, res) => {
  try {
    const { category, status, search } = req.query;
    const filter: any = {};

    if (category) filter.category = category;
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } },
      ];
    }

    const jobs = await Job.find(filter)
      .populate('customerId', 'fullName email phone rating')
      .populate('providerId', 'fullName email phone rating')
      .sort({ createdAt: -1 });

    const formattedJobs = jobs.map((job: any) => ({
      id: job._id.toString(),
      customer_id: job.customerId?._id?.toString() || job.customerId?.toString(),
      provider_id: job.providerId?._id?.toString() || job.providerId?.toString() || null,
      title: job.title,
      description: job.description,
      category: job.category,
      subcategory: job.subcategory,
      address: job.address,
      city: job.city,
      state: job.state,
      status: job.status,
      estimated_price: job.estimatedPrice,
      final_price: job.finalPrice,
      tracking_code: job.trackingCode,
      customer_name: job.customerId?.fullName || 'Campus Customer',
      provider_name: job.providerId?.fullName || null,
      created_at: job.createdAt.toISOString(),
      check_in_time: job.checkInTime ? job.checkInTime.toISOString() : null,
      check_out_time: job.checkOutTime ? job.checkOutTime.toISOString() : null,
    }));

    return res.json({
      success: true,
      data: {
        jobs: formattedJobs,
        total: formattedJobs.length,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/jobs/my
router.get('/my', jwtRequired(false), async (req: AuthRequest, res: Response) => {
  try {
    const jobs = await Job.find({
      $or: [{ customerId: req.userId }, { providerId: req.userId }],
    }).sort({ createdAt: -1 });

    const formatted = jobs.map((job: any) => ({
      id: job._id.toString(),
      title: job.title,
      description: job.description,
      category: job.category,
      status: job.status,
      estimated_price: job.estimatedPrice,
      address: job.address,
      created_at: job.createdAt.toISOString(),
    }));

    return res.json({ success: true, data: { jobs: formatted } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/jobs/stats/provider
// Thin for now — reads straight off the Provider model's existing
// aggregate fields plus a live count of jobs completed today. No
// historical earnings breakdown yet (see /earnings/daily below).
router.get('/stats/provider', jwtRequired(false), async (req: AuthRequest, res: Response) => {
  try {
    const provider = await Provider.findOne({ userId: req.userId });
    if (!provider) {
      return res.status(404).json({ success: false, error: 'Provider profile not found' });
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const completedToday = await Job.countDocuments({
      providerId: req.userId,
      status: JobStatus.COMPLETED,
      completedAt: { $gte: startOfToday },
    });

    const todayEarningsAgg = await Payment.aggregate([
      {
        $match: {
          providerId: req.userId,
          status: PaymentStatus.RELEASED,
          releasedAt: { $gte: startOfToday },
        },
      },
      { $group: { _id: null, total: { $sum: '$providerEarnings' } } },
    ]);
    const todayEarnings = todayEarningsAgg[0]?.total || 0;

    return res.json({
      success: true,
      data: {
        todayEarnings,
        completedToday,
        rating: provider.rating || 5,
        acceptanceRate: provider.complianceScore || 100,
        totalEarnings: provider.totalEarnings || 0,
        totalDeliveries: provider.totalJobsCompleted || 0,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/jobs/earnings/daily
// Thin for now — last 7 days of released payments for this provider,
// grouped by day. Returns zero-filled days with no earnings that day
// rather than omitting them, so the frontend chart always has 7 points.
router.get('/earnings/daily', jwtRequired(false), async (req: AuthRequest, res: Response) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const payments = await Payment.aggregate([
      {
        $match: {
          providerId: req.userId,
          status: PaymentStatus.RELEASED,
          releasedAt: { $gte: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$releasedAt' } },
          total: { $sum: '$providerEarnings' },
        },
      },
    ]);

    const byDate = new Map(payments.map((p: any) => [p._id, p.total]));
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const result = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split('T')[0];
      result.push({
        label: dayLabels[d.getDay()],
        value: byDate.get(key) || 0,
      });
    }

    return res.json({ success: true, data: result });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/jobs/available
// Thin for now — open jobs not yet assigned to any provider. No
// distance/location matching yet (see handoff notes: no geocoding/map
// picker exists), so this just returns all POSTED jobs.
// IMPORTANT: this must be declared BEFORE GET /:id below — otherwise
// Express matches "available" as an :id param and Job.findById("available")
// throws (invalid ObjectId), which is exactly what caused the 500 you saw.
router.get('/available', jwtRequired(false), async (req: AuthRequest, res: Response) => {
  try {
    const jobs = await Job.find({ status: JobStatus.POSTED })
      .populate('customerId', 'fullName')
      .sort({ createdAt: -1 })
      .limit(20);

    const formatted = jobs.map((job: any) => ({
      id: job._id.toString(),
      pickup: job.address,
      dropoff: job.address, // no separate dropoff field on Job yet — see notes
      distance: 'N/A', // no geocoding yet — see handoff notes
      payout: job.estimatedPrice,
      customer: job.customerId?.fullName || 'Campus Customer',
      estimatedTime: 'N/A',
    }));

    return res.json({ success: true, data: formatted });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/jobs
router.post('/', jwtRequired(false), async (req: AuthRequest, res: Response) => {
  try {
    const { category, title, description, address, estimated_price, subcategory, lat, lng } = req.body;

    if (!category || !title || !description || !address) {
      return res.status(400).json({ success: false, error: 'Category, title, description, and address are required' });
    }

    const price = Number(estimated_price) || 5000;
    const userId = req.userId;

    if (userId) {
      const user = await User.findById(userId);
      if (user && (user.walletBalance || 0) < price) {
        return res.status(402).json({
          success: false,
          error: `Insufficient wallet balance. You have ₦${(user.walletBalance || 0).toLocaleString()} available, but ₦${price.toLocaleString()} is required. Please top up your wallet.`,
        });
      }
    }

    const job = await Job.create({
      customerId: userId,
      category,
      subcategory,
      title,
      description,
      address,
      location: { lat: lat || 6.5244, lng: lng || 3.3792 },
      estimatedPrice: price,
      status: JobStatus.POSTED,
    });

    // Hold escrow in real wallet ledger
    if (userId) {
      try {
        await WalletService.holdEscrow({
          userId,
          amount: price,
          jobId: job._id,
          jobTitle: job.title,
          notes: `Escrow locked for job posting: ${job.title}`,
        });
      } catch (escrowErr: any) {
        // Rollback job if escrow hold fails
        await Job.findByIdAndDelete(job._id);
        return res.status(402).json({
          success: false,
          error: escrowErr.message || 'Could not lock escrow for this job. Please ensure your wallet has sufficient funds.',
        });
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Job posted successfully and escrow vault secured',
      data: {
        job_id: job._id.toString(),
        job: {
          id: job._id.toString(),
          title: job.title,
          status: job.status,
          estimated_price: job.estimatedPrice,
        },
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/jobs/:id/cancel - Cancel an unassigned posted job and refund escrow
router.post('/:id/cancel', jwtRequired(false), async (req: AuthRequest, res: Response) => {
  try {
    const jobId = String(req.params.id);
    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ success: false, error: 'Job not found' });

    if (req.userId && job.customerId?.toString() !== req.userId && (req.user as any)?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Only the job owner can cancel this job' });
    }

    if (job.status !== JobStatus.POSTED) {
      return res.status(409).json({
        success: false,
        error: `Cannot cancel job with status '${job.status}'. Only unassigned posted jobs can be directly cancelled.`,
      });
    }

    const price = job.estimatedPrice || 0;
    if (price > 0 && job.customerId) {
      try {
        await WalletService.refundToCustomer({
          customerId: job.customerId,
          amount: price,
          jobId: job._id,
          jobTitle: job.title,
          notes: `Escrow refund for cancelled job: ${job.title}`,
        });
      } catch (refErr: any) {
        console.warn('Could not refund escrow on job cancel:', refErr);
      }
    }

    job.status = JobStatus.CANCELLED;
    await job.save();

    return res.json({
      success: true,
      message: 'Job cancelled successfully and escrow returned to wallet.',
      data: { job_id: job._id.toString(), status: job.status },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/jobs/:id
router.get('/:id', async (req, res) => {
  try {
    const jobId = String(req.params.id);
    const job: any = await Job.findById(jobId)
      .populate('customerId', 'fullName phone email')
      .populate('providerId', 'fullName phone email');

    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    return res.json({
      success: true,
      data: {
        job: {
          id: job._id.toString(),
          title: job.title,
          description: job.description,
          category: job.category,
          subcategory: job.subcategory,
          address: job.address,
          status: job.status,
          estimated_price: job.estimatedPrice,
          final_price: job.finalPrice,
          created_at: job.createdAt.toISOString(),
          customer: job.customerId ? { id: job.customerId._id.toString(), full_name: job.customerId.fullName } : null,
          provider: job.providerId ? { id: job.providerId._id.toString(), full_name: job.providerId.fullName } : null,
        },
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/jobs/:id/apply
router.post('/:id/apply', jwtRequired(false), async (req: AuthRequest, res: Response) => {
  try {
    const jobId = String(req.params.id);
    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ success: false, error: 'Job not found' });
    if (job.status !== JobStatus.POSTED) {
      return res.status(409).json({ success: false, error: 'This job is no longer open' });
    }

    job.providerId = req.userId as any;
    job.status = JobStatus.ASSIGNED;
    await job.save();

    return res.json({
      success: true,
      message: 'Applied to job successfully. Assigned to provider!',
      data: { job_id: job._id.toString(), status: job.status },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/jobs/:id/assign
router.post('/:id/assign', jwtRequired(false), async (req: AuthRequest, res: Response) => {
  try {
    const { providerId } = req.body;
    if (!providerId) {
      return res.status(400).json({ success: false, error: 'providerId is required' });
    }

    const jobId = String(req.params.id);
    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ success: false, error: 'Job not found' });
    if (job.customerId.toString() !== req.userId) {
      return res.status(403).json({ success: false, error: 'Only the job owner can assign a provider' });
    }
    if (job.status !== JobStatus.POSTED) {
      return res.status(409).json({ success: false, error: 'This job is no longer open' });
    }

    job.providerId = providerId;
    job.status = JobStatus.ASSIGNED;
    await job.save();

    return res.json({
      success: true,
      message: 'Provider assigned to job.',
      data: { job_id: job._id.toString(), status: job.status },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/jobs/:id/check-in
router.post('/:id/check-in', jwtRequired(false), async (req: AuthRequest, res: Response) => {
  try {
    const jobId = String(req.params.id);
    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ success: false, error: 'Job not found' });
    if (job.providerId?.toString() !== req.userId) {
      return res.status(403).json({ success: false, error: 'Only the assigned provider can check in' });
    }

    const { photo, lat, lng } = req.body;
    job.status = JobStatus.IN_PROGRESS;
    job.checkInTime = new Date();
    job.checkInPhoto = photo || null;
    if (lat && lng) job.checkInLocation = { lat, lng };

    await job.save();

    return res.json({
      success: true,
      message: 'GPS Check-In successful. Task status set to In Progress.',
      data: { job_id: job._id.toString(), status: job.status, check_in_time: job.checkInTime.toISOString() },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/jobs/:id/check-out
router.post('/:id/check-out', jwtRequired(false), async (req: AuthRequest, res: Response) => {
  try {
    const jobId = String(req.params.id);
    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ success: false, error: 'Job not found' });
    if (job.providerId?.toString() !== req.userId) {
      return res.status(403).json({ success: false, error: 'Only the assigned provider can check out' });
    }

    const { photo } = req.body;
    job.status = JobStatus.COMPLETED;
    job.checkOutTime = new Date();
    job.completedAt = new Date();
    job.checkOutPhoto = photo || null;

    await job.save();

    return res.json({
      success: true,
      message: 'GPS Check-Out completed. Awaiting escrow confirmation.',
      data: { job_id: job._id.toString(), status: job.status, check_out_time: job.checkOutTime.toISOString() },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/jobs/:id/confirm
router.post('/:id/confirm', jwtRequired(false), async (req: AuthRequest, res: Response) => {
  try {
    const jobId = String(req.params.id);
    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ success: false, error: 'Job not found' });
    if (job.customerId.toString() !== req.userId) {
      return res.status(403).json({ success: false, error: 'Only the job owner can confirm completion' });
    }

    const result = await PaymentService.releasePayment(jobId);
    if (!result.success) {
      return res.status(409).json({ success: false, error: result.message });
    }

    return res.json({
      success: true,
      message: result.message || 'Job confirmed and Escrow payment released to Artisan wallet.',
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;