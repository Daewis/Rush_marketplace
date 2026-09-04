import express, { Response } from 'express';
import { Violation, ViolationType, ViolationSeverity, ViolationStatus } from '../models/Violation.js';
import { User, SystemRole } from '../models/User.js';
import { Job, JobStatus } from '../models/Job.js';
import { jwtRequired, AuthRequest } from '../middleware/auth.js';
import { WalletService } from '../services/walletService.js';
import { PaymentService } from '../services/paymentService.js';

const router = express.Router();

// GET /api/violations
router.get('/', async (req, res) => {
  try {
    const violations = await Violation.find()
      .populate('userId', 'fullName phone email')
      .populate('reportedBy', 'fullName')
      .sort({ createdAt: -1 });

    const formatted = violations.map((v: any) => ({
      id: v._id.toString(),
      user_id: v.userId?._id?.toString() || v.userId?.toString(),
      user_name: v.userId?.fullName || 'Campus Member',
      type: v.type,
      severity: v.severity,
      title: v.title,
      description: v.description,
      status: v.status,
      points_deducted: v.pointsDeducted,
      created_at: v.createdAt.toISOString(),
    }));

    return res.json({ success: true, data: { violations: formatted } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/violations
router.post('/', jwtRequired(true), async (req: AuthRequest, res: Response) => {
  try {
    const { user_id, job_id, type, severity, title, description } = req.body;
    if (!title || !description) {
      return res.status(400).json({ success: false, error: 'Title and description are required' });
    }

    const reporter = req.user || (await User.findOne());
    const targetUser = user_id ? await User.findById(user_id) : await User.findOne();

    if (!targetUser) return res.status(404).json({ success: false, error: 'Target user not found' });

    const violation = await Violation.create({
      userId: targetUser._id,
      jobId: job_id || null,
      reportedBy: reporter?._id || null,
      type: type || ViolationType.LATE_ARRIVAL,
      severity: severity || ViolationSeverity.MINOR,
      title,
      description,
      status: ViolationStatus.PENDING_REVIEW,
      pointsDeducted: severity === ViolationSeverity.CRITICAL ? 15 : severity === ViolationSeverity.MAJOR ? 7 : 3,
    });

    return res.status(201).json({
      success: true,
      message: 'Violation report logged in Accountability Center',
      data: { violation: { id: violation._id.toString(), status: violation.status } },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/violations/:id/resolve (also POST alias)
const handleResolveViolation = async (req: AuthRequest, res: Response) => {
  try {
    const violationId = String(req.params.id);
    const { action, note, penaltyNote } = req.body;

    const violation = await Violation.findById(violationId);
    if (!violation) {
      return res.status(404).json({ success: false, error: 'Violation case not found' });
    }

    if (violation.jobId) {
      const job = await Job.findById(violation.jobId);
      if (job && job.status !== JobStatus.COMPLETED && job.status !== JobStatus.CANCELLED) {
        if (action === 'refund') {
          const amount = job.finalPrice || job.estimatedPrice || 0;
          if (amount > 0 && job.customerId) {
            await WalletService.refundToCustomer({
              customerId: job.customerId,
              amount,
              jobId: job._id,
              jobTitle: job.title,
              notes: `Dispute resolution refund: ${note || 'Admin refunded escrow to customer'}`,
            });
          }
          job.status = JobStatus.CANCELLED;
          await job.save();
        } else if (action === 'payout') {
          await PaymentService.releasePayment(job._id.toString());
        }
      }
    }

    violation.status = ViolationStatus.RESOLVED;
    await violation.save();

    return res.json({
      success: true,
      message: `Dispute resolved successfully with action: ${action || 'resolved'}`,
      data: {
        id: violation._id.toString(),
        status: violation.status,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

router.patch('/:id/resolve', jwtRequired(true), handleResolveViolation);
router.post('/:id/resolve', jwtRequired(true), handleResolveViolation);

export default router;
