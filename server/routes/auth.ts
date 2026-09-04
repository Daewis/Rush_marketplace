import express, { Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { User, Capability, CapabilityStatus, SystemRole, IUser } from '../models/User.js';
import { Provider } from '../models/Provider.js';
import { VendorProfile } from '../models/VendorProfile.js';
import { jwtRequired, AuthRequest } from '../middleware/auth.js';
import { NotificationService } from '../services/notificationService.js';
import { verifyFirebaseIdToken } from '../lib/firebaseAdmin.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'rush_merchant_jwt_secret_key_2026';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'rush_merchant_refresh_secret_key_2026';

function generateTokens(userId: string) {
  const access_token = jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: '7d' });
  const refresh_token = jwt.sign({ sub: userId }, JWT_REFRESH_SECRET, { expiresIn: '30d' });
  return { access_token, refresh_token };
}

/**
 * Canonical user shape returned by every auth endpoint. Frontend types
 * (src/types/index.ts) must mirror this. Keeping it in one place so we
 * never ship a partial user object that forgets capabilityStatus.
 */
function publicUser(user: IUser) {
  return {
    id: user._id.toString(),
    email: user.email,
    phone: user.phone,
    full_name: user.fullName,
    profile_picture: user.profilePicture,
    is_verified: user.isVerified,
    is_active: user.isActive,
    capabilities: user.capabilities,
    system_roles: user.systemRoles,
    capability_status: user.capabilityStatus || {},
    active_workspace: user.activeWorkspace,
    campus_hub: user.campusHub || null,
    campusHub: user.campusHub || null,
  };
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, phone, password, full_name, campus_hub, campusHub } = req.body;

    if (!email || !phone || !password || !full_name) {
      return res.status(400).json({ success: false, error: 'Missing required fields: email, phone, password, full_name' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();

    const existingUser = await User.findOne({ $or: [{ email: cleanEmail }, { phone: cleanPhone }] });
    if (existingUser) {
      return res.status(409).json({ success: false, error: 'User with this email or phone already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    const chosenHub = (campus_hub || campusHub || '').trim() || null;

    // HARD CUTOVER: every new account starts as CUSTOMER only. Adding
    // VENDOR / SERVICE_PROVIDER / RIDER happens via the onboarding
    // routes (/api/onboarding/*) — not at registration. This matches
    // the architecture decision: "Customer should be the default
    // capability" (merchant doc §3).
    const user = await User.create({
      email: cleanEmail,
      phone: cleanPhone,
      passwordHash,
      fullName: full_name.trim(),
      capabilities: [Capability.CUSTOMER],
      systemRoles: [],
      capabilityStatus: {},
      activeWorkspace: Capability.CUSTOMER,
      campusHub: chosenHub,
      isVerified: true, // auto-verify in preview for effortless onboarding
      verificationCode: otpCode,
      verificationSentAt: new Date(),
    });

    const tokens = generateTokens(user._id.toString());
    await NotificationService.sendVerificationEmail(user.email, otpCode);

    return res.status(201).json({
      success: true,
      message: 'Registration successful!',
      data: { user: publicUser(user), ...tokens },
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password required' });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, error: 'Account is deactivated' });
    }

    user.lastLogin = new Date();
    await user.save();

    const tokens = generateTokens(user._id.toString());
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: { user: publicUser(user), ...tokens },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Login failed' });
  }
});

// POST /api/auth/firebase-session
// The bridge: frontend signs in via Firebase (email/password or Google),
// gets a Firebase ID token, and exchanges it here for OUR backend JWT.
// Every real API route checks OUR JWT — Firebase's own token is never
// sent to those routes.
//
// IMPORTANT: this route NEVER overwrites capabilities on an existing
// user. Capability activation only happens through an explicit action
// (vendor/provider/rider onboarding) — never as a side effect of login.
router.post('/firebase-session', async (req, res) => {
  try {
    const { id_token, full_name, phone, campus_hub, campusHub } = req.body;
    if (!id_token) {
      return res.status(400).json({ success: false, error: 'id_token is required' });
    }

    let firebaseUser;
    try {
      firebaseUser = await verifyFirebaseIdToken(id_token);
    } catch (err: any) {
      console.error('Firebase token verification failed:', err.message);
      return res.status(401).json({ success: false, error: 'Invalid or expired Firebase token' });
    }

    if (!firebaseUser.email) {
      return res.status(400).json({ success: false, error: 'Firebase account has no email on file' });
    }

    const cleanEmail = firebaseUser.email.trim().toLowerCase();

    let user = await User.findOne({ firebaseUid: firebaseUser.uid });
    if (!user) {
      user = await User.findOne({ email: cleanEmail });
    }

    const chosenHub = (campus_hub || campusHub || '').trim() || null;

    if (!user) {
      // First time we've seen this Firebase user — create the Mongo
      // record. CUSTOMER-only — they can onboard into other
      // capabilities later via /api/onboarding/*.
      const randomPassword = crypto.randomBytes(24).toString('hex');
      const passwordHash = await bcrypt.hash(randomPassword, 10);
      const placeholderPhone = phone || firebaseUser.phoneNumber || `pending-${firebaseUser.uid}`;

      user = await User.create({
        email: cleanEmail,
        phone: placeholderPhone,
        passwordHash,
        fullName: full_name || firebaseUser.name || cleanEmail.split('@')[0],
        capabilities: [Capability.CUSTOMER],
        systemRoles: [],
        capabilityStatus: {},
        activeWorkspace: Capability.CUSTOMER,
        campusHub: chosenHub,
        isVerified: firebaseUser.emailVerified,
        firebaseUid: firebaseUser.uid,
        profilePicture: firebaseUser.picture || null,
      });
    } else {
      let modified = false;
      if (!user.firebaseUid) {
        user.firebaseUid = firebaseUser.uid;
        modified = true;
      }
      if (chosenHub && !user.campusHub) {
        user.campusHub = chosenHub;
        modified = true;
      }
      if (modified) {
        await user.save();
      }
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, error: 'Account is deactivated' });
    }

    user.lastLogin = new Date();
    await user.save();

    const tokens = generateTokens(user._id.toString());
    return res.status(200).json({
      success: true,
      message: 'Session established',
      data: { user: publicUser(user), ...tokens },
    });
  } catch (error: any) {
    console.error('Firebase session bridge error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to establish session' });
  }
});

/**
 * POST /api/auth/switch-workspace
 *
 * Replaces the old /switch-role endpoint. Lets a user flip their
 * ACTIVE WORKSPACE between capabilities they hold (CUSTOMER / VENDOR /
 * SERVICE_PROVIDER / RIDER). Pure UI hint — does NOT grant a new
 * capability and does NOT affect authorization. A user who hasn't
 * onboarded as a vendor cannot switch to the vendor workspace; they
 * must complete /api/onboarding/vendor first.
 */
router.post('/switch-workspace', jwtRequired(false), async (req: AuthRequest, res: Response) => {
  try {
    const { workspace } = req.body;
    if (!workspace || !Object.values(Capability).includes(workspace as Capability)) {
      return res.status(400).json({ success: false, error: 'A valid workspace is required' });
    }

    const cap = workspace as Capability;
    const user = req.user!;

    // CUSTOMER is implicit — every account has it. The other three
    // require both presence in capabilities[] AND an ACTIVE status.
    if (cap !== Capability.CUSTOMER) {
      if (!user.capabilities.includes(cap)) {
        return res.status(403).json({
          success: false,
          error: `You haven't onboarded as ${cap} yet. Complete the onboarding flow first.`,
        });
      }
      if (user.capabilityStatus?.[cap] !== CapabilityStatus.ACTIVE) {
        return res.status(403).json({
          success: false,
          error: `Your ${cap} capability is ${user.capabilityStatus?.[cap] || 'not set'} — cannot switch to that workspace yet.`,
        });
      }
    }

    user.activeWorkspace = cap;
    await user.save();

    return res.json({
      success: true,
      message: `Switched to ${cap.toLowerCase()} workspace`,
      data: { user: publicUser(user) },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || 'Could not switch workspace' });
  }
});

// GET /api/auth/me
router.get('/me', jwtRequired(false), async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  return res.json({ success: true, data: { user: publicUser(req.user) } });
});

// POST /api/auth/verify
router.post('/verify', async (req, res) => {
  const { email } = req.body;
  if (email) {
    await User.updateOne({ email: email.trim().toLowerCase() }, { isVerified: true });
  }
  return res.json({ success: true, message: 'Account verified successfully' });
});

// POST /api/auth/resend-verification
router.post('/resend-verification', async (req, res) => {
  return res.json({ success: true, message: 'Verification code resent successfully' });
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  const { refresh_token } = req.body;
  if (!refresh_token) {
    return res.status(400).json({ success: false, error: 'Refresh token required' });
  }
  try {
    const decoded = jwt.verify(refresh_token, JWT_REFRESH_SECRET) as { sub: string };

    const user = await User.findById(decoded.sub);
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, error: 'User not found or deactivated' });
    }

    const tokens = generateTokens(decoded.sub);
    return res.json({ success: true, access_token: tokens.access_token, data: { access_token: tokens.access_token } });
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Invalid refresh token' });
  }
});

// POST /api/auth/logout
router.post('/logout', jwtRequired(true), (req, res) => {
  return res.json({ success: true, message: 'Logged out successfully' });
});

export default router;
