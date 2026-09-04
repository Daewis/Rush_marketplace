import React, { useState } from "react";
import {
  ShieldCheck,
  Wallet,
  Building,
  PlusCircle,
  Search,
  LogIn,
  UserPlus,
  Home as HomeIcon,
  Sparkles,
  Menu,
  X,
  LogOut,
  LayoutDashboard,
  Briefcase,
  Users,
  Grid,
  ShieldAlert,
  ChevronDown,
  Bell,
} from "lucide-react";
import { useAuthContext } from "../context/AuthContext";
import { useMarketplace } from "../context/MarketplaceContext";
import { useAppStore } from "../store/app-store";
import { NotificationCenter } from "./common/NotificationCenter";
import { RoleSwitcher } from "./RoleSwitcher";
import { GlobalSearchBar } from "./common/GlobalSearchBar";
import { campusHubs as rawCampusHubs } from "../data/seedData";

interface HeaderProps {
  onOpenPostJob: () => void;
  onOpenOnboarding: () => void;
  onOpenDriverOnboarding: () => void;
  onOpenVendorOnboarding?: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const campusHubs = [
  "All Campus Hubs",
  ...rawCampusHubs.filter((h) => h !== "All Campus Hubs"),
];

export const Header: React.FC<HeaderProps> = ({
  onOpenPostJob,
  onOpenOnboarding,
  onOpenDriverOnboarding,
  onOpenVendorOnboarding,
  activeTab,
  setActiveTab,
}) => {
  const { user, logout } = useAuthContext();
  const { selectedHub, setSelectedHub, searchQuery, setSearchQuery, unreadNotificationsCount } = useMarketplace();
  const { setView } = useAppStore();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const isLoggedIn = !!user;

  // Shared handler so both the desktop nav and mobile drawer's RoleSwitcher
  // route "activate a capability I don't have yet" to the right onboarding flow.
  const handleActivateRole = (role: "provider" | "driver") => {
    if (role === "provider") {
      onOpenOnboarding();
    } else if (role === "driver") {
      onOpenDriverOnboarding();
    }
  };

  // Capability-based variant — accepts the canonical Capability strings
  // from the new RoleSwitcher. Maps them onto the respective modals.
  const handleActivateCapability = (cap: "CUSTOMER" | "VENDOR" | "SERVICE_PROVIDER" | "RIDER") => {
    if (cap === "SERVICE_PROVIDER") {
      onOpenOnboarding();
    } else if (cap === "RIDER") {
      onOpenDriverOnboarding();
    } else if (cap === "VENDOR") {
      if (onOpenVendorOnboarding) {
        onOpenVendorOnboarding();
      }
    }
  };

  const handleNavigate = (tab: string) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
    if (tab === "home") setView("home");
    else if (tab === "login") setView("login");
    else if (tab === "register") setView("register");
    else if (tab === "dashboard") {
      if (user?.role === "artisan") setView("provider-dashboard");
      else if (user?.role === "admin") setView("admin-dashboard");
      else setView("customer-dashboard");
    } else if (tab === "jobs") setView("jobs");
    else if (tab === "artisans") setView("providers");
  };

