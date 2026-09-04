import express, { Response } from 'express';
import { Provider } from '../models/Provider.js';
import { Capability, CapabilityStatus } from '../models/User.js';
import { jwtRequired, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// GET /api/providers
router.get('/', async (req, res) => {
  try {
    const { skill, search } = req.query;
    const filter: any = {};

    if (skill) {
      filter.skills = skill;
    }

    const providers: any[] = await Provider.find(filter).populate('userId', 'fullName email phone profilePicture isVerified');

    const validProviders = providers.filter((p) => p.userId != null);

    const formatted = validProviders.map((p) => ({
      id: p._id.toString(),
      user_id: p.userId?._id?.toString() || null,
      full_name: p.userId?.fullName || 'Campus Artisan',
      email: p.userId?.email || '',
      phone: p.userId?.phone || '',
      profile_picture: p.userId?.profilePicture || null,
      skills: p.skills || [],
      years_experience: p.yearsExperience || 0,
      hourly_rate: p.hourlyRate || 3500,
      rating: p.rating || 4.9,
      total_jobs_completed: p.totalJobsCompleted || 0,
      compliance_score: p.complianceScore || 100,
      is_available: p.isAvailable,
      verification_level: p.verificationLevel || 'nin_bvn_verified',
      store_theme: p.storeTheme || 'orange',
    }));

    return res.json({ success: true, data: { providers: formatted } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/providers/me
router.get('/me', jwtRequired(false), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;

    let provider = await Provider.findOne({ userId: user._id });
    if (!provider) {
      provider = await Provider.create({ userId: user._id, skills: ['electrical'] });
    }

    return res.json({
      success: true,
      data: {
        provider: {
          id: provider._id.toString(),
          skills: provider.skills,
          hourly_rate: provider.hourlyRate,
          rating: provider.rating,
          compliance_score: provider.complianceScore,
          total_earnings: provider.totalEarnings,
          total_jobs_completed: provider.totalJobsCompleted,
          is_available: provider.isAvailable,
          is_on_duty: provider.isOnDuty,
        },
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/providers/register
 *
 * Legacy entrypoint for service-provider onboarding. Still here for
 * backward compat with the existing frontend (ArtisanOnboardingModal
 * calls this). For new integrations prefer
 * /api/onboarding/service-provider.
 *
 * Action: adds SERVICE_PROVIDER to capabilities[] if missing, sets
 * capabilityStatus.SERVICE_PROVIDER = ACTIVE (auto-verify in preview),
 * creates the Provider profile if it doesn't exist, and flips
 * activeWorkspace to SERVICE_PROVIDER.
 */
router.post('/register', jwtRequired(false), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;

    if (!user.capabilities.includes(Capability.SERVICE_PROVIDER)) {
      user.capabilities.push(Capability.SERVICE_PROVIDER);
    }
    user.capabilityStatus = {
      ...(user.capabilityStatus || {}),
      [Capability.SERVICE_PROVIDER]: CapabilityStatus.ACTIVE,
    };
    user.activeWorkspace = Capability.SERVICE_PROVIDER;
    if (req.body.nin) user.nin = req.body.nin;
    if (req.body.bvn) user.bvn = req.body.bvn;
    await user.save();

    const { skills, years_experience, hourly_rate } = req.body;
    let provider = await Provider.findOne({ userId: user._id });
    if (!provider) {
      provider = await Provider.create({
        userId: user._id,
        skills: skills || ['electrical'],
        yearsExperience: years_experience || 2,
        hourlyRate: hourly_rate || 3000,
        verificationLevel: 'verified',
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Service provider registration completed successfully!',
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

// GET /api/providers/:id
router.get('/:id', async (req, res) => {
  try {
    const provider: any = await Provider.findById(req.params.id).populate('userId', 'fullName email phone profilePicture');
    if (!provider) return res.status(404).json({ success: false, error: 'Provider not found' });

    return res.json({
      success: true,
      data: {
        provider: {
          id: provider._id.toString(),
          full_name: provider.userId?.fullName || 'Campus Artisan',
          skills: provider.skills,
          rating: provider.rating,
          hourly_rate: provider.hourlyRate,
          compliance_score: provider.complianceScore,
          total_jobs_completed: provider.totalJobsCompleted,
        },
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
