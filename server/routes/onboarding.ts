import express, { Response } from 'express';
import { User, Capability, CapabilityStatus } from '../models/User.js';
import { Provider } from '../models/Provider.js';
import { VendorProfile, StoreVisibility } from '../models/VendorProfile.js';
import { Driver, MobilityCapability } from '../models/logistics/Driver.js';
import { Vehicle, VehicleType, VehicleVerificationStatus } from '../models/logistics/Vehicle.js';
import { jwtRequired, AuthRequest } from '../middleware/auth.js';
import { validateSlugFormat, suggestSlugFromName } from '../lib/slugValidator.js';

const router = express.Router();

/**
 * Capability onboarding routes — three deliberate actions a user
 * takes to ACTIVATE a new marketplace capability. None of these are
 * available at registration: every new account is CUSTOMER-only and
 * must explicitly opt into becoming a vendor / service provider / rider.
 *
 * Onboarding is a TWO-STEP sequence:
 *   1. Create the business profile (VendorProfile / Provider / Driver + Vehicle)
 *   2. Flip capabilityStatus to ACTIVE (or PENDING_VERIFICATION for rider)
 *
 * The role isn't useful until BOTH steps complete — that's the
 * architecture decision in §18 of the merchant doc.
 */

// GET /api/onboarding/slug-suggest?name=Campus+Gadgets
// Helper for the frontend onboarding form — pre-fills the slug input
// from the business name the user typed, before they ever hit submit.
router.get('/slug-suggest', (req, res) => {
  const name = (req.query.name as string) || '';
  return res.json({ success: true, data: { slug: suggestSlugFromName(name) } });
});

/**
 * POST /api/onboarding/vendor
 * Body: { businessName, slug?, description?, category?, phone?, whatsapp?, city?, state? }
 *
 * Creates the VendorProfile, adds VENDOR to capabilities[], and sets
 * capabilityStatus.VENDOR = ACTIVE (auto-approved in preview — a real
 * deployment would set PENDING_VERIFICATION and require admin review).
 *
 * Slug is validated against the reserved-words list and uniqueness —
 * the frontend should also call /api/onboarding/slug-suggest and
 * /api/stores/check-slug before submit, but the backend is the
 * authority here.
 */
