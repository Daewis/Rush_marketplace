import express, { Response } from 'express';
import { Rating } from '../models/Rating.js';
import { Provider } from '../models/Provider.js';
import { jwtRequired, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// POST /api/ratings
router.post('/', jwtRequired(true), async (req: AuthRequest, res: Response) => {
  try {
    const { job_id, target_id, rating, review } = req.body;
    if (!job_id || !target_id || !rating) {
      return res.status(400).json({ success: false, error: 'Job ID, target ID, and rating are required' });
    }

    const newRating = await Rating.create({
      jobId: job_id,
      raterId: req.userId,
      targetId: target_id,
      rating: Number(rating),
      review: review || '',
    });

    // Update target provider average rating
    const provider = await Provider.findOne({ userId: target_id });
    if (provider) {
      const allRatings = await Rating.find({ targetId: target_id });
      const avg = allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length;
      provider.rating = Math.round(avg * 10) / 10;
      await provider.save();
    }

    return res.status(201).json({
      success: true,
      message: 'Rating submitted successfully',
      data: { rating: newRating },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/ratings/target/:targetId
router.get('/target/:targetId', async (req, res) => {
  try {
    const ratings = await Rating.find({ targetId: req.params.targetId }).populate('raterId', 'fullName');
    return res.json({ success: true, data: { ratings } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
