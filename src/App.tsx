import React, { useState, useEffect } from "react";
import { AuthProvider, useAuthContext } from "./context/AuthContext";
import { MarketplaceProvider } from "./context/MarketplaceContext";
import { LogisticsProvider } from "./context/LogisticsContext";
import { Header } from "./components/Header";
import { SidebarNavigation } from "./components/SidebarNavigation";
import { JobBoard } from "./components/JobBoard";
import { CategoriesGrid } from "./components/CategoriesGrid";
import { ArtisanDirectory } from "./components/ArtisanDirectory";
import { JobTrackerHUD } from "./components/JobTrackerHUD";
import { EscrowWallet } from "./components/EscrowWallet";
import { AccountabilityCenter } from "./components/AccountabilityCenter";
import { PostJobModal } from "./components/PostJobModal";
import { ArtisanOnboardingModal } from "./components/ArtisanOnboardingModal";
import { DriverOnboardingModal } from "./components/logistics/DriverOnboardingModal";
import { RideBoard } from "./components/logistics/RideBoard";
import { DispatchTracker } from "./components/logistics/DispatchTracker";
import { DriverDashboard } from "./components/logistics/dashboard/DriverDashboard";
import { CustomerDashboard } from "./components/dashboard/CustomerDashboard";
import { ProviderDashboard } from "./components/dashboard/ProviderDashboard";
import { VendorDashboard } from "./components/dashboard/VendorDashboard";
import { AdminDashboard } from "./components/dashboard/AdminDashboard";
import { LoginForm } from "./components/auth/LoginForm";
import { RegisterForm } from "./components/auth/RegisterForm";
import { VerifyForm } from "./components/auth/VerifyForm";
import { LandingPage } from "./components/home/LandingPage";
import { VendorOnboardingModal } from "./components/vendor/VendorOnboardingModal";
import { useAppStore } from "./store/app-store";
import { GlobalLoadingOverlay } from "./components/common/GlobalLoadingOverlay";
import { Footer } from "./components/layout/Footer";


const MainAppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("home");
  const [isPostJobOpen, setIsPostJobOpen] = useState<boolean>(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);
  const [isDriverOnboardingOpen, setIsDriverOnboardingOpen] = useState<boolean>(false);
  const [isVendorOnboardingOpen, setIsVendorOnboardingOpen] = useState<boolean>(false);
  const [trackedRideId, setTrackedRideId] = useState<string | undefined>(undefined);
  const { user } = useAuthContext();
  const { currentView, setView } = useAppStore();

  // Synchronize activeTab with Zustand store currentView if set externally
  useEffect(() => {
    if (currentView === "home") {
      setActiveTab("home");
    } else if (currentView === "login" || currentView === "register" || currentView === "verify") {
      setActiveTab(currentView);
    } else if (currentView === "customer-dashboard" || currentView === "provider-dashboard" || currentView === "admin-dashboard") {
      setActiveTab("dashboard");
    } else if (currentView === "jobs") {
      setActiveTab("jobs");
    } else if (currentView === "providers") {
      setActiveTab("artisans");
    } else if (currentView === "job-post") {
      setIsPostJobOpen(true);
    } else if (currentView === "provider-register") {
      setIsOnboardingOpen(true);
    }
  }, [currentView]);

  const protectedTabs = ["dashboard", "track_hud", "wallet", "disputes", "rides", "dispatch_tracker"];

  const handleTabChange = (tab: string) => {
    if (!user && protectedTabs.includes(tab)) {
      setActiveTab("login");
      setView("login");
      return;
    }

    setActiveTab(tab);
    if (tab === "home") {
      setView("home");
    } else if (tab === "dashboard") {
      const activeWs = (user as any)?.active_workspace || (user as any)?.activeWorkspace;
      if (activeWs === "VENDOR" || user?.role === "vendor") setView("provider-dashboard");
      else if (activeWs === "SERVICE_PROVIDER" || user?.role === "artisan") setView("provider-dashboard");
      else if (user?.role === "admin") setView("admin-dashboard");
      else if (activeWs === "RIDER" || user?.role === "driver") setView("provider-dashboard");
      else setView("customer-dashboard");
    } else if (tab === "jobs") {
      setView("jobs");
    } else if (tab === "login" || tab === "register" || tab === "verify") {
      setView(tab as any);
    }
  };

  const renderDashboard = () => {
    const activeWs = (user as any)?.active_workspace || (user as any)?.activeWorkspace;
    if (activeWs === "VENDOR" || user?.role === "vendor") return <VendorDashboard />;
    if (activeWs === "RIDER" || user?.role === "driver") return <DriverDashboard />;
    if (activeWs === "SERVICE_PROVIDER" || user?.role === "artisan") return <ProviderDashboard />;
    if (user?.role === "admin") return <AdminDashboard />;
    return <CustomerDashboard />;
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800">
      <GlobalLoadingOverlay />

      {/* Top Header */}
      <Header
        onOpenPostJob={() => setIsPostJobOpen(true)}
        onOpenOnboarding={() => setIsOnboardingOpen(true)}
        onOpenDriverOnboarding={() => setIsDriverOnboardingOpen(true)}
        onOpenVendorOnboarding={() => setIsVendorOnboardingOpen(true)}
        activeTab={activeTab}
        setActiveTab={handleTabChange}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === "home" ? (
          <LandingPage />
        ) : (
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            {/* Left Sidebar (hidden on full auth screens) */}
            {activeTab !== "login" && activeTab !== "register" && activeTab !== "verify" && (
              <SidebarNavigation
                activeTab={activeTab}
                setActiveTab={handleTabChange}
                onOpenPostJob={() => setIsPostJobOpen(true)}
              />
            )}

            {/* Main Content Body */}
            <div className="flex-1 w-full min-w-0">
              {activeTab === "dashboard" && renderDashboard()}

              {activeTab === "jobs" && (
                <JobBoard onOpenPostJob={() => setIsPostJobOpen(true)} />
              )}

              {activeTab === "categories" && (
                <CategoriesGrid
                  onSelectCategory={() => handleTabChange("jobs")}
                />
              )}

              {activeTab === "artisans" && (
                <ArtisanDirectory
                  onOpenPostJob={() => setIsPostJobOpen(true)}
                  onOpenOnboarding={() => setIsOnboardingOpen(true)}
                />
              )}

              {activeTab === "track_hud" && <JobTrackerHUD />}

              {activeTab === "rides" && (
                <RideBoard
                  onOpenTracker={(rideId) => {
                    setTrackedRideId(rideId);
                    handleTabChange("dispatch_tracker");
                  }}
                />
              )}

              {activeTab === "dispatch_tracker" && (
                <DispatchTracker rideId={trackedRideId} />
              )}

              {activeTab === "wallet" && <EscrowWallet />}

              {activeTab === "disputes" && <AccountabilityCenter />}

              {activeTab === "login" && <LoginForm />}

              {activeTab === "register" && <RegisterForm />}

              {activeTab === "verify" && <VerifyForm />}
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      <PostJobModal
        isOpen={isPostJobOpen}
        onClose={() => setIsPostJobOpen(false)}
      />

      <ArtisanOnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
      />

      <DriverOnboardingModal
        isOpen={isDriverOnboardingOpen}
        onClose={() => setIsDriverOnboardingOpen(false)}
      />

      <VendorOnboardingModal
        isOpen={isVendorOnboardingOpen}
        onClose={() => setIsVendorOnboardingOpen(false)}
      />

       <Footer />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MarketplaceProvider>
        <LogisticsProvider>
          <MainAppContent />
        </LogisticsProvider>
      </MarketplaceProvider>
    </AuthProvider>
  );
}