router.post('/vendor', jwtRequired(false), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { businessName, slug, description, category, phone, whatsapp, city, state } = req.body;

    if (!businessName) {
      return res.status(400).json({ success: false, error: 'businessName is required' });
    }

    const finalSlug = (slug || suggestSlugFromName(businessName)).toLowerCase();
    const slugCheck = validateSlugFormat(finalSlug);
    if (!slugCheck.valid) {
      return res.status(400).json({ success: false, error: slugCheck.reason });
    }

    const slugTaken = await VendorProfile.findOne({ slug: finalSlug });
    if (slugTaken) {
      return res.status(409).json({ success: false, error: `Slug '${finalSlug}' is already taken` });
    }

    // Replace existing profile if the user is re-onboarding (rare, but
    // possible if they abandoned midway through and want to retry).
    let profile = await VendorProfile.findOne({ userId: user._id });
    if (profile) {
      profile.businessName = businessName;
      profile.slug = finalSlug;
      if (description !== undefined) profile.description = description;
      if (category !== undefined) profile.category = category;
      if (phone !== undefined) profile.phone = phone;
      if (whatsapp !== undefined) profile.whatsapp = whatsapp;
      if (city !== undefined || state !== undefined) {
        profile.location = {
          ...(profile.location?.toObject?.() || profile.location || {}),
          ...(city ? { city } : {}),
          ...(state ? { state } : {}),
        };
      }
    } else {
      profile = new VendorProfile({
        userId: user._id,
        businessName,
        slug: finalSlug,
        description: description || '',
        category: category || null,
        phone: phone || null,
        whatsapp: whatsapp || null,
        location: {
          country: 'Nigeria',
          state: state || null,
          city: city || null,
          address: null,
        },
        storeVisibility: StoreVisibility.PRIVATE,
      });
    }
    await profile.save();

    if (!user.capabilities.includes(Capability.VENDOR)) {
      user.capabilities.push(Capability.VENDOR);
    }
    user.capabilityStatus = {
      ...(user.capabilityStatus || {}),
      [Capability.VENDOR]: CapabilityStatus.ACTIVE,
    };
    user.activeWorkspace = Capability.VENDOR;
    await user.save();

    return res.status(201).json({
      success: true,
      message: 'Vendor profile created! Add your first product to publish your store.',
      data: {
        vendor_profile: {
          id: profile._id.toString(),
          business_name: profile.businessName,
          slug: profile.slug,
          store_visibility: profile.storeVisibility,
        },
        capabilities: user.capabilities,
        capability_status: user.capabilityStatus,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/onboarding/service-provider
 * Body: { skills?, yearsExperience?, hourlyRate?, bio?, displayName? }
 *
 * Creates/updates the Provider profile and activates the
 * SERVICE_PROVIDER capability. Auto-approved in preview — real
 * deployments would set PENDING_VERIFICATION.
 */
router.post('/service-provider', jwtRequired(false), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { skills, yearsExperience, hourlyRate, bio, displayName, serviceRadiusKm } = req.body;

    let provider = await Provider.findOne({ userId: user._id });
    if (provider) {
      if (skills) provider.skills = skills;
      if (yearsExperience !== undefined) provider.yearsExperience = yearsExperience;
      if (hourlyRate !== undefined) provider.hourlyRate = hourlyRate;
      if (bio !== undefined) provider.bio = bio;
      if (displayName !== undefined) provider.displayName = displayName;
      if (serviceRadiusKm !== undefined) provider.serviceRadiusKm = serviceRadiusKm;
    } else {
      provider = new Provider({
        userId: user._id,
        skills: skills || [],
        yearsExperience: yearsExperience || 0,
        hourlyRate: hourlyRate || 3000,
        serviceRadiusKm: serviceRadiusKm || 10,
        bio: bio || '',
        displayName: displayName || user.fullName,
        verificationLevel: 'verified',
      });
    }
    await provider.save();

    if (!user.capabilities.includes(Capability.SERVICE_PROVIDER)) {
      user.capabilities.push(Capability.SERVICE_PROVIDER);
    }
    user.capabilityStatus = {
      ...(user.capabilityStatus || {}),
      [Capability.SERVICE_PROVIDER]: CapabilityStatus.ACTIVE,
    };
    user.activeWorkspace = Capability.SERVICE_PROVIDER;
    await user.save();

    return res.status(201).json({
      success: true,
      message: 'Service provider profile activated!',
      data: {
        provider_id: provider._id.toString(),
        capabilities: user.capabilities,
        capability_status: user.capabilityStatus,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/onboarding/rider
 * Body: {
 *   vehicleType, vehiclePlateNumber, vehicleMake, vehicleModel, vehicleYear?,
 *   licenseNumber, licenseDocumentUrl?, mobilityCapabilities?: ['DELIVERY','PASSENGER_RIDES']
 * }
 *
 * Creates the Vehicle record + Driver profile and sets
 * capabilityStatus.RIDER = PENDING_VERIFICATION. An admin must approve
 * via /api/admin/approve-capability before the rider can go online.
 *
 * This is intentionally the only onboarding route that does NOT
 * auto-activate the capability — a rider carrying passengers or
 * deliveries without verification is a regulatory + safety risk.
 */
router.post('/rider', jwtRequired(false), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const {
      vehicleType,
      vehiclePlateNumber,
      vehicleMake,
      vehicleModel,
      vehicleYear,
      licenseNumber,
      licenseDocumentUrl,
      mobilityCapabilities,
    } = req.body;

    if (!vehicleType || !vehiclePlateNumber || !licenseNumber || !vehicleMake || !vehicleModel) {
      return res.status(400).json({
        success: false,
        error: 'vehicleType, vehiclePlateNumber, vehicleMake, vehicleModel, and licenseNumber are required',
      });
    }

    // Normalize vehicle type — the existing Driver schema uses lowercase
    // (bike/keke/car/van), the new Vehicle schema uses uppercase
    // (MOTORCYCLE/TRICYCLE/CAR/VAN/BICYCLE). Accept both.
    const normalizedVt = String(vehicleType).toUpperCase();
    const driverVt = String(vehicleType).toLowerCase();
    const validVehicleTypes = new Set<string>([...Object.values(VehicleType), 'bike', 'keke', 'car', 'van']);
    if (!validVehicleTypes.has(driverVt) && !validVehicleTypes.has(normalizedVt)) {
      return res.status(400).json({ success: false, error: 'Invalid vehicleType' });
    }

    const existingDriver = await Driver.findOne({ userId: user._id });
    if (existingDriver) {
      return res.status(400).json({ success: false, error: 'Rider profile already exists for this user' });
    }

    // Create the Vehicle record (verificationStatus: PENDING)
    const vehicle = await Vehicle.create({
      ownerId: user._id,
      type: normalizedVt as VehicleType,
      make: vehicleMake,
      vehicleModel: vehicleModel,
      year: vehicleYear || null,
      plateNumber: vehiclePlateNumber,
      verificationStatus: VehicleVerificationStatus.PENDING,
      documents: licenseDocumentUrl ? [licenseDocumentUrl] : [],
    });

    // Create the Driver (RiderProfile) record
    const driver = await Driver.create({
      userId: user._id,
      vehicleType: driverVt as any,
      vehiclePlateNumber,
      licenseNumber,
      licenseDocumentUrl: licenseDocumentUrl || null,
      licenseVerified: false,
      mobilityCapabilities: mobilityCapabilities && mobilityCapabilities.length
        ? mobilityCapabilities
        : [MobilityCapability.DELIVERY],
      approvedVehicleIds: [vehicle._id],
    });

    // Add RIDER capability in PENDING_VERIFICATION state — admin must approve.
    if (!user.capabilities.includes(Capability.RIDER)) {
      user.capabilities.push(Capability.RIDER);
    }
    user.capabilityStatus = {
      ...(user.capabilityStatus || {}),
      [Capability.RIDER]: CapabilityStatus.PENDING_VERIFICATION,
    };
    user.activeWorkspace = Capability.RIDER;
    await user.save();

    return res.status(201).json({
      success: true,
      message: 'Rider application submitted. We will review your license and vehicle before activating your rider capability.',
      data: {
        driver_id: driver._id.toString(),
        vehicle_id: vehicle._id.toString(),
        capabilities: user.capabilities,
        capability_status: user.capabilityStatus,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