  const handleLogout = () => {
    logout();
    setUserDropdownOpen(false);
    setMobileMenuOpen(false);
    setView("home");
    setActiveTab("home");
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-xs">
      {/* Top Banner Notice - Mobile Scrollable & Wrapped */}
      <div className="bg-slate-900 text-slate-300 text-xs px-3 sm:px-4 py-1.5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 overflow-x-auto">
        <div className="flex items-center gap-2 shrink-0">
          <span className="bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded text-[10px] tracking-wide border border-emerald-500/30 whitespace-nowrap">
            NIN & BVN ENFORCED
          </span>
          <span className="hidden md:inline text-slate-400 text-[11px] whitespace-nowrap">
            Campus Escrow Protection & GPS Handshake OTP Active
          </span>
        </div>
        {user && (
          <div className="flex items-center gap-2 shrink-0 ml-auto text-[11px]">
            <span
              className={`px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide ${
                user.role === "admin"
                  ? "bg-purple-600 text-white"
                  : user.role === "artisan"
                  ? "bg-orange-500 text-white"
                  : "bg-slate-700 text-slate-200"
              }`}
            >
              {user.role}
            </span>
          </div>
        )}
      </div>

      {/* Main Header Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-2 sm:gap-4">
        {/* Logo */}
        <div
          onClick={() => handleNavigate("home")}
          className="flex items-center gap-2 cursor-pointer group shrink-0"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-orange-600 flex items-center justify-center text-white font-extrabold text-lg sm:text-xl shadow-md group-hover:scale-105 transition transform">
            R
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="font-black text-lg sm:text-xl tracking-tight text-slate-900">
                RUSH
              </span>
              <span className="text-[10px] sm:text-xs bg-orange-100 text-orange-700 font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                Merchant
              </span>
            </div>
            <p className="hidden xs:block text-[9px] sm:text-[10px] font-medium text-slate-500 tracking-tight">
              Hyper-Local Vetted Artisans
            </p>
          </div>
        </div>

        {/* Hub Dropdown & Search Bar - Desktop */}
        <div className="hidden lg:flex items-center gap-2 flex-1 max-w-lg">
          <div className="relative shrink-0">
            <Building className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={selectedHub}
              onChange={(e) => setSelectedHub(e.target.value)}
              className="pl-9 pr-8 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200/80 rounded-lg border border-slate-200 text-slate-700 focus:outline-none cursor-pointer appearance-none transition"
            >
              {campusHubs.map((hub) => (
                <option key={hub} value={hub}>
                  {hub}
                </option>
              ))}
            </select>
          </div>

          <GlobalSearchBar
            className="flex-1"
            onNavigateTab={handleNavigate}
          />
        </div>

        {/* Desktop Controls */}
        <div className="hidden md:flex items-center gap-2 sm:gap-3">
          {/* Conditional Auth vs Logged-In Controls */}
          {isLoggedIn ? (
            <>
              {/* Role Switcher — only renders if user has >1 role or an
                  inactive self-service role available to activate */}
              <RoleSwitcher onActivateCapability={handleActivateCapability} />

              {/* Post Job Button */}
              <button
                onClick={onOpenPostJob}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs shadow-xs transition active:scale-95 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Post Job</span>
              </button>

              {/* Wallet Balance Widget */}
              <button
                onClick={() => handleNavigate("wallet")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition cursor-pointer ${
                  activeTab === "wallet"
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100/70"
                }`}
              >
                <Wallet className="w-4 h-4 text-emerald-600 shrink-0" />
                <div className="text-left">
                  <p className="text-[9px] uppercase font-bold tracking-wider opacity-75 leading-none">
                    Wallet
                  </p>
                  <p className="text-xs font-black">
                    ₦{(user?.walletBalance || 0).toLocaleString()}
                  </p>
                </div>
              </button>

              {/* Notification Bell Button */}
              <button
                onClick={() => setNotificationsOpen(true)}
                className="relative p-2 rounded-lg text-slate-700 hover:bg-slate-100 border border-slate-200 transition cursor-pointer"
                title="Notifications"
              >
                <Bell className="w-4 h-4 text-slate-700" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white font-black text-[9px] w-4 h-4 rounded-full flex items-center justify-center animate-pulse border border-white">
                    {unreadNotificationsCount > 9 ? "9+" : unreadNotificationsCount}
                  </span>
                )}
              </button>


              {/* User Profile Avatar & Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 p-1 rounded-full hover:bg-slate-100 transition cursor-pointer border border-slate-200"
                >
                  <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden border border-slate-300">
                    {user?.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.displayName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-600 font-bold text-xs bg-orange-100 text-orange-800">
                        {user?.displayName ? user.displayName.slice(0, 2).toUpperCase() : "US"}
                      </div>
                    )}
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500 mr-1" />
                </button>

                {/* Dropdown Menu */}
                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="px-4 py-3 border-b border-slate-100">
                      <p className="text-xs font-bold text-slate-900">{user.displayName}</p>
                      <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <span className="text-[10px] bg-orange-100 text-orange-800 px-2 py-0.5 rounded font-bold uppercase">
                          {user.role}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {user.campusHub || "Unilag Hub"}
                        </span>
                      </div>
                    </div>

                    <div className="py-1">
                      <button
                        onClick={() => handleNavigate("dashboard")}
                        className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium"
                      >
                        <LayoutDashboard className="w-4 h-4 text-orange-600" />
                        My Dashboard
                      </button>
                      <button
                        onClick={() => handleNavigate("jobs")}
                        className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium"
                      >
                        <Briefcase className="w-4 h-4 text-blue-600" />
                        Jobs Board
                      </button>
                      <button
                        onClick={() => handleNavigate("wallet")}
                        className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium"
                      >
                        <Wallet className="w-4 h-4 text-emerald-600" />
                        Escrow Wallet (₦{(user.walletBalance || 0).toLocaleString()})
                      </button>
                    </div>

                    <div className="border-t border-slate-100 pt-1">
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 font-semibold"
                      >
                        <LogOut className="w-4 h-4 text-red-500" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Logged Out Buttons */}
              <button
                onClick={() => handleNavigate("login")}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg border font-semibold text-xs transition cursor-pointer ${
                  activeTab === "login"
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                }`}
              >
                <LogIn className="w-4 h-4 text-orange-600" />
                <span>Login</span>
              </button>

              <button
                onClick={() => handleNavigate("register")}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-semibold text-xs transition cursor-pointer shadow-xs ${
                  activeTab === "register"
                    ? "bg-amber-600 text-white"
                    : "bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white"
                }`}
              >
                <UserPlus className="w-4 h-4" />
                <span>Sign Up</span>
              </button>
            </>
          )}
        </div>

        {/* Mobile Header Controls */}
        <div className="flex md:hidden items-center gap-2">
          {/* Mobile Notification Bell */}
          <button
            onClick={() => setNotificationsOpen(true)}
            className="relative p-2 rounded-lg text-slate-700 hover:bg-slate-100 border border-slate-200 transition cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-4 h-4 text-slate-700" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white font-black text-[9px] w-4 h-4 rounded-full flex items-center justify-center animate-pulse border border-white">
                {unreadNotificationsCount > 9 ? "9+" : unreadNotificationsCount}
              </span>
            )}
          </button>

          {isLoggedIn ? (
            <div 
              onClick={() => handleNavigate("dashboard")}
              className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden border border-slate-300 cursor-pointer"
            >
              {user?.avatar ? (
                <img src={user.avatar} alt={user.displayName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-600 font-bold text-xs bg-orange-100 text-orange-800">
                  {user?.displayName ? user.displayName.slice(0, 2).toUpperCase() : "US"}
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => handleNavigate("login")}
              className="p-2 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold flex items-center gap-1"
            >
              <LogIn className="w-4 h-4 text-orange-600" />
              <span>Login</span>
            </button>
          )}

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 transition cursor-pointer"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-slate-900" /> : <Menu className="w-5 h-5 text-slate-900" />}
          </button>
        </div>

      </div>

      {/* Mobile Drawer / Slide-Over Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-4 shadow-xl animate-in slide-in-from-top duration-200">
          {/* Search & Hub Selector on Mobile */}
          <div className="space-y-2">
            <div className="relative">
              <Building className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                value={selectedHub}
                onChange={(e) => setSelectedHub(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs font-semibold bg-slate-100 rounded-lg border border-slate-200 text-slate-700"
              >
                {campusHubs.map((hub) => (
                  <option key={hub} value={hub}>
                    {hub}
                  </option>
                ))}
              </select>
            </div>

            <GlobalSearchBar
              isMobile={true}
              onNavigateTab={handleNavigate}
              onCloseMobileMenu={() => setMobileMenuOpen(false)}
            />
          </div>

          {/* Navigation Links */}
          <div className="space-y-1 border-t border-slate-100 pt-3">
            {activeTab !== "home" && (
              <button
                onClick={() => handleNavigate("home")}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <HomeIcon className="w-4 h-4 text-orange-600" />
                <span>Home</span>
              </button>
            )}

            {isLoggedIn ? (
              <>
                <button
                  onClick={() => handleNavigate("dashboard")}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold ${
                    activeTab === "dashboard" ? "bg-orange-100 text-orange-800" : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>My Dashboard</span>
                  </div>
                  <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold uppercase">
                    {user.role}
                  </span>
                </button>

                <button
                  onClick={() => handleNavigate("jobs")}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold ${
                    activeTab === "jobs" ? "bg-orange-100 text-orange-800" : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <Briefcase className="w-4 h-4 text-orange-500" />
                  <span>Jobs & Bidding Board</span>
                </button>

                <button
                  onClick={() => handleNavigate("artisans")}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold ${
                    activeTab === "artisans" ? "bg-orange-100 text-orange-800" : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <Users className="w-4 h-4 text-blue-500" />
                  <span>Artisans Directory</span>
                </button>

                <button
                  onClick={() => handleNavigate("wallet")}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold ${
                    activeTab === "wallet" ? "bg-orange-100 text-orange-800" : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Wallet className="w-4 h-4 text-emerald-600" />
                    <span>Escrow Wallet</span>
                  </div>
                  <span className="font-extrabold text-emerald-700">
                    ₦{(user.walletBalance || 0).toLocaleString()}
                  </span>
                </button>
              </>
            ) : null}
          </div>

          {/* Action CTAs & Auth */}
          <div className="border-t border-slate-100 pt-3 space-y-2">
            <button
              onClick={() => {
                onOpenPostJob();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-orange-600 text-white rounded-lg font-bold text-xs shadow-md"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Post Job to Escrow</span>
            </button>

            {isLoggedIn ? (
              <div className="bg-slate-50 rounded-xl p-3 flex items-center justify-between border border-slate-200">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-slate-200 overflow-hidden shrink-0">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.displayName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-600 font-bold text-xs bg-orange-100">
                        {user.displayName?.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 leading-tight">{user.displayName}</p>
                    <p className="text-[10px] text-slate-500">{user.email}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg text-xs font-bold flex items-center gap-1"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Out</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleNavigate("login")}
                  className="w-full py-2.5 bg-white border border-slate-300 text-slate-800 rounded-lg font-bold text-xs text-center"
                >
                  Log In
                </button>
                <button
                  onClick={() => handleNavigate("register")}
                  className="w-full py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-lg font-bold text-xs text-center shadow-xs"
                >
                  Sign Up
                </button>
              </div>
            )}
          </div>

          {/* Mobile Role Switcher — placed in the profile banner */}
          {isLoggedIn && (
            <div className="border-t border-slate-100 pt-3">
              <RoleSwitcher onActivateCapability={handleActivateCapability} />
            </div>
          )}
        </div>
      )}

      {/* Real-time Campus Notification Center Drawer */}
      <NotificationCenter
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        onNavigateTab={handleNavigate}
      />
    </header>
  );
};