import express, { Response } from 'express';
import { Notification } from '../models/Notification.js';
import { jwtRequired, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// GET /api/notifications
router.get('/', jwtRequired(false), async (req: AuthRequest, res: Response) => {
  try {
    // The previous version returned the last 20 notifications from ANY
    // user in the entire database when no token was sent — a real data
    // leak, not just a mock-data footgun. Auth is required now.
    const notifications = await Notification.find({ userId: req.userId }).sort({ createdAt: -1 });

    const formatted = notifications.map((n: any) => ({
      id: n._id.toString(),
      title: n.title,
      message: n.message,
      type: n.type,
      read: n.read,
      created_at: n.createdAt.toISOString(),
    }));

    return res.json({ success: true, data: { notifications: formatted } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/notifications/:id/read
router.put('/:id/read', jwtRequired(false), async (req: AuthRequest, res: Response) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }
    // Without this check, any authenticated user could mark any other
    // user's notification as read just by guessing/iterating IDs.
    if (notification.userId.toString() !== req.userId) {
      return res.status(403).json({ success: false, error: 'This notification does not belong to you' });
    }

    notification.read = true;
    await notification.save();
    return res.json({ success: true, message: 'Notification marked as read' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/notifications/read-all
router.put('/read-all', jwtRequired(false), async (req: AuthRequest, res: Response) => {
  try {
    await Notification.updateMany({ userId: req.userId }, { read: true });
    return res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;