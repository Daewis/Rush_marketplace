import React from "react";
import {
  Briefcase,
  Users,
  Wallet,
  ShieldAlert,
  Grid,
  CheckCircle2,
  Clock,
  Sparkles,
  MapPin,
  HelpCircle,
  Lock,
  LogIn,
  UserPlus,
  Truck,
} from "lucide-react";
import { useAuthContext } from "../context/AuthContext";
import { useMarketplace } from "../context/MarketplaceContext";
import { UserRole } from "../types";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenPostJob: () => void;
}

/**
 * Single source of truth for which nav items each role can see.
 * Add/remove roles here and BOTH the mobile bar and desktop panel
 * update automatically — no more editing two separate button lists.
 *
 * `roles: "all"` = visible to every logged-in role (customer/artisan/admin).
 * Guests (no user) only ever see "home", "jobs", "artisans", "categories" —
 * anything else redirects them to login via handleProtectedTabClick.
 */
type NavItemConfig = {
  key: string;
  roles: UserRole[] | "all";
  protectedTab: boolean;
  icon: any;
  iconColor: string;
  mobileLabel: string;
  desktopLabel: (role: UserRole | undefined) => string;
};

const NAV_ITEMS: NavItemConfig[] = [
  {
    key: "dashboard",
    roles: "all",
    protectedTab: true,
    icon: Sparkles,
    iconColor: "text-amber-500",
    mobileLabel: "Dashboard",
    desktopLabel: (role) =>
      role === "artisan"
        ? "Artisan Dashboard"
        : role === "admin"
        ? "Admin Console"
        : "Customer Dashboard",
  },
  {
    key: "jobs",
    roles: "all",
    protectedTab: false,
    icon: Briefcase,
    iconColor: "text-orange-500",
    mobileLabel: "Jobs",
    desktopLabel: (role) =>
      role === "artisan" ? "Find Jobs & Bid" : "Jobs & Bidding Board",
  },
  {
    // Deliveries/dispatch — customers & artisans request pickups (e.g. tools
    // from Alaba Market), drivers fulfill them, admins get full visibility.
    key: "rides",
    roles: "all",
    protectedTab: true,
    icon: Truck,
    iconColor: "text-orange-600",
    mobileLabel: "Deliveries",
    desktopLabel: (role) =>
      role === "driver" ? "Delivery Requests" : "Rush Dispatch & Deliveries",
  },
  {
    // Live tracker only matters once you're on a job — not relevant for admin oversight view
    key: "track_hud",
    roles: ["customer", "artisan"],
    protectedTab: true,
    icon: Clock,
    iconColor: "text-blue-500",
    mobileLabel: "Tracker",
    desktopLabel: () => "Live Job Tracker HUD",
  },
  {
    key: "artisans",
    roles: "all",
    protectedTab: false,
    icon: Users,
    iconColor: "text-emerald-600",
    mobileLabel: "Artisans",
    desktopLabel: (role) =>
      role === "admin" ? "Manage Artisans" : "Vetted Artisans Directory",
  },
  {
    // Browsing service categories is a discovery/shopping action — not relevant for admin
    key: "categories",
    roles: ["customer", "artisan"],
    protectedTab: false,
    icon: Grid,
    iconColor: "text-purple-600",
    mobileLabel: "Categories",
    desktopLabel: () => "Service Categories",
  },
  {
    // Personal escrow wallet applies to customers (paying), artisans (earning),
    // and drivers (earning delivery fares) — admins don't hold a wallet.
    key: "wallet",
    roles: ["customer", "artisan", "driver"],
    protectedTab: true,
    icon: Wallet,
    iconColor: "text-emerald-600",
    mobileLabel: "Wallet",
    desktopLabel: () => "Escrow Ledger Wallet",
  },
  {
    key: "disputes",
    roles: "all",
    protectedTab: true,
    icon: ShieldAlert,
    iconColor: "text-red-500",
    mobileLabel: "Disputes",
    desktopLabel: (role) =>
      role === "admin" ? "Dispute Resolution Queue" : "Accountability & Disputes",
  },
];

