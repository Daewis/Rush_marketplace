import { Response, NextFunction } from 'express';
import { Capability, CapabilityStatus } from '../models/User.js';
import { AuthRequest } from './auth.js';

/**
 * Generic capability guard. Pass one or more capabilities that are
 * allowed through. A capability only counts as "held" if it appears in
 * `user.capabilities[]` AND its entry in `user.capabilityStatus{}` is
 * `ACTIVE` — the `hasCapability()` method on the IUser model handles
 * both checks in one go.
 *
 * Usage:
 *   router.post('/products', jwtRequired(false), requireCapability(Capability.VENDOR), handler)
 *   router.post('/dispatch', jwtRequired(false), requireCapability(Capability.RIDER, Capability.DISPATCHER via systemRoles), handler)
 *
 * For SYSTEM roles (ADMIN/DISPATCHER/SUPPORT), use requireSystemRole()
 * — those live in a separate array and aren't gated by verification.
 */
export const requireCapability = (...allowed: Capability[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    const ok = allowed.some((cap) => req.user!.hasCapability(cap));
    if (!ok) {
      return res.status(403).json({
        success: false,
        error: `Access restricted to capabilities: ${allowed.join(', ')}`,
      });
    }
    next();
  };
};

/**
 * System-role guard — for ADMIN/DISPATCHER/SUPPORT. These don't go
 * through capabilityStatus (no onboarding/verification), they're just
 * attached to the user by another admin.
 */
export const requireSystemRole = (...allowed: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    const ok = allowed.some((r) => req.user!.systemRoles.includes(r as any));
    if (!ok) {
      return res.status(403).json({
        success: false,
        error: `Access restricted to system roles: ${allowed.join(', ')}`,
      });
    }
    next();
  };
};

// Convenience exports matching the naming style of the auth.ts guards.
export const vendorRequired = requireCapability(Capability.VENDOR);
export const serviceProviderRequired = requireCapability(Capability.SERVICE_PROVIDER);
export const riderRequired = requireCapability(Capability.RIDER);

// DISPATCHER + ADMIN can both access dispatch endpoints (a dispatcher
// assigns drivers, an admin can also step in).
export const dispatcherRequired = requireSystemRole('DISPATCHER', 'ADMIN');

// Re-export from auth.ts for backward compat with existing imports
// (drivers.ts imports `driverRequired` from this file).
export { adminRequired } from './auth.js';
