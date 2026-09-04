import { useAppStore } from '@/store/app-store';
import { useMarketplace } from '../../context/MarketplaceContext';
import { useAuthContext } from '../../context/AuthContext';
import { JobPost, EscrowTransaction } from '../../types';
import { StatsCard } from './StatsCard';
import { ChartWidget } from './ChartWidget';
import { Package, Truck, Wallet, Clock, Plus, ArrowRight, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { motion } from 'framer-motion';

export function CustomerDashboard() {
  const { setView } = useAppStore();
  const { user: authUser } = useAuthContext();
  const { jobs, transactions } = useMarketplace();

  // Find jobs created by current logged in user
  const userJobs = authUser
    ? jobs.filter(
        (j: JobPost) =>
          j.customerId === authUser.uid ||
          j.customerId === (authUser as any).id ||
          (authUser.displayName && j.customerName === authUser.displayName) ||
          (authUser.email && j.customerId === authUser.email)
      )
    : [];

  const isAdmin = authUser?.role === 'admin';
  const displayOrders = isAdmin ? jobs : userJobs;

  // Derive stats dynamically from Marketplace state
  const targetJobs = isAdmin ? jobs : userJobs;

  const activeDeliveriesCount = targetJobs.filter(
    (j: JobPost) => j.status === 'open' || j.status === 'assigned' || j.status === 'in_progress'
  ).length;

  const totalBookingsCount = targetJobs.length;

  const completedOrdersCount = targetJobs.filter(
    (j: JobPost) => j.status === 'completed'
  ).length;

  const walletBalance = authUser?.walletBalance ?? 0;

  // Weekly spending chart data
  const totalEscrowHold = transactions
    .filter((t: EscrowTransaction) => t.type === 'escrow_hold')
    .reduce((sum: number, t: EscrowTransaction) => sum + t.amount, 0);

  const weeklySpending = [
    { label: 'Mon', value: 0 },
    { label: 'Tue', value: 0 },
    { label: 'Wed', value: 0 },
    { label: 'Thu', value: 0 },
    { label: 'Fri', value: 0 },
    { label: 'Sat', value: 0 },
    { label: 'Sun', value: totalEscrowHold },
  ];

  const statusColors: Record<string, string> = {
    open: 'bg-amber-100 text-amber-800 border border-amber-200',
    assigned: 'bg-blue-100 text-blue-800 border border-blue-200',
    pending: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
    in_progress: 'bg-blue-100 text-blue-800 border border-blue-200',
    in_transit: 'bg-blue-100 text-blue-800 border border-blue-200',
    handshake_verified: 'bg-purple-100 text-purple-800 border border-purple-200',
    completed: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    delivered: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    cancelled: 'bg-red-100 text-red-800 border border-red-200',
    disputed: 'bg-rose-100 text-rose-800 border border-rose-200',
  };

  const statusLabels: Record<string, string> = {
    open: 'Open / Bidding',
    assigned: 'Assigned',
    pending: 'Pending',
    in_progress: 'In Progress',
    in_transit: 'In Transit',
    handshake_verified: 'OTP Verified',
    completed: 'Completed',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
    disputed: 'Disputed',
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-amber-600 p-6 md:p-8 text-white shadow-lg"
      >
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
              Welcome back, {authUser?.displayName?.split(' ')[0] || authUser?.email?.split('@')[0] || 'User'}! 👋
            </h2>
            <p className="text-white/80 text-sm mt-1 flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {authUser?.campusHub || 'Unilag Akoka Campus Hub'}
              </span>
              <span className="hidden sm:inline">•</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Quick dispatch in 5-15 mins
              </span>
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => setView('job-post')}
              className="bg-white text-orange-600 hover:bg-slate-50 font-semibold shadow cursor-pointer"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Book New Job / Express Dispatch
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <StatsCard
          title="Active Deliveries"
          value={activeDeliveriesCount}
          icon={Truck}
          color="orange"
          trend={{ value: 12, label: 'vs last week' }}
        />
        <StatsCard
          title="Total Bookings"
          value={totalBookingsCount}
          icon={Package}
          color="blue"
        />
        <StatsCard
          title="Completed Orders"
          value={completedOrdersCount}
          icon={Clock}
          color="green"
        />
        <StatsCard
          title="Wallet Balance"
          value={`₦${walletBalance.toLocaleString()}`}
          icon={Wallet}
          color="emerald"
        />
      </motion.div>

      {/* Main Grid */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-600" />
                Recent Orders & Handshakes
              </CardTitle>
              <Button
                onClick={() => setView('jobs')}
                variant="ghost"
                size="sm"
                className="text-xs text-amber-600 gap-1 cursor-pointer"
              >
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </CardHeader>
            <CardContent>
              {displayOrders.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <Package className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-medium text-slate-600">No active bookings yet</p>
                  <Button
                    onClick={() => setView('job-post')}
                    variant="gradient"
                    size="sm"
                    className="mt-3 cursor-pointer"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Book Now
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {displayOrders.map((item) => {
                    const isMyJob = authUser && (item.customerId === authUser.uid || item.customerId === (authUser as any).id || item.customerName === authUser.displayName);
                    const otpDisplay = item.handshakeOtp ? `OTP: [${item.handshakeOtp}]` : `#${item.id.replace('job_', '')}`;

                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-all duration-200"
                      >
                        <div className="flex items-center gap-3.5 flex-1 min-w-0">
                          <Avatar className="h-10 w-10 shrink-0">
                            <AvatarFallback className="bg-amber-100 text-amber-800 text-xs font-bold">
                              {item.artisanName?.charAt(0) || item.title?.charAt(0) || 'R'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-bold text-xs text-amber-600">
                                {otpDisplay}
                              </span>
                              <Badge className={statusColors[item.status] || 'bg-slate-100 text-slate-700'}>
                                {statusLabels[item.status] || item.status}
                              </Badge>
                              {isMyJob && (
                                <span className="bg-orange-100 text-orange-800 border border-orange-200 text-[10px] px-2 py-0.5 rounded font-bold">
                                  My Order
                                </span>
                              )}
                            </div>
                            <p className="text-xs font-bold text-slate-800 truncate">
                              {item.title}
                            </p>
                            <p className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                              <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
                              {item.location || item.hub}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-4">
                          <span className="font-bold text-sm block text-slate-900">
                            ₦{item.budget.toLocaleString()}
                          </span>
                          <span className="text-[11px] text-slate-400 block font-medium">
                            {item.artisanName || 'Awaiting Bids'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <ChartWidget
            title="Weekly Dispatch Spending"
            data={weeklySpending}
            valuePrefix="₦"
          />
        </div>
      </motion.div>
    </div>
  );
}
