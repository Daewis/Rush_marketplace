import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser, Capability, CapabilityStatus, SystemRole } from '../models/User.js';

export interface AuthRequest extends Request {
  user?: IUser;
  userId?: string;
}

const JWT_SECRET = process.env.JWT_SECRET || 'rush_merchant_jwt_secret_key_2026';

export const jwtRequired = (isOptional = true) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        if (isOptional) {
          return next();
        }
        return res.status(401).json({ success: false, error: 'Unauthorized: Missing or invalid token' });
      }

      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as { sub: string };
        const user = await User.findById(decoded.sub);
        if (user && user.isActive) {
          req.user = user;
          req.userId = user._id.toString();
        }
      } catch (tokenErr) {
        if (!isOptional) {
          return res.status(401).json({ success: false, error: 'Unauthorized: Invalid token' });
        }
      }

      if (!req.user && !isOptional) {
        return res.status(401).json({ success: false, error: 'Unauthorized: User not found or deactivated' });
      }

      next();
    } catch (error) {
      if (isOptional) {
        return next();
      }
      return res.status(401).json({ success: false, error: 'Unauthorized: Auth processing error' });
    }
  };
};

/**
 * Any authenticated user. CUSTOMER is implicit on every account, so this
 * is the only check that "is this person logged in?" — capability gates
 * below (requireCapability) layer on top of this.
 */
export const customerRequired = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  next();
};

/**
 * Convenience guards for the most common capability checks. All delegate
 * to `requireCapability()` so the "capability + ACTIVE status" rule lives
 * in exactly one place — middleware/role-check.ts.
 */
export const providerRequired = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  if (!req.user.hasCapability(Capability.SERVICE_PROVIDER)) {
    return res.status(403).json({
      success: false,
      error: 'Active service-provider capability required',
    });
  }
  next();
};

export const vendorRequired = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  if (!req.user.hasCapability(Capability.VENDOR)) {
    return res.status(403).json({
      success: false,
      error: 'Active vendor capability required',
    });
  }
  next();
};

export const riderRequired = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  if (!req.user.hasCapability(Capability.RIDER)) {
    return res.status(403).json({
      success: false,
      error: 'Active rider capability required (license + vehicle verification pending)',
    });
  }
  next();
};

export const adminRequired = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  if (!req.user.systemRoles.includes(SystemRole.ADMIN)) {
    return res.status(403).json({ success: false, error: 'Admin privileges required' });
  }
  next();
};
