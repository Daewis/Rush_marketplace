import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  ChevronDown,
  User as UserIcon,
  Store,
  Wrench,
  Bike,
  PlusCircle,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Capability } from '@/types';

/**
 * Workspace switcher — the multi-capability equivalent of the old
 * single-role RoleSwitcher. Renders every marketplace capability the
 * user could hold, with their current verification status:
 *
 *   ✓ active        — capability is ACTIVE, click to switch workspace
 *   ⏳ pending      — application submitted, awaiting admin approval
 *   + activate      — capability not held, click to start onboarding
 *
 * CUSTOMER is always active (it's implicit on every account) and has
 * no onboarding flow. ADMIN/DISPATCHER/SUPPORT are excluded — those
 * are system roles assigned internally, not self-activated.
 */

interface WorkspaceMeta {
  cap: Capability;
  label: string;
  icon: React.ReactNode;
}

const WORKSPACES: WorkspaceMeta[] = [
  { cap: 'CUSTOMER', label: 'Customer', icon: <UserIcon className="w-4 h-4" /> },
  { cap: 'VENDOR', label: 'Vendor', icon: <Store className="w-4 h-4" /> },
  { cap: 'SERVICE_PROVIDER', label: 'Service Provider', icon: <Wrench className="w-4 h-4" /> },
  { cap: 'RIDER', label: 'Rider', icon: <Bike className="w-4 h-4" /> },
];

// Map from legacy role string -> Capability, for the switchRole call.
// The useAuth.switchRole handler uppercases the role string and posts
// to /api/auth/switch-workspace with workspace=... so it works for
// any of these.
const ROLE_TO_CAPABILITY: Record<string, string> = {
  customer: 'CUSTOMER',
  vendor: 'VENDOR',
  artisan: 'SERVICE_PROVIDER',
  service_provider: 'SERVICE_PROVIDER',
  provider: 'SERVICE_PROVIDER',
  rider: 'RIDER',
  driver: 'RIDER',
};

interface RoleSwitcherProps {
  // Called when the user wants to ACTIVATE a capability they don't hold
  // yet. Parent (Header/App) decides what that means — usually opening
  // the matching onboarding modal. If omitted, falls back to a toast.
  onActivateCapability?: (cap: Capability) => void;
}

export const RoleSwitcher: React.FC<RoleSwitcherProps> = ({ onActivateCapability }) => {
  const { user, switchRole } = useAuth();
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  const currentUser = user as any;
  const capabilities: Capability[] = currentUser?.capabilities || ['CUSTOMER'];
  const capabilityStatus = currentUser?.capability_status || {};
  const activeWorkspace: Capability = currentUser?.active_workspace || 'CUSTOMER';

  // Build the list of workspaces the user can switch into (active)
  // and ones they can activate (not held yet, or held-but-pending).
  const switchable: WorkspaceMeta[] = [];
  const activatable: WorkspaceMeta[] = [];
  const pending: { meta: WorkspaceMeta; status: string }[] = [];

  for (const ws of WORKSPACES) {
    if (!capabilities.includes(ws.cap)) {
      // Not held at all — available to onboard.
      activatable.push(ws);
    } else if (ws.cap === 'CUSTOMER') {
      // CUSTOMER is always implicitly active.
      switchable.push(ws);
    } else {
      const status = capabilityStatus[ws.cap];
      if (status === 'ACTIVE') {
        switchable.push(ws);
      } else if (status === 'PENDING_VERIFICATION') {
        pending.push({ meta: ws, status });
      } else if (status === 'DRAFT' || status === 'REJECTED' || status === 'SUSPENDED') {
        // Held but not active — show as activatable so they can retry
        // the onboarding flow if their application was rejected.
        activatable.push(ws);
      } else {
        // Status not set but capability is in the list — treat as
        // activatable so the user can complete onboarding.
        activatable.push(ws);
      }
    }
  }

  // Nothing to switch AND nothing to activate AND CUSTOMER only — hide.
  if (switchable.length <= 1 && activatable.length === 0 && pending.length === 0) {
    return null;
  }

  const handleSwitch = async (cap: Capability) => {
    if (cap === activeWorkspace) {
      setOpen(false);
      return;
    }
    setSwitching(true);
    const roleString = cap.toLowerCase();
    await switchRole(roleString);
    setSwitching(false);
    setOpen(false);
  };

  const handleActivate = (cap: Capability) => {
    setOpen(false);
    if (onActivateCapability) {
      onActivateCapability(cap);
    } else {
      toast.info(`Complete ${cap.toLowerCase()} onboarding to activate this capability.`);
    }
  };

  const activeMeta = WORKSPACES.find((w) => w.cap === activeWorkspace) || WORKSPACES[0];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={switching}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 bg-white text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
      >
        {activeMeta.icon}
        <span>{activeMeta.label}</span>
        {switchable.length > 1 && (
          <span className="text-[10px] bg-gray-100 rounded-full px-1.5 py-0.5 font-semibold">
            {switchable.length}
          </span>
        )}
        <ChevronDown className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 rounded-lg border border-gray-200 bg-white shadow-lg z-50 overflow-hidden">
          {switchable.length > 0 && (
            <>
              <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
                Active workspaces
              </div>
              {switchable.map((ws) => {
                const isActive = ws.cap === activeWorkspace;
                return (
                  <button
                    key={ws.cap}
                    onClick={() => handleSwitch(ws.cap)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50 ${
                      isActive ? 'bg-orange-50 text-orange-600 font-medium' : 'text-gray-700'
                    }`}
                  >
                    {ws.icon}
                    {ws.label}
                    {isActive && <CheckCircle2 className="ml-auto w-3.5 h-3.5" />}
                  </button>
                );
              })}
            </>
          )}

          {pending.length > 0 && (
            <>
              <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wide text-amber-500 font-semibold border-t border-gray-100 mt-1">
                Pending verification
              </div>
              {pending.map(({ meta, status }) => (
                <div
                  key={meta.cap}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-gray-500 bg-amber-50/50"
                >
                  {meta.icon}
                  <div className="flex-1">
                    <div className="font-medium">{meta.label}</div>
                    <div className="text-[10px] text-amber-600">
                      {status === 'PENDING_VERIFICATION' && 'Awaiting admin approval'}
                      {status === 'SUSPENDED' && 'Suspended — contact support'}
                      {status === 'REJECTED' && 'Application rejected — click to retry'}
                    </div>
                  </div>
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                </div>
              ))}
            </>
          )}

          {activatable.length > 0 && (
            <>
              <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wide text-gray-400 font-semibold border-t border-gray-100 mt-1">
                Become a…
              </div>
              {activatable.map((ws) => (
                <button
                  key={ws.cap}
                  onClick={() => handleActivate(ws.cap)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                >
                  <PlusCircle className="w-4 h-4" />
                  {ws.label}
                </button>
              ))}
            </>
          )}

          <div className="px-3 py-2 border-t border-gray-100 mt-1 text-[10px] text-gray-400 flex items-start gap-1.5">
            <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
            <span>
              One account, multiple capabilities. Onboarding is required to activate each.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
