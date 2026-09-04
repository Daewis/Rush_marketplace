import express from 'express';
import { User, Capability, CapabilityStatus } from '../models/User.js';
import { Job } from '../models/Job.js';
import { Payment } from '../models/Payment.js';
import { Provider } from '../models/Provider.js';
import { VendorProfile } from '../models/VendorProfile.js';
import { Driver } from '../models/logistics/Driver.js';
import { Vehicle, VehicleVerificationStatus } from '../models/logistics/Vehicle.js';
import { Violation } from '../models/Violation.js';
import { adminRequired, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// All admin routes require ADMIN system role
router.use(adminRequired);

// GET /api/admin/metrics
router.get('/metrics', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalProviders = await Provider.countDocuments();
    const totalVendors = await VendorProfile.countDocuments();
    const totalRiders = await Driver.countDocuments();
    const totalJobs = await Job.countDocuments();
    const activeDisputes = await Violation.countDocuments({ status: 'pending_review' });

    const totalRevenueAgg = await Payment.aggregate([
      { $match: { status: 'released' } },
      { $group: { _id: null, total: { $sum: '$platformFee' } } },
    ]);

    // Capability breakdown — how many users hold each capability,
    // how many have it ACTIVE vs PENDING_VERIFICATION. Powers the
    // admin dashboard's "verification queue" view.
    const capabilityBreakdown = await User.aggregate([
      { $unwind: '$capabilities' },
      { $group: { _id: '$capabilities', count: { $sum: 1 } } },
    ]);
    const pendingVerifications = await User.countDocuments({
      $or: [
        { 'capabilityStatus.VENDOR': CapabilityStatus.PENDING_VERIFICATION },
        { 'capabilityStatus.SERVICE_PROVIDER': CapabilityStatus.PENDING_VERIFICATION },
        { 'capabilityStatus.RIDER': CapabilityStatus.PENDING_VERIFICATION },
      ],
    });

    return res.json({
      success: true,
      data: {
        total_users: totalUsers || 0,
        total_providers: totalProviders || 0,
        total_vendors: totalVendors || 0,
        total_riders: totalRiders || 0,
        total_jobs: totalJobs || 0,
        active_disputes: activeDisputes || 0,
        total_platform_revenue: totalRevenueAgg[0]?.total || 0,
        platform_escrow_held: 0,
        pending_verifications: pendingVerifications,
        capability_breakdown: capabilityBreakdown,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/logs
router.get('/logs', async (req, res) => {
  return res.json({
    success: true,
    data: [
      { id: '1', action: 'job_posted', user: 'Chidi Okonkwo', timestamp: new Date().toISOString() },
      { id: '2', action: 'escrow_funded', user: 'Chidi Okonkwo', timestamp: new Date().toISOString() },
      { id: '3', action: 'provider_checked_in', user: 'Emeka Nwosu', timestamp: new Date().toISOString() },
    ],
  });
});

/**
 * GET /api/admin/verification-queue
 *
 * Lists every user with a capability in PENDING_VERIFICATION state,
 * with enriched driver vehicle details, provider skills, or vendor store info.
 * Powers the admin "Verification Queue" UI — one unified screen for driver,
 * service provider, AND vendor approvals.
 */
router.get('/verification-queue', async (req, res) => {
  try {
    const queue = await User.find({
      $or: [
        { 'capabilityStatus.VENDOR': CapabilityStatus.PENDING_VERIFICATION },
        { 'capabilityStatus.SERVICE_PROVIDER': CapabilityStatus.PENDING_VERIFICATION },
        { 'capabilityStatus.RIDER': CapabilityStatus.PENDING_VERIFICATION },
      ],
    }).select('fullName email phone capabilities capabilityStatus activeWorkspace createdAt');

    const formatted = await Promise.all(queue.map(async (u: any) => {
      const pending: string[] = [];
      if (u.capabilityStatus?.VENDOR === CapabilityStatus.PENDING_VERIFICATION) pending.push('VENDOR');
      if (u.capabilityStatus?.SERVICE_PROVIDER === CapabilityStatus.PENDING_VERIFICATION) pending.push('SERVICE_PROVIDER');
      if (u.capabilityStatus?.RIDER === CapabilityStatus.PENDING_VERIFICATION) pending.push('RIDER');

      let riderDetails: any = null;
      let providerDetails: any = null;
      let vendorDetails: any = null;

      if (pending.includes('RIDER')) {
        const [driverDoc, vehicles] = await Promise.all([
          Driver.findOne({ userId: u._id }),
          Vehicle.find({ ownerId: u._id }),
        ]);
        riderDetails = {
          vehicle_type: driverDoc?.vehicleType || vehicles[0]?.type || 'MOTORCYCLE',
          plate_number: driverDoc?.vehiclePlateNumber || vehicles[0]?.plateNumber || 'N/A',
          license_number: driverDoc?.licenseNumber || 'N/A',
          license_verified: driverDoc?.licenseVerified || false,
          mobility_capabilities: driverDoc?.mobilityCapabilities || ['DELIVERY'],
          vehicles: vehicles.map((v) => ({
            id: v._id.toString(),
            make: v.make,
            model: v.model,
            plate_number: v.plateNumber,
            type: v.type,
            status: v.verificationStatus,
          })),
        };
      }

      if (pending.includes('SERVICE_PROVIDER')) {
        const providerDoc = await Provider.findOne({ userId: u._id });
        if (providerDoc) {
          providerDetails = {
            category: providerDoc.category,
            skills: providerDoc.skills,
            hourly_rate: providerDoc.hourlyRate,
            bio: providerDoc.bio,
          };
        }
      }

      if (pending.includes('VENDOR')) {
        const vendorDoc = await VendorProfile.findOne({ userId: u._id });
        if (vendorDoc) {
          vendorDetails = {
            business_name: vendorDoc.businessName,
            slug: vendorDoc.slug,
            category: vendorDoc.category,
            phone: vendorDoc.phone,
            city: vendorDoc.location?.city,
          };
        }
      }

      return {
        id: u._id.toString(),
        full_name: u.fullName,
        email: u.email,
        phone: u.phone,
        created_at: u.createdAt,
        pending_capabilities: pending,
        capability_status: u.capabilityStatus,
        rider_details: riderDetails,
        provider_details: providerDetails,
        vendor_details: vendorDetails,
      };
    }));

    return res.json({ success: true, data: { queue: formatted } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/drivers
// Complete fleet overview for Admin & Logistics governance
router.get('/drivers', async (req, res) => {
  try {
    const drivers = await Driver.find().populate('userId', 'fullName email phone');
    const driverList = await Promise.all(drivers.map(async (d: any) => {
      const vehicles = await Vehicle.find({ ownerId: d.userId?._id });
      return {
        id: d._id.toString(),
        user_id: d.userId?._id?.toString(),
        full_name: d.userId?.fullName || 'Rider',
        email: d.userId?.email || '',
        phone: d.userId?.phone || '',
        vehicle_type: d.vehicleType,
        vehicle_plate_number: d.vehiclePlateNumber,
        license_verified: d.licenseVerified,
        status: d.status,
        rating: d.rating,
        total_trips: d.totalTrips,
        current_location: d.currentLocation,
        mobility_capabilities: d.mobilityCapabilities,
        vehicles: vehicles.map((v) => ({
          id: v._id.toString(),
          type: v.type,
          make: v.make,
          model: v.model,
          plate: v.plateNumber,
          status: v.verificationStatus,
        })),
      };
    }));

    return res.json({ success: true, data: { drivers: driverList } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/logistics/rides
// All dispatch rides and delivery requests for logistics administration
router.get('/logistics/rides', async (req, res) => {
  try {
    const rides = await Ride.find()
      .populate('customerId', 'fullName phone')
      .populate('driverId', 'fullName phone')
      .sort({ createdAt: -1 })
      .limit(100);

    return res.json({
      success: true,
      data: {
        rides: rides.map((r: any) => ({
          id: r._id.toString(),
          customer_name: r.customerId?.fullName || 'Customer',
          customer_phone: r.customerId?.phone,
          driver_name: r.driverId?.fullName || null,
          driver_phone: r.driverId?.phone || null,
          pickup: r.pickup,
          dropoff: r.dropoff,
          item_type: r.itemType,
          status: r.status,
          fare: r.fare,
          tracking_code: r.trackingCode,
          created_at: r.createdAt,
          picked_up_at: r.pickedUpAt,
          completed_at: r.completedAt,
        })),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/vendors
// All registered vendor stores and inventory overview
router.get('/vendors', async (req, res) => {
  try {
    const vendors = await VendorProfile.find().populate('userId', 'fullName email phone');
    return res.json({
      success: true,
      data: {
        vendors: vendors.map((v: any) => ({
          id: v._id.toString(),
          user_id: v.userId?._id?.toString(),
          owner_name: v.userId?.fullName || 'Merchant',
          owner_email: v.userId?.email,
          business_name: v.businessName,
          slug: v.slug,
          category: v.category,
          store_visibility: v.storeVisibility,
          rating: v.rating,
          phone: v.phone,
          whatsapp: v.whatsapp,
          location: v.location,
          created_at: v.createdAt,
        })),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/admin/approve-capability
 *
 * Approves (or rejects) a capability for a user. Sets the
 * capabilityStatus to ACTIVE (or REJECTED), so the user can now
 * switch into that workspace via /api/auth/switch-workspace.
 *
 * For RIDER approvals, also marks the linked Vehicle record as
 * APPROVED and flips Driver.licenseVerified = true.
 */
router.post('/approve-capability', async (req: AuthRequest, res) => {
  try {
    const { userId, capability, action } = req.body;
    if (!userId || !capability) {
      return res.status(400).json({ success: false, error: 'userId and capability are required' });
    }
    if (!Object.values(Capability).includes(capability) || capability === Capability.CUSTOMER) {
      return res.status(400).json({ success: false, error: 'Invalid capability' });
    }
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, error: 'action must be "approve" or "reject"' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    if (!user.capabilities.includes(capability)) {
      return res.status(400).json({ success: false, error: 'User does not hold this capability' });
    }

    user.capabilityStatus = {
      ...(user.capabilityStatus || {}),
      [capability]: action === 'approve' ? CapabilityStatus.ACTIVE : CapabilityStatus.REJECTED,
    };
    await user.save();

    // For RIDER approvals, also mark the vehicle + license as verified.
    if (capability === Capability.RIDER && action === 'approve') {
      await Driver.findOneAndUpdate(
        { userId: user._id },
        { licenseVerified: true }
      );
      await Vehicle.updateMany(
        { ownerId: user._id, verificationStatus: VehicleVerificationStatus.PENDING },
        { verificationStatus: VehicleVerificationStatus.APPROVED }
      );
    }

    return res.json({
      success: true,
      message: `${capability} capability ${action === 'approve' ? 'approved' : 'rejected'} for ${user.fullName}`,
      data: {
        user_id: user._id.toString(),
        capability,
        new_status: user.capabilityStatus[capability as keyof typeof user.capabilityStatus],
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
