import { useState, useEffect } from 'react';
import { StatsCard } from './StatsCard';
import { ChartWidget } from './ChartWidget';
import {
  Users,
  Truck,
  DollarSign,
  ShieldAlert,
  Activity,
  Server,
  Clock,
  AlertTriangle,
  CheckCircle,
  Building,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Bike,
  Store,
  Wrench,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Phone,
  Mail,
  MapPin,
  FileText,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { adminApi, handleApiError } from '@/lib/api';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useMarketplace } from '@/context/MarketplaceContext';
import { toast } from 'sonner';

interface SystemMetric {
  totalUsers: number;
  activeProviders: number;
  totalTransactions: number;
  flaggedIncidents: number;
  serverUptime: number;
  activeSessions: number;
}

export function AdminDashboard() {
  const { campusHubs, addCampusHub, editCampusHub, deleteCampusHub } = useMarketplace();
  const [loading, setLoading] = useState(true);
  const [activeAdminTab, setActiveAdminTab] = useState<'overview' | 'approvals' | 'fleet' | 'vendors'>('overview');

  // Hub management
  const [newHubName, setNewHubName] = useState('');
  const [editingHub, setEditingHub] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');

  // Overview metrics
  const [metrics, setMetrics] = useState<SystemMetric>({
    totalUsers: 1420,
    activeProviders: 184,
    totalTransactions: 2850000,
    flaggedIncidents: 3,
    serverUptime: 99.98,
    activeSessions: 312,
  });
  const [volumeByRegion, setVolumeByRegion] = useState<{ label: string; value: number }[]>([
    { label: 'Unilag Akoka', value: 480 },
    { label: 'Yaba Tech', value: 310 },
    { label: 'Lagos State Univ', value: 240 },
    { label: 'Unilag Idi-Araba', value: 190 },
  ]);
  const [recentSystemLogs, setRecentSystemLogs] = useState<
    { id: string; event: string; timestamp: string; level: 'info' | 'warn' | 'error' | 'success' }[]
  >([
    { id: 'log-1', event: 'Escrow Released for Order #RUSH-8821', timestamp: '2 mins ago', level: 'success' },
    { id: 'log-2', event: 'Driver Verification Queue updated', timestamp: '8 mins ago', level: 'info' },
    { id: 'log-3', event: 'Dispute Opened on Job #RUSH-7734', timestamp: '15 mins ago', level: 'warn' },
    { id: 'log-4', event: 'OTP Handshake Verified for Order #RUSH-8810', timestamp: '22 mins ago', level: 'success' },
  ]);
  const [revenueData, setRevenueData] = useState<{ label: string; value: number }[]>([
    { label: 'Mon', value: 180000 },
    { label: 'Tue', value: 240000 },
    { label: 'Wed', value: 310000 },
    { label: 'Thu', value: 290000 },
    { label: 'Fri', value: 450000 },
  ]);

  // Verification Queue
  const [queue, setQueue] = useState<any[]>([]);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [queueFilter, setQueueFilter] = useState<'all' | 'RIDER' | 'SERVICE_PROVIDER' | 'VENDOR'>('all');

  // Fleet & Logistics
  const [drivers, setDrivers] = useState<any[]>([]);
  const [logisticsRides, setLogisticsRides] = useState<any[]>([]);

  // Vendors
  const [vendors, setVendors] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [metricsRes, regionRes, logsRes, revenueRes, queueRes, driversRes, ridesRes, vendorsRes] =
        await Promise.allSettled([
          adminApi.getMetrics(),
          adminApi.getRegionStats(),
          adminApi.getSystemLogs(),
          adminApi.getRevenueData(),
          adminApi.getVerificationQueue(),
          adminApi.getDrivers(),
          adminApi.getLogisticsRides(),
          adminApi.getVendors(),
        ]);

      if (metricsRes.status === 'fulfilled' && metricsRes.value?.data?.data) {
        setMetrics((prev) => ({ ...prev, ...metricsRes.value.data.data }));
      }
      if (regionRes.status === 'fulfilled' && regionRes.value?.data?.data) {
        setVolumeByRegion(regionRes.value.data.data);
      }
      if (logsRes.status === 'fulfilled' && logsRes.value?.data?.data) {
        setRecentSystemLogs(logsRes.value.data.data);
      }
      if (revenueRes.status === 'fulfilled' && revenueRes.value?.data?.data) {
        setRevenueData(revenueRes.value.data.data);
      }
      if (queueRes.status === 'fulfilled' && queueRes.value?.data?.data) {
        setQueue(queueRes.value.data.data.queue || []);
      }
      if (driversRes.status === 'fulfilled' && driversRes.value?.data?.data) {
        setDrivers(driversRes.value.data.data.drivers || []);
      }
      if (ridesRes.status === 'fulfilled' && ridesRes.value?.data?.data) {
        setLogisticsRides(ridesRes.value.data.data.rides || []);
      }
      if (vendorsRes.status === 'fulfilled' && vendorsRes.value?.data?.data) {
        setVendors(vendorsRes.value.data.data.vendors || []);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  const handleApproveCapability = async (userId: string, capability: string, action: 'approve' | 'reject') => {
    setApprovingId(`${userId}-${capability}-${action}`);
    try {
      const res = await adminApi.approveCapability({ userId, capability, action });
      if (res.data?.success) {
        toast.success(
          `${capability} application ${action === 'approve' ? 'APPROVED' : 'REJECTED'} successfully`
        );
        // Refresh queue & drivers
        const [qRes, dRes] = await Promise.all([adminApi.getVerificationQueue(), adminApi.getDrivers()]);
        if (qRes.data?.data) setQueue(qRes.data.data.queue || []);
        if (dRes.data?.data) setDrivers(dRes.data.data.drivers || []);
      } else {
        toast.error(res.data?.message || 'Could not process capability approval');
      }
    } catch (err: any) {
      toast.error(handleApiError(err));
    } finally {
      setApprovingId(null);
    }
  };

  const getLogColor = (level: string) => {
    const colors = {
      info: 'bg-blue-50 text-blue-700 border-blue-200',
      warn: 'bg-amber-50 text-amber-700 border-amber-200',
      error: 'bg-red-50 text-red-700 border-red-200',
      success: 'bg-green-50 text-green-700 border-green-200',
    };
    return colors[level as keyof typeof colors] || colors.info;
  };

  const getLogIcon = (level: string) => {
    const icons = {
      info: <Activity className="h-4 w-4 text-blue-600" />,
      warn: <AlertTriangle className="h-4 w-4 text-amber-600" />,
      error: <ShieldAlert className="h-4 w-4 text-red-600" />,
      success: <CheckCircle className="h-4 w-4 text-green-600" />,
    };
    return icons[level as keyof typeof icons] || icons.info;
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <LoadingSpinner text="Loading admin governance console..." />
      </div>
    );
  }

  const filteredQueue = queue.filter((item) => {
    if (queueFilter === 'all') return true;
    return item.pending_capabilities?.includes(queueFilter);
  });

  return (
    <div className="space-y-6">
      {/* Platform Overview Banner */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-slate-900 text-white shadow-lg"
      >
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Server className="h-5 w-5 text-amber-400" />
            RushNG System Governance & Logistics Fleet Console
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Real-time platform metrics, driver verification queue, and fleet dispatch tracking
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-xs">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-400" />
            </span>
            <span className="font-semibold text-green-400">All Nodes Healthy</span>
          </div>
          <Badge className="bg-white/10 text-white border-white/20 font-mono text-xs">
            Uptime: {metrics.serverUptime}%
          </Badge>
        </div>
      </motion.div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveAdminTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
            activeAdminTab === 'overview'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Governance & Metrics
        </button>

        <button
          onClick={() => setActiveAdminTab('approvals')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeAdminTab === 'approvals'
              ? 'bg-orange-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Verification Queue</span>
          {queue.length > 0 && (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeAdminTab === 'approvals' ? 'bg-white text-orange-600' : 'bg-orange-100 text-orange-700'
              }`}
            >
              {queue.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveAdminTab('fleet')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeAdminTab === 'fleet'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Truck className="w-3.5 h-3.5" />
          <span>Logistics & Fleet Command</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              activeAdminTab === 'fleet' ? 'bg-white text-blue-600' : 'bg-blue-100 text-blue-700'
            }`}
          >
            {drivers.length}
          </span>
        </button>

        <button
          onClick={() => setActiveAdminTab('vendors')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeAdminTab === 'vendors'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Store className="w-3.5 h-3.5" />
          <span>Campus Merchants</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              activeAdminTab === 'vendors' ? 'bg-white text-emerald-600' : 'bg-emerald-100 text-emerald-700'
            }`}
          >
            {vendors.length}
          </span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeAdminTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard title="Registered Users" value={metrics.totalUsers} icon={Users} color="blue" />
            <StatsCard title="Active Fleet Drivers" value={drivers.length || metrics.activeProviders} icon={Truck} color="orange" />
            <StatsCard
              title="Escrow Volume"
              value={`₦${(metrics.totalTransactions / 1000).toFixed(1)}K`}
              icon={DollarSign}
              color="emerald"
            />
            <StatsCard title="Active Sessions" value={metrics.activeSessions} icon={Activity} color="purple" />
          </div>

          {/* System Health Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-emerald-200 bg-emerald-50/40">
              <CardContent className="pt-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Escrow Transactions</p>
                    <p className="text-2xl font-bold mt-1 text-slate-900">₦2.85M</p>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-100 text-emerald-700">
                    <CheckCircle className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-amber-200 bg-amber-50/40">
              <CardContent className="pt-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Pending Approvals</p>
                    <p className="text-2xl font-bold mt-1 text-amber-700">{queue.length}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-100 text-amber-700">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-blue-50/40">
              <CardContent className="pt-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Verified Identity Registrations</p>
                    <p className="text-2xl font-bold mt-1 text-blue-700">99.4%</p>
                  </div>
                  <div className="p-3 rounded-xl bg-blue-100 text-blue-700">
                    <Users className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Region & Revenue */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Activity className="h-4 w-4 text-amber-600" />
                    Live Audit Logs & Security Handshakes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2.5">
                    {recentSystemLogs.map((log) => (
                      <div
                        key={log.id}
                        className={`flex items-center justify-between p-3 rounded-xl border ${getLogColor(log.level)}`}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="shrink-0">{getLogIcon(log.level)}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-800 truncate">{log.event}</p>
                            <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <Clock className="h-3 w-3" />
                              {log.timestamp}
                            </span>
                          </div>
                        </div>
                        <Badge variant="outline" className={`${getLogColor(log.level)} capitalize text-[10px]`}>
                          {log.level}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <ChartWidget title="Weekly Platform Revenue (₦)" data={revenueData} valuePrefix="₦" />
              <ChartWidget title="Dispatch Volume by Campus" data={volumeByRegion} />
            </div>
          </div>

          {/* Campus Hubs Governance Section */}
          <Card className="border-slate-200 shadow-md">
            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50 rounded-t-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900">
                  <Building className="h-5 w-5 text-orange-600" />
                  Campus Hubs Management & Directory
                </CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Add, rename, or deactivate active institutional campus coverage areas across Nigeria.
                </p>
              </div>
              <Badge className="bg-orange-100 text-orange-800 border-orange-200 font-bold self-start sm:self-auto">
                {campusHubs.length} Active Hubs
              </Badge>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (newHubName.trim()) {
                    addCampusHub(newHubName);
                    setNewHubName('');
                  }
                }}
                className="flex items-center gap-2"
              >
                <div className="relative flex-1">
                  <Building className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={newHubName}
                    onChange={(e) => setNewHubName(e.target.value)}
                    placeholder="Enter new campus hub name (e.g. Lasu Ojo Campus)..."
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-lg shadow-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Campus Hub</span>
                </button>
              </form>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                {campusHubs.map((hub) => (
                  <div
                    key={hub}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-2 hover:bg-white hover:shadow-xs transition"
                  >
                    {editingHub === hub ? (
                      <div className="flex items-center gap-1.5 flex-1">
                        <input
                          type="text"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          className="flex-1 px-2 py-1 text-xs border border-orange-400 rounded-md outline-none bg-white font-semibold text-slate-800"
                          autoFocus
                        />
                        <button
                          onClick={() => {
                            if (editingValue.trim()) {
                              editCampusHub(hub, editingValue);
                              setEditingHub(null);
                            }
                          }}
                          className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-md transition"
                          title="Save changes"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingHub(null)}
                          className="p-1 text-slate-400 hover:bg-slate-200 rounded-md transition"
                          title="Cancel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center font-black text-xs shrink-0">
                            {hub.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-800 truncate">{hub}</p>
                            <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Dispatch Active
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => {
                              setEditingHub(hub);
                              setEditingValue(hub);
                            }}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Rename Hub"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Are you sure you want to remove ${hub}?`)) {
                                deleteCampusHub(hub);
                              }
                            }}
                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Delete Hub"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: VERIFICATION & APPROVALS QUEUE (Driver Approval Flow) */}
      {activeAdminTab === 'approvals' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-orange-600" />
                Driver, Rider & Merchant Verification Queue
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Review driver licenses, vehicles, and merchant applications before granting active dispatch status.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setQueueFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  queueFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                All ({queue.length})
              </button>
              <button
                onClick={() => setQueueFilter('RIDER')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                  queueFilter === 'RIDER' ? 'bg-orange-600 text-white' : 'bg-orange-50 text-orange-700'
                }`}
              >
                <Bike className="w-3 h-3" /> Drivers & Riders
              </button>
              <button
                onClick={() => setQueueFilter('SERVICE_PROVIDER')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                  queueFilter === 'SERVICE_PROVIDER' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700'
                }`}
              >
                <Wrench className="w-3 h-3" /> Artisans
              </button>
              <button
                onClick={() => setQueueFilter('VENDOR')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                  queueFilter === 'VENDOR' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700'
                }`}
              >
                <Store className="w-3 h-3" /> Vendors
              </button>
            </div>
          </div>

          {filteredQueue.length === 0 ? (
            <Card className="border-dashed border-2 border-slate-200">
              <CardContent className="text-center py-12 space-y-3">
                <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">Verification Queue is Clear</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  All submitted driver licenses, vehicle plates, and merchant applications have been reviewed.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredQueue.map((item) => (
                <Card key={item.id} className="border-slate-200 hover:border-orange-300 transition shadow-xs">
                  <CardContent className="p-5">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Applicant info */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-base font-extrabold text-slate-900">{item.full_name || 'Applicant'}</h4>
                          {item.pending_capabilities?.map((cap: string) => (
                            <Badge
                              key={cap}
                              className={`text-[10px] font-bold ${
                                cap === 'RIDER'
                                  ? 'bg-orange-100 text-orange-800 border-orange-200'
                                  : cap === 'VENDOR'
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                  : 'bg-blue-100 text-blue-800 border-blue-200'
                              }`}
                            >
                              PENDING {cap} APPROVAL
                            </Badge>
                          ))}
                        </div>

                        <div className="flex items-center gap-4 text-xs text-slate-600 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            {item.email}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            {item.phone || 'No phone provided'}
                          </span>
                        </div>

                        {/* Specific details for Driver/Rider */}
                        {item.rider_details && (
                          <div className="p-3 rounded-xl bg-orange-50/60 border border-orange-200 text-xs space-y-1.5 mt-2">
                            <div className="flex items-center gap-2 font-bold text-orange-950">
                              <Bike className="w-4 h-4 text-orange-600" />
                              <span>Driver & Vehicle Registration File</span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-slate-700 pt-1">
                              <div>
                                <span className="text-[10px] text-slate-400 block font-semibold">VEHICLE TYPE</span>
                                <span className="font-bold">{item.rider_details.vehicle_type}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-400 block font-semibold">PLATE NUMBER</span>
                                <span className="font-bold font-mono bg-white px-1.5 py-0.5 rounded border border-orange-200">
                                  {item.rider_details.plate_number}
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-400 block font-semibold">DRIVER LICENSE NO.</span>
                                <span className="font-bold font-mono">{item.rider_details.license_number}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Specific details for Vendor */}
                        {item.vendor_details && (
                          <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200 text-xs space-y-1 mt-2">
                            <div className="flex items-center gap-2 font-bold text-emerald-950">
                              <Store className="w-4 h-4 text-emerald-600" />
                              <span>Store: {item.vendor_details.business_name} (/{item.vendor_details.slug})</span>
                            </div>
                            <p className="text-slate-600">Category: {item.vendor_details.category}</p>
                          </div>
                        )}

                        {/* Specific details for Service Provider */}
                        {item.provider_details && (
                          <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200 text-xs space-y-1 mt-2">
                            <div className="flex items-center gap-2 font-bold text-blue-950">
                              <Wrench className="w-4 h-4 text-blue-600" />
                              <span>Trade: {item.provider_details.category}</span>
                            </div>
                            <p className="text-slate-600">
                              Skills: {item.provider_details.skills?.join(', ') || 'N/A'}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Approval Actions */}
                      <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
                        {item.pending_capabilities?.map((cap: string) => {
                          const approveKey = `${item.id}-${cap}-approve`;
                          const rejectKey = `${item.id}-${cap}-reject`;
                          const isApproving = approvingId === approveKey;
                          const isRejecting = approvingId === rejectKey;

                          return (
                            <div key={cap} className="flex items-center gap-2">
                              <button
                                onClick={() => handleApproveCapability(item.id, cap, 'reject')}
                                disabled={!!approvingId}
                                className="px-3 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              >
                                {isRejecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                                <span>Reject</span>
                              </button>

                              <button
                                onClick={() => handleApproveCapability(item.id, cap, 'approve')}
                                disabled={!!approvingId}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                              >
                                {isApproving ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                )}
                                <span>Approve {cap === 'RIDER' ? 'Driver' : cap}</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: LOGISTICS & FLEET COMMAND */}
      {activeAdminTab === 'fleet' && (
        <div className="space-y-6">
          <Card className="border-slate-200">
            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900">
                <Truck className="h-5 w-5 text-blue-600" />
                Active Driver & Rider Fleet ({drivers.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {drivers.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">No drivers registered in fleet yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="p-3">Driver Name</th>
                        <th className="p-3">Vehicle</th>
                        <th className="p-3">Plate No.</th>
                        <th className="p-3">License Verified</th>
                        <th className="p-3">Total Trips</th>
                        <th className="p-3">Rating</th>
                        <th className="p-3">Fleet Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {drivers.map((d) => (
                        <tr key={d.id} className="hover:bg-slate-50">
                          <td className="p-3">
                            <p className="font-bold text-slate-900">{d.full_name}</p>
                            <p className="text-[11px] text-slate-400">{d.phone || d.email}</p>
                          </td>
                          <td className="p-3 uppercase font-semibold">{d.vehicle_type || 'MOTORCYCLE'}</td>
                          <td className="p-3 font-mono font-bold text-slate-800">{d.vehicle_plate_number || 'N/A'}</td>
                          <td className="p-3">
                            {d.license_verified ? (
                              <span className="text-emerald-600 font-bold flex items-center gap-1">
                                <CheckCircle className="w-3.5 h-3.5" /> Verified
                              </span>
                            ) : (
                              <span className="text-amber-600 font-bold flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" /> Pending
                              </span>
                            )}
                          </td>
                          <td className="p-3 font-bold">{d.total_trips || 0}</td>
                          <td className="p-3 font-bold text-amber-600">{d.rating || 5.0} ⭐</td>
                          <td className="p-3">
                            <Badge
                              className={`text-[10px] font-bold ${
                                d.status === 'AVAILABLE'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : d.status === 'ON_TRIP'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {d.status || 'OFFLINE'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Logistics Rides & Deliveries Table */}
          <Card className="border-slate-200">
            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900">
                <Clock className="h-5 w-5 text-orange-600" />
                Live Dispatches & Order Deliveries Tracking
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {logisticsRides.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">No active dispatch rides currently.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="p-3">Tracking Code</th>
                        <th className="p-3">Customer</th>
                        <th className="p-3">Assigned Driver</th>
                        <th className="p-3">Pickup → Dropoff</th>
                        <th className="p-3">Fare (₦)</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {logisticsRides.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50">
                          <td className="p-3 font-mono font-bold text-orange-600">{r.tracking_code || r.id?.slice(-6)}</td>
                          <td className="p-3 font-bold text-slate-900">{r.customer_name}</td>
                          <td className="p-3">{r.driver_name || <span className="text-slate-400">Unassigned</span>}</td>
                          <td className="p-3">
                            <p className="font-semibold truncate max-w-xs">{r.pickup?.address || 'Pickup'} → {r.dropoff?.address || 'Dropoff'}</p>
                          </td>
                          <td className="p-3 font-bold text-slate-900">₦{(r.fare || 0).toLocaleString()}</td>
                          <td className="p-3">
                            <Badge className="text-[10px] font-bold bg-slate-100 text-slate-700">
                              {r.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 4: CAMPUS MERCHANTS DIRECTORY */}
      {activeAdminTab === 'vendors' && (
        <Card className="border-slate-200">
          <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900">
              <Store className="h-5 w-5 text-emerald-600" />
              Registered Campus Merchants & Stores ({vendors.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {vendors.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No vendor storefronts registered yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {vendors.map((v) => (
                  <Card key={v.id} className="border-slate-200 p-4 space-y-2 hover:border-emerald-300 transition">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-extrabold text-sm text-slate-900">{v.business_name}</h4>
                        <p className="text-xs text-emerald-600 font-mono">rush.ng/store/{v.slug}</p>
                      </div>
                      <Badge className="text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {v.store_visibility || 'PUBLIC'}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500">Category: <span className="font-semibold text-slate-700">{v.category || 'General'}</span></p>
                    <p className="text-xs text-slate-500">Merchant: <span className="font-semibold text-slate-700">{v.owner_name}</span> ({v.phone || v.whatsapp || 'N/A'})</p>
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Rating: {v.rating || 5.0} ⭐</span>
                      <a
                        href={`/store/${v.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-orange-600 hover:underline font-bold"
                      >
                        Visit Store ↗
                      </a>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
