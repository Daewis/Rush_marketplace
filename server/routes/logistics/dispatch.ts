import express, { Response } from 'express';
import { Dispatch, DispatchEvent } from '../../models/logistics/Dispatch.js';
import { Ride, RideStatus } from '../../models/logistics/Ride.js';
import { Driver, DriverStatus } from '../../models/logistics/Driver.js';
import { jwtRequired, AuthRequest } from '../../middleware/auth.js';
import { riderRequired } from '../../middleware/role-check.js';
import { NotificationService } from '../../services/notificationService.js';

const router = express.Router();

const EVENT_TO_STATUS: Record<string, RideStatus> = {
  [DispatchEvent.PICKED_UP]: RideStatus.PICKED_UP,
  [DispatchEvent.ARRIVED]: RideStatus.IN_TRANSIT,
  [DispatchEvent.COMPLETED]: RideStatus.COMPLETED,
};

const EVENT_MESSAGE: Record<string, string> = {
  [DispatchEvent.PICKED_UP]: 'Your delivery has been picked up and is on the way.',
  [DispatchEvent.ARRIVED]: 'Your rider has arrived.',
  [DispatchEvent.COMPLETED]: 'Your delivery has been completed.',
};

// POST /api/logistics/dispatch/:rideId/event
router.post('/:rideId/event', jwtRequired(false), riderRequired, async (req: AuthRequest, res: Response) => {
  try {
    const { event, lat, lng } = req.body;
    if (!Object.values(DispatchEvent).includes(event)) {
      return res.status(400).json({ success: false, error: 'Invalid dispatch event' });
    }

    const ride = await Ride.findById(req.params.rideId);
    if (!ride) {
      return res.status(404).json({ success: false, error: 'Ride not found' });
    }
    if (ride.driverId?.toString() !== req.userId) {
      return res.status(403).json({ success: false, error: 'You are not assigned to this ride' });
    }

    await Dispatch.create({
      rideId: ride._id,
      event,
      actorId: req.userId,
      location: lat != null && lng != null ? { lat, lng } : null,
    });

    const newStatus = EVENT_TO_STATUS[event];
    if (newStatus) {
      ride.status = newStatus;
      if (event === DispatchEvent.PICKED_UP) ride.pickedUpAt = new Date();
      if (event === DispatchEvent.COMPLETED) {
        ride.completedAt = new Date();
        await Driver.findOneAndUpdate({ userId: req.userId }, {
          status: DriverStatus.AVAILABLE,
          $inc: { totalTrips: 1 },
        });
      }
      await ride.save();
    }

    const message = EVENT_MESSAGE[event];
    if (message) {
      await NotificationService.sendNotification(ride.customerId.toString(), 'Delivery Update', message, 'ride_update');
    }

    return res.json({ success: true, data: { ride_id: ride._id.toString(), status: ride.status, event } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/logistics/dispatch/:rideId/history
router.get('/:rideId/history', jwtRequired(false), async (req: AuthRequest, res: Response) => {
  try {
    const events = await Dispatch.find({ rideId: req.params.rideId }).sort({ createdAt: 1 });
    return res.json({
      success: true,
      data: {
        events: events.map((e) => ({
          event: e.event,
          location: e.location,
          created_at: e.createdAt.toISOString(),
        })),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
