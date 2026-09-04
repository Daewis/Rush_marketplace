import React, { useState, useEffect } from "react";
import {
  Bike,
  ToggleLeft,
  ToggleRight,
  MapPin,
  AlertTriangle,
  Package,
  Star,
  TrendingUp,
  Clock,
  ShieldAlert,
  CheckCircle2,
  Navigation,
  Phone,
  Store,
} from "lucide-react";
import { useLogistics } from "../../../context/LogisticsContext";
import { useAuthContext } from "../../../context/AuthContext";
import { LiveMap, MapMarker } from "../LiveMap";
import { deliveryApi } from "@/lib/api";
import { toast } from "sonner";

export const DriverDashboard: React.FC = () => {
  const { user } = useAuthContext();
  const { drivers, rides, myLiveLocation, gpsError, setDriverStatus, assignDriver } = useLogistics();

  const [vendorDeliveries, setVendorDeliveries] = useState<any[]>([]);
  const [loadingDeliveries, setLoadingDeliveries] = useState(false);

  const myDriverProfile = drivers.find((d) => d.userId === user?.uid);
  const isPendingVerification =
    (user as any)?.capability_status?.RIDER === "PENDING_VERIFICATION" ||
    (myDriverProfile && !(myDriverProfile as any).licenseVerified);

  const isOnline =
    !isPendingVerification &&
    (myDriverProfile?.status === "available" || myDriverProfile?.status === "on_trip");

  const openRequests = rides.filter((r) => r.status === "requested");
  const activeRide = rides.find(
    (r) => r.driverId === user?.uid && ["assigned", "picked_up", "in_transit"].includes(r.status)
  );

  useEffect(() => {
    fetchVendorDeliveries();
  }, [isOnline]);

  const fetchVendorDeliveries = async () => {
    try {
      setLoadingDeliveries(true);
      const res = await deliveryApi.listOpen();
      if (res.data?.data?.deliveries) {
        setVendorDeliveries(res.data.data.deliveries);
      }
    } catch {
      // Fallback
    } finally {
      setLoadingDeliveries(false);
    }
  };

  const handleAcceptVendorDelivery = async (deliveryId: string) => {
    try {
      const res = await deliveryApi.accept(deliveryId);
      if (res.data?.success) {
        toast.success("Vendor order delivery accepted! Ready for pickup.");
        fetchVendorDeliveries();
      }
    } catch (err) {
      toast.error("Could not accept delivery request");
    }
  };

  const toggleOnline = () => {
    if (!user) return;
    if (isPendingVerification) {
      toast.error("Application under review. You cannot go online until an admin approves your rider profile.");
      return;
    }
    setDriverStatus(user.uid, isOnline ? "offline" : "available");
  };

  const markers: MapMarker[] = [];
  if (myLiveLocation) {
    markers.push({
      id: "me",
      lat: myLiveLocation.lat,
      lng: myLiveLocation.lng,
      color: "#ea580c",
      label: "Your live position",
      variant: "pulse",
    });
  }
  if (activeRide?.pickupLat && activeRide?.pickupLng && activeRide.status === "assigned") {
    markers.push({
      id: "pickup",
      lat: activeRide.pickupLat,
      lng: activeRide.pickupLng,
      color: "#2563eb",
      label: activeRide.pickupName,
      variant: "pin",
    });
  }
  if (activeRide?.dropoffLat && activeRide?.dropoffLng && activeRide.status !== "assigned") {
    markers.push({
      id: "dropoff",
      lat: activeRide.dropoffLat,
      lng: activeRide.dropoffLng,
      color: "#16a34a",
      label: activeRide.dropoffName,
      variant: "pin",
    });
  }

  return (
    <div className="space-y-5">
      {/* Pending verification alert banner */}
      {isPendingVerification && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 text-amber-900 space-y-2">
          <div className="flex items-center gap-2 font-black text-sm text-amber-950">
            <Clock className="w-5 h-5 text-amber-600 animate-spin" />
            <span>Rider Application Awaiting Admin Approval</span>
          </div>
          <p className="text-xs text-amber-800 leading-relaxed">
            Your vehicle license and registration have been submitted to the Admin Governance Console. Once an administrator approves your verification queue record, you will be able to go online and accept campus deliveries.
          </p>
        </div>
      )}

      {/* Status Header */}
      <div
        className={`rounded-2xl p-5 md:p-6 shadow-md text-white ${
          isOnline
            ? "bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700"
            : "bg-gradient-to-r from-slate-700 to-slate-800"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
                <Bike className="w-6 h-6" />
              </div>
              <div
                className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white ${
                  isOnline ? "bg-green-400" : isPendingVerification ? "bg-amber-400" : "bg-slate-400"
                }`}
              />
            </div>
            <div>
              <h2 className="text-lg font-bold">{user?.displayName || "Rider Console"}</h2>
              <div className="flex items-center gap-3 text-xs text-white/80 mt-0.5">
                <span className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />
                  {myDriverProfile?.rating ?? 5.0} ({myDriverProfile?.totalTrips ?? 0} trips)
                </span>
                {isPendingVerification && (
                  <span className="bg-amber-400/30 text-amber-200 px-2 py-0.5 rounded text-[10px] font-bold">
                    VERIFICATION PENDING
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={toggleOnline}
            disabled={isPendingVerification}
            className="flex items-center gap-2 font-semibold text-xs px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-50 transition-all border border-white/20 cursor-pointer"
          >
            {isOnline ? (
              <>
                <ToggleRight className="h-5 w-5 text-green-300" />
                <span>Online — Ready for Dispatches</span>
              </>
            ) : (
              <>
                <ToggleLeft className="h-5 w-5 text-slate-300" />
                <span>Offline — Go Online</span>
              </>
            )}
          </button>
        </div>
      </div>

      {gpsError && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800">{gpsError}</p>
        </div>
      )}

      {/* Live Map */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" /> Live Map & Radar
          </h3>
          {!isOnline && (
            <span className="text-[10px] text-slate-400 font-medium">
              {isPendingVerification
                ? "Awaiting admin verification"
                : "Go online to broadcast your live position"}
            </span>
          )}
        </div>
        {isOnline && !myLiveLocation && !gpsError && (
          <p className="text-[11px] text-slate-400">Broadcasting live GPS coordinates…</p>
        )}
        <LiveMap markers={markers} height="320px" />
      </div>

      {/* Active delivery banner */}
      {activeRide && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-blue-900">
              Active delivery — {activeRide.pickupName} → {activeRide.dropoffName}
            </p>
            <p className="text-[11px] text-blue-700 mt-0.5">Tracking Code: {activeRide.trackingCode}</p>
          </div>
          <span className="text-sm font-black text-blue-900">₦{activeRide.fare.toLocaleString()}</span>
        </div>
      )}

      {/* Vendor Store Delivery Requests */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Store className="w-3.5 h-3.5 text-orange-600" />
            Vendor Store Orders Awaiting Rider ({vendorDeliveries.length})
          </h3>
          <button
            onClick={fetchVendorDeliveries}
            className="text-[11px] text-orange-600 font-bold hover:underline cursor-pointer"
          >
            Refresh
          </button>
        </div>

        {!isOnline ? (
          <p className="text-xs text-slate-400 py-4 text-center">Go online to accept vendor store deliveries.</p>
        ) : vendorDeliveries.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">No vendor order deliveries waiting right now.</p>
        ) : (
          <div className="space-y-2">
            {vendorDeliveries.map((vd) => (
              <div
                key={vd.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white transition gap-3"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">
                      From: {vd.vendor_name || "Campus Store"}
                    </span>
                    <span className="text-[10px] bg-orange-100 text-orange-800 font-bold px-1.5 py-0.2 rounded">
                      STORE ORDER
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 truncate">
                    {vd.pickup?.address || "Store"} → {vd.dropoff?.address || "Customer Address"}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Recipient: {vd.customer_name} ({vd.customer_phone || "N/A"})
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                  <span className="text-sm font-black text-slate-900">₦{(vd.fare || 1000).toLocaleString()}</span>
                  <button
                    onClick={() => handleAcceptVendorDelivery(vd.id)}
                    disabled={!!activeRide}
                    className="px-3.5 py-1.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-40 text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer"
                  >
                    Accept Delivery
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Nearby peer-to-peer requests */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Package className="w-3.5 h-3.5" /> Peer-to-Peer Pickups ({openRequests.length})
        </h3>

        {!isOnline && (
          <p className="text-xs text-slate-400 py-4 text-center">Go online to see and accept open requests.</p>
        )}

        {isOnline && openRequests.length === 0 && (
          <p className="text-xs text-slate-400 py-4 text-center">No open requests right now — check back soon.</p>
        )}

        {isOnline &&
          openRequests.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50/50"
            >
              <div className="min-w-0 pr-3">
                <p className="text-xs font-bold text-slate-800 truncate">
                  {r.pickupName} → {r.dropoffName}
                </p>
                {r.notes && <p className="text-[11px] text-slate-500 truncate mt-0.5">{r.notes}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-sm font-black text-slate-900">₦{r.fare.toLocaleString()}</span>
                <button
                  onClick={() => myDriverProfile && assignDriver(r.id, myDriverProfile.id)}
                  disabled={!!activeRide}
                  className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-40 text-white text-[11px] font-bold rounded-lg cursor-pointer"
                >
                  Accept
                </button>
              </div>
            </div>
          ))}
      </div>

      {/* Rider Escrow Earnings Tracking */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white/10 rounded-xl">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Rider Dispatch Ledger</h4>
            <p className="text-lg font-black text-white">Escrow Payout Protected</p>
          </div>
        </div>
        <div className="text-xs text-slate-300 sm:text-right">
          <p>Completed Trips: <span className="font-bold text-white">{myDriverProfile?.totalTrips ?? 0}</span></p>
          <p className="text-emerald-400 font-semibold">Automatic payout upon OTP confirmation</p>
        </div>
      </div>
    </div>
  );
};
