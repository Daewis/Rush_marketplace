import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { UserProfile, UserRole, Capability } from "../types";
import { useAppStore } from "../store/app-store";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { walletApi } from "../lib/api";

interface AuthContextType {
  user: UserProfile | null;
  /** Legacy single-role UI hint. Derived from `active_workspace` — for
   *  the actual authz decision use `user.capabilities` + `user.capability_status`. */
  role: UserRole;
  /** Convenience accessor for the multi-capability state. */
  capabilities: Capability[];
  capabilityStatus: Partial<Record<Exclude<Capability, 'CUSTOMER'>, string>>;
  activeWorkspace: Capability;
  logout: () => Promise<void>;
  updateWallet: (amountDelta: number, escrowDelta?: number) => void;
  refreshWallet: () => Promise<void>;
  updateProfile: (updated: Partial<UserProfile>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Maps a marketplace Capability to the legacy single-role string
 * the rest of the frontend still uses for routing. Kept so the
 * RoleSwitcher / SidebarNavigation / App.tsx dashboard switch don't
 * all need a rewrite in the same pass.
 *
 * "artisan" stays as the legacy alias for SERVICE_PROVIDER, and
 * "driver" for RIDER — those are what the existing UI checks against.
 */
function capabilityToLegacyRole(cap: Capability | undefined): UserRole {
  switch (cap) {
    case 'VENDOR':
      return 'vendor';
    case 'SERVICE_PROVIDER':
      return 'artisan';
    case 'RIDER':
      return 'rider';
    case 'CUSTOMER':
    default:
      return 'customer';
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const storeUser = useAppStore((state) => state.user);
  const setStoreUser = useAppStore((state) => state.setUser);
  const setAuth = useAppStore((state) => state.setAuth);
  const storeLogout = useAppStore((state) => state.logout);

  const [user, setUser] = useState<UserProfile | null>(null);
  const lastUidRef = useRef<string | null>(null);

  const refreshWallet = useCallback(async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') || localStorage.getItem('access_token') : null;
      if (!token) return;

      const res = await walletApi.getMe();
      if (res.data?.success && res.data.data) {
        const { balance, escrow_held } = res.data.data;
        setUser((prev) => {
          if (!prev) return null;
          if (prev.walletBalance === balance && prev.escrowHeld === escrow_held) {
            return prev;
          }
          return {
            ...prev,
            walletBalance: balance,
            escrowHeld: escrow_held,
          };
        });
      }
    } catch {
      // Best-effort silent refresh
    }
  }, []);

  useEffect(() => {
    if (storeUser) {
      const currentUid = storeUser.id || storeUser.uid || "user_1";
      const isNewUser = lastUidRef.current !== currentUid;
      lastUidRef.current = currentUid;

      // Normalize capabilities — backend always sends uppercase
      // Capability strings. Fall back to deriving from legacy `roles`
      // for backward compat with cached Firestore docs.
      const capabilities: Capability[] = (storeUser.capabilities as Capability[]) ||
        (storeUser.roles || ['CUSTOMER']).map((r: string) => r.toUpperCase() as Capability);

      // Default CUSTOMER if empty — every account has it implicitly.
      const caps = capabilities.length ? capabilities : ['CUSTOMER'] as Capability[];

      const activeWorkspace: Capability =
        (storeUser.active_workspace as Capability) ||
        (caps.includes('VENDOR') ? 'VENDOR' :
         caps.includes('SERVICE_PROVIDER') ? 'SERVICE_PROVIDER' :
         caps.includes('RIDER') ? 'RIDER' : 'CUSTOMER');

      setUser({
        uid: currentUid,
        displayName: storeUser.full_name || storeUser.displayName || storeUser.email?.split("@")[0] || "User",
        email: storeUser.email || "",
        phone: storeUser.phone || "",
        avatar: storeUser.avatar || storeUser.profile_picture || "",
        role: capabilityToLegacyRole(activeWorkspace),
        walletBalance: storeUser.walletBalance ?? 0,
        escrowHeld: storeUser.escrowHeld ?? 0,
        campusHub: storeUser.campusHub || (storeUser as any).campus_hub || "Unilag Akoka Campus",
        capabilities: caps,
        capability_status: storeUser.capability_status || {},
        active_workspace: activeWorkspace,
        system_roles: storeUser.system_roles || [],
      });

      // Query live balance from backend only on user switch
      if (isNewUser) {
        refreshWallet();
      }
    } else {
      lastUidRef.current = null;
      setUser(null);
    }
  }, [storeUser, refreshWallet]);

  const logout = async () => {
    try {
      await signOut(auth).catch(() => {});
    } finally {
      if (typeof window !== "undefined") {
        localStorage.removeItem("access_token");
        localStorage.removeItem("token");
        localStorage.removeItem("refresh_token");
      }
      setUser(null);
      setStoreUser(null as any);
      setAuth(false);
      storeLogout();
    }
  };

  const updateWallet = (amountDelta: number, escrowDelta: number = 0) => {
    setUser((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        walletBalance: Math.max(0, prev.walletBalance + amountDelta),
        escrowHeld: Math.max(0, prev.escrowHeld + escrowDelta),
      };
    });
    // Trigger real backend sync
    refreshWallet();
  };

  const updateProfile = (updated: Partial<UserProfile>) => {
    setUser((prev) => (prev ? { ...prev, ...updated } : null));
  };

  const capabilities = user?.capabilities || ['CUSTOMER'];
  const capabilityStatus = user?.capability_status || {};
  const activeWorkspace = user?.active_workspace || 'CUSTOMER';

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || "customer",
        capabilities,
        capabilityStatus,
        activeWorkspace,
        logout,
        updateWallet,
        refreshWallet,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used within an AuthProvider");
  return ctx;
};
