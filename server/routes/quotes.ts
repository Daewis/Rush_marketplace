import express, { Response } from 'express';
import { Quote } from '../models/Quote.js';
import { Job, JobStatus } from '../models/Job.js';
import { User } from '../models/User.js';
import { Provider } from '../models/Provider.js';
import { jwtRequired, AuthRequest } from '../middleware/auth.js';
import { NotificationService } from '../services/notificationService.js';

const router = express.Router();

// GET /api/quotes/job/:jobId - Get all bids/quotes for a specific job
router.get('/job/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const quotes = await Quote.find({ jobId }).sort({ createdAt: -1 });

    const formatted = quotes.map((q) => ({
      id: q._id.toString(),
      jobId: q.jobId.toString(),
      artisanId: q.artisanId.toString(),
      artisanName: q.artisanName,
      artisanAvatar: q.artisanAvatar || undefined,
      artisanRating: q.artisanRating || 5.0,
      artisanSkills: q.artisanSkills || [],
      price: q.price,
      estimatedDuration: q.estimatedDuration,
      proposal: q.proposal,
      status: q.status,
      createdAt: q.createdAt.toISOString(),
    }));

    return res.json({ success: true, data: { quotes: formatted } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/quotes/my - Get all bids submitted by the logged-in artisan
router.get('/my', jwtRequired(true), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const quotes = await Quote.find({ artisanId: userId })
      .populate('jobId', 'title category address estimatedPrice status')
      .sort({ createdAt: -1 });

    const formatted = quotes.map((q: any) => ({
      id: q._id.toString(),
      jobId: q.jobId?._id?.toString() || q.jobId?.toString(),
      jobTitle: q.jobId?.title || 'Campus Task',
      jobStatus: q.jobId?.status || 'posted',
      price: q.price,
      estimatedDuration: q.estimatedDuration,
      proposal: q.proposal,
      status: q.status,
      createdAt: q.createdAt.toISOString(),
    }));

    return res.json({ success: true, data: { quotes: formatted } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/quotes - Submit a new quote/bid on a job
router.post('/', jwtRequired(true), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { jobId, price, estimatedDuration, proposal } = req.body;
    const numPrice = Number(price);

    if (!jobId || !numPrice || numPrice <= 0 || !estimatedDuration || !proposal) {
      return res.status(400).json({
        success: false,
        error: 'jobId, valid price, estimatedDuration, and proposal are required',
      });
    }

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }
    if (job.status !== JobStatus.POSTED) {
      return res.status(409).json({
        success: false,
        error: `Cannot bid on job with status '${job.status}'. Job is no longer open for bidding.`,
      });
    }

    // Check if artisan already quoted
    const existing = await Quote.findOne({ jobId: job._id, artisanId: userId });
    if (existing) {
      // Update existing quote
      existing.price = numPrice;
      existing.estimatedDuration = estimatedDuration;
      existing.proposal = proposal;
      await existing.save();

      return res.json({
        success: true,
        message: 'Your quote proposal has been updated.',
        data: {
          quote: {
            id: existing._id.toString(),
            jobId: existing.jobId.toString(),
            price: existing.price,
            status: existing.status,
          },
        },
      });
    }

    // Fetch provider profile if exists
    const provider = await Provider.findOne({ userId });

    const quote = await Quote.create({
      jobId: job._id,
      artisanId: userId,
      artisanName: req.user?.fullName || provider?.name || 'Campus Artisan',
      artisanAvatar: req.user?.profilePicture || null,
      artisanRating: provider?.rating || 5.0,
      artisanSkills: provider?.skills || [],
      price: numPrice,
      estimatedDuration,
      proposal,
      status: 'pending',
    });

    // Notify customer
    try {
      const customer = await User.findById(job.customerId);
      if (customer) {
        await NotificationService.createNotification(
          customer._id.toString(),
          'New Quote Received',
          `${quote.artisanName} submitted a bid of ₦${numPrice.toLocaleString()} for "${job.title}".`,
          'quote_received'
        );
      }
    } catch (notifErr) {
      console.warn('Could not send quote notification:', notifErr);
    }

    return res.status(201).json({
      success: true,
      message: 'Bid submitted successfully!',
      data: {
        quote: {
          id: quote._id.toString(),
          jobId: quote.jobId.toString(),
          artisanId: quote.artisanId.toString(),
          artisanName: quote.artisanName,
          price: quote.price,
          estimatedDuration: quote.estimatedDuration,
          proposal: quote.proposal,
          status: quote.status,
          createdAt: quote.createdAt.toISOString(),
        },
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/quotes/:id/accept - Customer accepts a specific quote
router.post('/:id/accept', jwtRequired(true), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const quoteId = req.params.id;

    const quote = await Quote.findById(quoteId);
    if (!quote) {
      return res.status(404).json({ success: false, error: 'Quote not found' });
    }

    const job = await Job.findById(quote.jobId);
    if (!job) {
      return res.status(404).json({ success: false, error: 'Associated job not found' });
    }

    if (job.customerId?.toString() !== userId?.toString() && (req.user as any)?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Only the job owner can accept quotes' });
    }

    if (job.status !== JobStatus.POSTED) {
      return res.status(409).json({
        success: false,
        error: `Cannot accept quote. Job is currently in '${job.status}' status.`,
      });
    }

    // Accept this quote
    quote.status = 'accepted';
    await quote.save();

    // Reject other quotes on this job
    await Quote.updateMany(
      { jobId: job._id, _id: { $ne: quote._id } },
      { $set: { status: 'rejected' } }
    );

    // Assign job to the chosen artisan
    job.providerId = quote.artisanId;
    job.finalPrice = quote.price;
    job.status = JobStatus.ASSIGNED;
    await job.save();

    // Notify the chosen artisan
    try {
      await NotificationService.createNotification(
        quote.artisanId.toString(),
        'Quote Accepted! Task Assigned',
        `Your quote of ₦${quote.price.toLocaleString()} for "${job.title}" was accepted. You are now assigned to this task.`,
        'job_assigned'
      );
    } catch (nErr) {
      console.warn('Could not notify artisan of accepted quote:', nErr);
    }

    return res.json({
      success: true,
      message: `Quote accepted! ${quote.artisanName} assigned to job.`,
      data: {
        job_id: job._id.toString(),
        quote_id: quote._id.toString(),
        provider_id: quote.artisanId.toString(),
        provider_name: quote.artisanName,
        final_price: quote.price,
        status: job.status,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
