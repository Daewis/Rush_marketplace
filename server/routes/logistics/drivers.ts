import express, { Response } from 'express';
import { Driver, DriverStatus } from '../../models/logistics/Driver.js';
import { Vehicle } from '../../models/logistics/Vehicle.js';
import { User, Capability, CapabilityStatus } from '../../models/User.js';
import { jwtRequired, AuthRequest } from '../../middleware/auth.js';

const router = express.Router();

const formatDriver = (driver: any) => ({
  id: driver._id.toString(),
  user_id: driver.userId?._id?.toString() || driver.userId?.toString(),
  name: driver.userId?.fullName || null,
  phone: driver.userId?.phone || null,
  vehicle_type: driver.vehicleType,
  vehicle_plate_number: driver.vehiclePlateNumber,
  license_verified: driver.licenseVerified,
  status: driver.status,
  rating: driver.rating,
  total_trips: driver.totalTrips,
  mobility_capabilities: driver.mobilityCapabilities || ['DELIVERY'],
});

/**
 * POST /api/logistics/drivers/onboard
 *
 * Legacy entrypoint for rider onboarding. The new entrypoint at
 * /api/onboarding/rider supports full vehicle registration +
 * verification documents + mobility capability selection. This route
 * stays for backward compat with the existing frontend
 * (DriverOnboardingModal) — it creates a single-vehicle Driver
 * profile, marks the RIDER capability as PENDING_VERIFICATION (NOT
 * ACTIVE — admins must approve), and creates a Vehicle record.
 *
 * The capability is NOT auto-activated. The rider cannot accept rides
 * until an admin approves (see /api/admin/rider-verify).
 */
router.post('/onboard', jwtRequired(false), async (req: AuthRequest, res: Response) => {
  try {
    const { vehicleType, vehiclePlateNumber, licenseNumber, licenseDocumentUrl, mobilityCapabilities } = req.body;

    if (!vehicleType || !vehiclePlateNumber || !licenseNumber) {
      return res.status(400).json({ success: false, error: 'vehicleType, vehiclePlateNumber, and licenseNumber are required' });
    }

    const existing = await Driver.findOne({ userId: req.userId });
    if (existing) {
      return res.status(400).json({ success: false, error: 'Rider profile already exists for this user' });
    }

    // Create the Vehicle record first — a rider needs at least one
    // approved vehicle to be cleared for any mobility work.
    const vehicle = await Vehicle.create({
      ownerId: req.userId,
      type: vehicleType.toUpperCase(),
      make: 'Unknown',
      model: 'Unknown',
      plateNumber: vehiclePlateNumber,
      verificationStatus: 'PENDING',
      documents: licenseDocumentUrl ? [licenseDocumentUrl] : [],
    });

    const driver = await Driver.create({
      userId: req.userId,
      vehicleType,
      vehiclePlateNumber,
      licenseNumber,
      licenseDocumentUrl: licenseDocumentUrl || null,
      licenseVerified: false,
      mobilityCapabilities: mobilityCapabilities || ['DELIVERY'],
      approvedVehicleIds: [vehicle._id],
    });

    // Capability activation — PENDING until admin approves the
    // license + vehicle. The user can browse the rider workspace but
    // cannot go online until ACTIVE.
    const user = await User.findById(req.userId);
    if (user) {
      if (!user.capabilities.includes(Capability.RIDER)) {
        user.capabilities.push(Capability.RIDER);
      }
      user.capabilityStatus = {
        ...(user.capabilityStatus || {}),
        [Capability.RIDER]: CapabilityStatus.PENDING_VERIFICATION,
      };
      user.activeWorkspace = Capability.RIDER;
      await user.save();
    }

    return res.status(201).json({
      success: true,
      message: 'Rider application submitted. We will review your license and vehicle before activating your rider capability.',
      data: {
        driver: formatDriver(driver),
        capabilities: user?.capabilities,
        capability_status: user?.capabilityStatus,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/logistics/drivers/available
// Used by dispatch when assigning a ride.
router.get('/available', jwtRequired(false), async (req: AuthRequest, res: Response) => {
  try {
    const drivers = await Driver.find({ status: DriverStatus.AVAILABLE, isActive: true }).populate('userId', 'fullName phone');
    return res.json({ success: true, data: { drivers: drivers.map(formatDriver) } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/logistics/drivers/status
router.patch('/status', jwtRequired(false), async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;
    if (!Object.values(DriverStatus).includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    const driver = await Driver.findOneAndUpdate({ userId: req.userId }, { status }, { new: true }).populate('userId', 'fullName phone');
    if (!driver) {
      return res.status(404).json({ success: false, error: 'Rider profile not found' });
    }

    return res.json({ success: true, data: { driver: formatDriver(driver) } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/logistics/drivers/location
router.patch('/location', jwtRequired(false), async (req: AuthRequest, res: Response) => {
  try {
    const { lat, lng } = req.body;
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return res.status(400).json({ success: false, error: 'lat and lng must be numbers' });
    }

    const driver = await Driver.findOneAndUpdate(
      { userId: req.userId },
      { currentLocation: { lat, lng } },
      { new: true }
    );
    if (!driver) {
      return res.status(404).json({ success: false, error: 'Rider profile not found' });
    }

    return res.json({ success: true, data: { driver: formatDriver(driver) } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