export const SidebarNavigation: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  onOpenPostJob,
}) => {
  const { user } = useAuthContext();
  const { jobs, disputes } = useMarketplace();

  const activeJobsCount = jobs.filter(
    (j) => j.status === "assigned" || j.status === "in_progress"
  ).length;

  const openDisputesCount = disputes.filter(
    (d) => d.status === "open" || d.status === "under_review"
  ).length;

  // Filter the shared config down to what this specific user's role should see.
  // Guests (no user yet) see every item that doesn't require a role match —
  // clicking a protected one just routes them to login.
  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.roles === "all") return true;
    if (!user) return true; // guests can see the tab, click routes to login
    return item.roles.includes(user.role);
  });

  const handleProtectedTabClick = (tabKey: string) => {
    if (!user) {
      setActiveTab("login");
    } else {
      setActiveTab(tabKey);
    }
  };

  const handleItemClick = (item: NavItemConfig) => {
    if (item.protectedTab) {
      handleProtectedTabClick(item.key);
    } else {
      setActiveTab(item.key);
    }
  };

  const getBadge = (item: NavItemConfig, variant: "mobile" | "desktop") => {
    if (!user) {
      return item.protectedTab ? (
        <Lock className="w-3 h-3 text-slate-400 ml-0.5 shrink-0" />
      ) : null;
    }
    if (item.key === "jobs" && variant === "mobile") {
      return null; // count is inline in the label for mobile jobs pill
    }
    if (item.key === "track_hud" && activeJobsCount > 0) {
      return (
        <span
          className={
            variant === "mobile"
              ? "bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold animate-pulse"
              : "text-[10px] bg-blue-500 text-white px-1.5 py-0.5 rounded-full font-extrabold animate-pulse"
          }
        >
          {variant === "mobile" ? activeJobsCount : `${activeJobsCount} Active`}
        </span>
      );
    }
    if (item.key === "disputes" && openDisputesCount > 0) {
      return (
        <span
          className={
            variant === "mobile"
              ? "bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold"
              : "text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold"
          }
        >
          {openDisputesCount}
        </span>
      );
    }
    if (item.key === "dashboard" && variant === "desktop") {
      return (
        <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold uppercase">
          {user.role}
        </span>
      );
    }
    return null;
  };

  // Guests and admins don't "post a request" — only customers/artisans do.
  // Admins get routed to their console instead of the post-job CTA.
  const handleBottomCtaClick = () => {
    if (!user) {
      setActiveTab("login");
    } else if (user.role === "admin") {
      setActiveTab("dashboard");
    } else if (user.role === "driver") {
      handleProtectedTabClick("rides");
    } else {
      onOpenPostJob();
    }
  };

  const bottomCtaLabel = !user
    ? "Sign In to Post Request"
    : user.role === "admin"
    ? "Go to Admin Console"
    : user.role === "driver"
    ? "View Delivery Requests"
    : user.role === "artisan"
    ? "Browse Job Board"
    : "Post a Request Now";

  return (
    <aside className="w-full lg:w-64 shrink-0">
      {/* Mobile Horizontal Scrollable Tab Bar (< lg) */}
      <div className="lg:hidden bg-white rounded-xl border border-slate-200 p-2 shadow-xs mb-4">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1 px-1">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => handleItemClick(item)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition cursor-pointer ${
                  isActive
                    ? "bg-orange-600 text-white shadow-xs font-bold"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "" : item.iconColor}`} />
                <span>
                  {item.key === "jobs" ? `${item.mobileLabel} (${jobs.length})` : item.mobileLabel}
                </span>
                {getBadge(item, "mobile")}
              </button>
            );
          })}
        </div>
      </div>

      {/* Full Vertical Sidebar Navigation (lg:block) */}
      <div className="hidden lg:block space-y-4">
        {/* Guest Mode Card if not logged in */}
        {!user && (
          <div className="bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-slate-900/5 border border-amber-200/90 rounded-xl p-3.5 space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                Guest Mode
              </span>
              <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">
                Login Required
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-snug">
              Sign in or create an account to manage your dashboard, escrow wallet, job tracker, and submit bids.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <button
                onClick={() => setActiveTab("login")}
                className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-bold shadow-2xs transition active:scale-95 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Log In</span>
              </button>
              <button
                onClick={() => setActiveTab("register")}
                className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold shadow-2xs transition active:scale-95 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5 text-orange-600" />
                <span>Sign Up</span>
              </button>
            </div>
          </div>
        )}

        {/* Navigation Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs">
          <p className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            Main Navigation
          </p>

          <nav className="space-y-1 mt-1">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => handleItemClick(item)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    isActive
                      ? "bg-orange-50 text-orange-700 font-bold border border-orange-200/60"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${item.iconColor}`} />
                    <span>{item.desktopLabel(user?.role)}</span>
                  </div>
                  {item.key === "jobs" ? (
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold">
                      {jobs.length}
                    </span>
                  ) : (
                    getBadge(item, "desktop") || (
                      !user && (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium">
                          <Lock className="w-3 h-3 text-slate-400" /> Sign In
                        </span>
                      )
                    )
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Escrow Guarantee Highlight Widget */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-xl p-4 space-y-3 shadow-md border border-slate-700 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 rounded-full blur-xl pointer-events-none" />

          <div className="flex items-center gap-2 text-orange-400">
            <Sparkles className="w-4 h-4" />
            <span className="text-xs font-black uppercase tracking-wider">
              Rush Guarantee
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed font-normal">
            100% Escrow Protection. Money is held securely until you confirm the 4-digit OTP at job location.
          </p>

          <div className="space-y-1.5 pt-1 text-[11px] text-slate-400 border-t border-slate-700/60">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>NIN / BVN Biometric Vetted</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span>Real-time GPS Check-in OTP</span>
            </div>
          </div>

          <button
            onClick={handleBottomCtaClick}
            className="w-full py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-lg shadow-xs transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
          >
            {bottomCtaLabel}
          </button>
        </div>

        {/* Support Contact Box */}
        <div className="bg-slate-100 rounded-xl p-3.5 text-xs text-slate-600 border border-slate-200 flex items-start gap-2.5">
          <HelpCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-slate-800 text-[11px]">
              Campus Safety & Emergency
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Contact 24/7 Campus Patrol & Rush Escrow Resolution Hotline.
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};