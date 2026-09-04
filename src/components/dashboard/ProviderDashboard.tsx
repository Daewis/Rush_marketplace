import { useState, useEffect } from 'react';
import { useAppStore } from '@/store/app-store';
import { StatsCard } from './StatsCard';
import { ChartWidget } from './ChartWidget';
import { 
  DollarSign, CheckCircle2, MapPin, Navigation, ToggleLeft, ToggleRight, 
  Clock, Star, Users 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { motion } from 'framer-motion';
import { jobApi } from '@/lib/api';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

interface AvailableJob {
  id: string;
  pickup: string;
  dropoff: string;
  distance: string;
  payout: number;
  customer: string;
  estimatedTime: string;
}

export function ProviderDashboard() {
  const { user, showToast } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [stats, setStats] = useState({
    todayEarnings: 18500,
    completedToday: 4,
    rating: 4.9,
    acceptanceRate: 96,
    totalEarnings: 128000,
    totalDeliveries: 48,
  });
  const [availableJobs, setAvailableJobs] = useState<AvailableJob[]>([
    {
      id: 'job-201',
      pickup: 'Unilag Main Library',
      dropoff: 'Faculty of Science Lab',
      distance: '0.8 km',
      payout: 3000,
      customer: 'Dr. Adebayo',
      estimatedTime: '10 mins',
    },
    {
      id: 'job-202',
      pickup: 'Moremi Hostel Gate',
      dropoff: 'New Hall Cafeteria',
      distance: '1.2 km',
      payout: 2200,
      customer: 'Kemi O.',
      estimatedTime: '15 mins',
    },
  ]);
  const [dailyEarnings, setDailyEarnings] = useState<{ label: string; value: number }[]>([
    { label: 'Mon', value: 14000 },
    { label: 'Tue', value: 18500 },
    { label: 'Wed', value: 22000 },
    { label: 'Thu', value: 16000 },
    { label: 'Fri', value: 28000 },
    { label: 'Sat', value: 19500 },
    { label: 'Sun', value: 10000 },
  ]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, jobsRes, earningsRes] = await Promise.allSettled([
        jobApi.getProviderStats(),
        jobApi.getAvailableJobs(),
        jobApi.getDailyEarnings(),
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value?.data?.data) {
        setStats((prev) => ({ ...prev, ...statsRes.value.data.data }));
      }
      if (jobsRes.status === 'fulfilled' && jobsRes.value?.data?.data) {
        setAvailableJobs(jobsRes.value.data.data);
      }
      if (earningsRes.status === 'fulfilled' && earningsRes.value?.data?.data) {
        setDailyEarnings(earningsRes.value.data.data);
      }
    } catch {
      // Fallback state retained on network error
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptJob = (jobId: string) => {
    showToast(`Job #${jobId} accepted! Navigation active.`, 'success');
    setAvailableJobs((prev) => prev.filter((j) => j.id !== jobId));
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <LoadingSpinner text="Loading provider dashboard..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Header */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative overflow-hidden rounded-2xl p-6 md:p-8 transition-all duration-300 shadow-lg ${
          isOnline
            ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white'
            : 'bg-gradient-to-r from-slate-700 to-slate-800 text-white'
        }`}
      >
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-14 w-14 border-2 border-white/30">
                <AvatarFallback className="bg-white/20 text-white text-lg font-bold">
                  {user?.full_name?.split(' ').map((n: string) => n[0]).join('') || 'TB'}
                </AvatarFallback>
              </Avatar>
              <div
                className={`absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-white ${
                  isOnline ? 'bg-green-400' : 'bg-slate-400'
                }`}
              />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold">{user?.full_name || 'Engr. Tunde Bakare'}</h2>
              <div className="flex items-center gap-3 text-xs text-white/80 mt-1">
                <span className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />
                  {stats.rating} ({stats.totalDeliveries} completed)
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  Verified Artisan & Rider
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              setIsOnline(!isOnline);
              showToast(isOnline ? 'You are now offline' : 'You are online and visible for jobs', 'info');
            }}
            className="flex items-center gap-2 font-semibold text-xs px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 transition-all border border-white/20 cursor-pointer self-start sm:self-auto"
          >
            {isOnline ? (
              <>
                <ToggleRight className="h-5 w-5 text-green-300" />
                <span>Status: Online</span>
                <Badge className="bg-green-400 text-slate-900 border-0 text-[10px]">Available</Badge>
              </>
            ) : (
              <>
                <ToggleLeft className="h-5 w-5 text-slate-300" />
                <span>Status: Offline</span>
                <Badge className="bg-slate-400 text-slate-900 border-0 text-[10px]">Paused</Badge>
              </>
            )}
          </button>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <StatsCard
          title="Today's Earnings"
          value={`₦${stats.todayEarnings.toLocaleString()}`}
          icon={DollarSign}
          color="emerald"
        />
        <StatsCard
          title="Completed Today"
          value={stats.completedToday}
          icon={CheckCircle2}
          color="green"
        />
        <StatsCard
          title="Rating"
          value={`${stats.rating} ★`}
          icon={Star}
          color="yellow"
        />
        <StatsCard
          title="Acceptance Rate"
          value={`${stats.acceptanceRate}%`}
          icon={Navigation}
          color="blue"
        />
      </motion.div>

      {/* Available Jobs & Earnings */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Navigation className="h-4 w-4 text-emerald-600" />
                  Nearby Campus Requests
                </span>
                {availableJobs.length > 0 && (
                  <Badge variant="orange">{availableJobs.length} active</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {availableJobs.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <MapPin className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-medium text-slate-600">No requests in your immediate hub</p>
                  <p className="text-xs mt-1">New orders will pop up automatically as students request dispatch</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {availableJobs.map((job) => (
                    <div
                      key={job.id}
                      className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-all duration-200"
                    >
                      <div className="space-y-1.5 flex-1 min-w-0 pr-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                            {job.distance} away
                          </Badge>
                          <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                            <Clock className="h-3 w-3 mr-1" />
                            {job.estimatedTime}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                          <MapPin className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                          <span className="truncate">{job.pickup}</span>
                          <span className="text-slate-400">→</span>
                          <span className="truncate">{job.dropoff}</span>
                        </div>
                        <p className="text-[11px] text-slate-500">Customer: {job.customer}</p>
                      </div>

                      <div className="text-right shrink-0 space-y-2">
                        <span className="text-lg font-bold text-emerald-600 block">
                          ₦{job.payout.toLocaleString()}
                        </span>
                        <Button
                          size="sm"
                          onClick={() => handleAcceptJob(job.id)}
                          disabled={!isOnline}
                          className="bg-emerald-600 text-white hover:bg-emerald-700 text-xs"
                        >
                          {isOnline ? 'Accept Job' : 'Go Online'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <ChartWidget
            title="Daily Earnings (₦)"
            data={dailyEarnings}
            valuePrefix="₦"
          />

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase text-slate-500">
                Service Level Agreement
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3.5">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-500">Job Completion Rate</span>
                  <span className="font-semibold">{stats.acceptanceRate}%</span>
                </div>
                <Progress value={stats.acceptanceRate} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-500">On-time ETA Compliance</span>
                  <span className="font-semibold">98%</span>
                </div>
                <Progress value={98} className="h-2" />
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </div>
  );
}
