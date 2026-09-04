import { useState, useEffect } from 'react';
import {
  Menu,
  X,
  User,
  LogOut,
  Settings,
  Briefcase,
  ClipboardList,
  Home,
  Search,
  Users,
  Package,
  PlusCircle,
  Truck,
  Bell,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useAppStore, AppView } from '@/store/app-store';
import { cn } from '@/lib/utils';

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { currentView, setView } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [notificationCount] = useState(3);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems: { view: AppView; label: string; icon: any }[] = [
    { view: 'home', label: 'Home', icon: Home },
    { view: 'jobs', label: 'Find Jobs & Dispatch', icon: Search },
    { view: 'providers', label: 'Artisans & Riders', icon: Users },
  ];

  const handleNavClick = (view: AppView) => {
    setView(view);
    setIsOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    setView('home');
    setIsOpen(false);
  };

  return (
    <nav
      className={cn(
        'sticky top-0 z-50 transition-all duration-300',
        isScrolled
          ? 'bg-background/95 backdrop-blur-xl border-b border-border/50 shadow-sm'
          : 'bg-background/80 backdrop-blur-md border-b border-border/30'
      )}
    >
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between gap-2">
          {/* Brand Logo */}
          <button
            onClick={() => handleNavClick('home')}
            className="flex items-center gap-2.5 transition-all hover:scale-[1.02] active:scale-[0.98] group"
            aria-label="Go to home page"
          >
            <div className="relative h-9 w-9 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 p-1.5 shadow-sm shadow-orange-500/20 transition-transform group-hover:scale-105 shrink-0 flex items-center justify-center">
              <Package className="h-5 w-5 text-white" />
            </div>
            <span className="text-2xl font-black tracking-tight">
              <span className="text-orange-500">RUSH</span>
              <span className="text-foreground">NG</span>
            </span>
          </button>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-6">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.view;
              return (
                <button
                  key={item.view}
                  onClick={() => handleNavClick(item.view)}
                  className={cn(
                    'flex items-center gap-1.5 text-sm font-medium transition-all duration-200 hover:text-orange-500 relative py-1',
                    isActive
                      ? 'text-orange-600 font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                  {isActive && (
                    <span className="absolute -bottom-[18px] left-0 right-0 h-0.5 bg-gradient-to-r from-orange-500 to-amber-600 rounded-full" />
                  )}
                </button>
              );
            })}

            {/* Post Job / Dispatch Action Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleNavClick('new-job')}
              className="hidden lg:flex gap-1.5 border-orange-200 text-orange-600 hover:bg-orange-50 hover:text-orange-700 font-medium"
            >
              <PlusCircle className="h-4 w-4" />
              Post Request
            </Button>

            {/* Desktop Auth Section */}
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                {/* Notifications */}
                <Button variant="ghost" size="icon" className="relative h-9 w-9">
                  <Bell className="h-5 w-5" />
                  {notificationCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px]"
                    >
                      {notificationCount}
                    </Badge>
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleNavClick('my-jobs')}
                  className="gap-1.5 text-muted-foreground hover:text-orange-500 hover:bg-orange-50/50"
                >
                  <ClipboardList className="h-4 w-4 text-orange-500" />
                  My Jobs
                </Button>

                {user?.role === 'provider' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleNavClick('provider-dashboard')}
                    className="gap-1.5 text-muted-foreground hover:text-orange-500 hover:bg-orange-50/50"
                  >
                    <Truck className="h-4 w-4 text-orange-500" />
                    Portal
                  </Button>
                )}

                {user?.role === 'admin' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleNavClick('admin-dashboard')}
                    className="gap-1.5 text-muted-foreground hover:text-purple-500 hover:bg-purple-50/50"
                  >
                    <ShieldAlert className="h-4 w-4 text-purple-500" />
                    Admin
                  </Button>
                )}

                {/* Profile Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="relative h-9 w-9 rounded-full p-0 hover:ring-2 hover:ring-orange-400 transition-all"
                    >
                      <Avatar className="h-9 w-9 border-2 border-orange-200">
                        <AvatarFallback className="bg-gradient-to-br from-orange-500 to-amber-600 text-white text-xs font-bold">
                          {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 p-1.5 shadow-lg border-border/50 bg-background/95 backdrop-blur-md">
                    <DropdownMenuLabel className="p-2">
                      <div className="flex flex-col space-y-0.5">
                        <p className="text-sm font-semibold text-foreground truncate">{user?.full_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                        <Badge variant="outline" className="mt-1 w-fit capitalize text-orange-600 border-orange-200 bg-orange-50">
                          {user?.role || 'User'}
                        </Badge>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleNavClick('profile')}
                      className="cursor-pointer flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground hover:bg-muted"
                    >
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>Profile Settings</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleNavClick('my-jobs')}
                      className="cursor-pointer flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground hover:bg-muted"
                    >
                      <ClipboardList className="h-4 w-4 text-muted-foreground" />
                      <span>My Requests</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleNavClick('settings')}
                      className="cursor-pointer flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground hover:bg-muted"
                    >
                      <Settings className="h-4 w-4 text-muted-foreground" />
                      <span>Preferences</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="cursor-pointer flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-red-600 focus:bg-red-50 focus:text-red-700 hover:bg-red-50"
                      onClick={handleLogout}
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Log Out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleNavClick('login')}
                  className="text-muted-foreground hover:text-orange-500 hover:bg-orange-50"
                >
                  Log In
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleNavClick('register')}
                  className="bg-gradient-to-r from-orange-500 to-amber-600 text-white hover:from-orange-600 hover:to-amber-700 shadow-sm"
                >
                  Get Started
                </Button>
              </div>
            )}
          </div>

          {/* Mobile Actions */}
          <div className="flex items-center gap-2 md:hidden">
            {isAuthenticated && (
              <Button variant="ghost" size="icon" className="relative h-9 w-9">
                <Bell className="h-5 w-5" />
                {notificationCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px]"
                  >
                    {notificationCount}
                  </Badge>
                )}
              </Button>
            )}

            <button
              className="rounded-lg p-2 text-muted-foreground hover:bg-muted transition-colors"
              onClick={() => setIsOpen(!isOpen)}
              aria-label={isOpen ? 'Close menu' : 'Open menu'}
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isOpen && (
          <div className="md:hidden py-4 border-t border-border/50 space-y-3 animate-in slide-in-from-top-2 duration-200">
            <div className="flex flex-col space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.view;
                return (
                  <button
                    key={item.view}
                    onClick={() => handleNavClick(item.view)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all text-left w-full',
                      isActive
                        ? 'text-orange-600 bg-orange-50 font-semibold'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-border/50">
              {isAuthenticated ? (
                <div className="space-y-1">
                  <div className="px-3 py-2 mb-2 rounded-lg bg-muted/50 flex items-center gap-3">
                    <Avatar className="h-8 w-8 border-2 border-orange-200">
                      <AvatarFallback className="bg-orange-500 text-white text-xs font-bold">
                        {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="overflow-hidden">
                      <p className="text-xs font-semibold text-foreground truncate">{user?.full_name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleNavClick('new-job')}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg text-orange-600 bg-orange-50 hover:bg-orange-100"
                  >
                    <PlusCircle className="h-4 w-4" />
                    Post New Request
                  </button>

                  <button
                    onClick={() => handleNavClick('my-jobs')}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <ClipboardList className="h-4 w-4" />
                    My Jobs & Dispatch
                  </button>

                  {user?.role === 'provider' && (
                    <button
                      onClick={() => handleNavClick('provider-dashboard')}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <Briefcase className="h-4 w-4" />
                      Rider / Artisan Dashboard
                    </button>
                  )}

                  <button
                    onClick={() => handleNavClick('profile')}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <User className="h-4 w-4" />
                    Profile Settings
                  </button>

                  <button
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4" />
                    Log Out
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2 pt-1">
                  <button
                    onClick={() => handleNavClick('login')}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium rounded-lg text-foreground hover:bg-muted border border-border/50"
                  >
                    Log In
                  </button>
                  <button
                    onClick={() => handleNavClick('register')}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-semibold rounded-lg bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-sm"
                  >
                    Get Started
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
