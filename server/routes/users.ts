import express, { Response } from 'express';
import { Job, JobStatus } from '../models/Job.js';
import { Payment, PaymentStatus } from '../models/Payment.js';
import { jwtRequired, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// GET /api/users/stats
router.get('/stats', jwtRequired(false), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const totalPosted = await Job.countDocuments({ customerId: userId });
    const totalCompleted = await Job.countDocuments({ customerId: userId, status: JobStatus.COMPLETED });
    const totalPayments = await Payment.aggregate([
      { $match: { customerId: userId, status: PaymentStatus.RELEASED } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    return res.json({
      success: true,
      data: {
        total_posted_jobs: totalPosted,
        total_completed_jobs: totalCompleted,
        // No fake fallback number here — a customer with no released
        // payments yet has genuinely spent ₦0, not some placeholder figure.
        total_spent: totalPayments[0]?.total || 0,
        compliance_rating: 100,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/users/profile
router.put('/profile', jwtRequired(false), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { full_name, phone, address, city, state, nin, bvn } = req.body;
    if (full_name) user.fullName = full_name;
    if (phone) user.phone = phone;
    if (address) user.address = address;
    if (city) user.city = city;
    if (state) user.state = state;
    if (nin) user.nin = nin;
    if (bvn) user.bvn = bvn;
    await user.save();

    return res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: user._id.toString(),
          full_name: user.fullName,
          phone: user.phone,
          email: user.email,
          address: user.address,
        },
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;