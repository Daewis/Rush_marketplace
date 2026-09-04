import {
  LayoutDashboard,
  Briefcase,
  Users,
  Settings,
  LogOut,
  Home,
  ClipboardList,
  User,
  ChevronDown,
  Package,
  PlusCircle,
  Truck,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useAppStore, AppView } from '@/store/app-store';

interface SidebarProps {
  className?: string;
  onClose?: () => void;
}

export function Sidebar({ className, onClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const { currentView, setView } = useAppStore();

  const isProvider = user?.role === 'provider' || user?.role === 'artisan';
  const isAdmin = user?.role === 'admin';

  const navItems: { title: string; view: AppView; icon: any }[] = [
    {
      title: 'Dashboard',
      view: isProvider ? 'provider-dashboard' : isAdmin ? 'admin-dashboard' : 'customer-dashboard',
      icon: LayoutDashboard,
    },
    {
      title: isProvider ? 'Assigned Jobs' : 'My Requests',
      view: 'my-jobs',
      icon: ClipboardList,
    },
    {
      title: isProvider ? 'Find Delivery & Jobs' : 'Request Dispatch',
      view: isProvider ? 'jobs' : 'new-job',
      icon: isProvider ? Briefcase : PlusCircle,
    },
    {
      title: 'Artisans & Riders',
      view: 'providers',
      icon: Users,
    },
    ...(isProvider
      ? [
          {
            title: 'Provider Portal',
            view: 'provider-dashboard' as AppView,
            icon: Truck,
          },
        ]
      : []),
    ...(isAdmin
      ? [
          {
            title: 'Admin Console',
            view: 'admin-dashboard' as AppView,
            icon: ShieldAlert,
          },
        ]
      : []),
    {
      title: 'Profile Settings',
      view: 'profile',
      icon: User,
    },
    {
      title: 'Preferences',
      view: 'settings',
      icon: Settings,
    },
  ];

  const handleNavClick = (view: AppView) => {
    setView(view);
    onClose?.();
  };

  const handleLogout = async () => {
    await logout();
    setView('home');
    onClose?.();
  };

  return (
    <div className={cn('flex h-full flex-col bg-white border-r border-slate-200/80', className)}>
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between border-b border-slate-100 px-6">
        <button
          onClick={() => handleNavClick('home')}
          className="flex items-center gap-2.5 transition-opacity hover:opacity-85 group text-left"
          aria-label="Go to home"
        >
          <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 p-1.5 shadow-sm transition-transform group-hover:scale-105">
            <Package className="h-4 w-4 text-white" />
          </div>
          <span className="text-xl font-black tracking-tight">
            <span className="text-orange-500">RUSH</span>
            <span className="text-slate-800">NG</span>
          </span>
        </button>
      </div>

      {/* Primary Navigation */}
      <nav className="flex-1 space-y-1.5 px-3 py-4 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.view;

          return (
            <button
              key={item.title}
              onClick={() => handleNavClick(item.view)}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 text-left',
                isActive
                  ? 'bg-orange-50 text-orange-600 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              )}
            >
              <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-orange-600' : 'text-slate-400')} />
              <span className="truncate">{item.title}</span>
            </button>
          );
        })}
      </nav>

      {/* User Section Footer */}
      <div className="border-t border-slate-100 p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between gap-2 px-2.5 py-2 hover:bg-slate-50 h-auto"
            >
              <div className="flex items-center gap-3 overflow-hidden text-left">
                <Avatar className="h-8 w-8 border border-orange-200 shrink-0">
                  <AvatarFallback className="bg-gradient-to-br from-orange-500 to-amber-600 text-white text-xs font-bold">
                    {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="overflow-hidden">
                  <p className="text-xs font-semibold text-slate-800 truncate">{user?.full_name || 'Account'}</p>
                  <p className="text-[10px] text-slate-500 capitalize truncate">{user?.role || 'User'}</p>
                </div>
              </div>
              <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 p-1.5 shadow-lg border-slate-200">
            <DropdownMenuLabel className="p-2">
              <div className="flex flex-col space-y-0.5">
                <p className="text-sm font-semibold text-slate-900 truncate">{user?.full_name}</p>
                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => handleNavClick('home')}
              className="cursor-pointer flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
            >
              <Home className="h-4 w-4 text-slate-500" />
              <span>Home Page</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleNavClick('settings')}
              className="cursor-pointer flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
            >
              <Settings className="h-4 w-4 text-slate-500" />
              <span>Account Settings</span>
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
    </div>
  );
}
