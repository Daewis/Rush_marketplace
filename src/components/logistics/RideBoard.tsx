import React, { useState } from "react";
import {
  Truck,
  MapPin,
  Send,
  Phone,
  ChevronRight,
  X,
  Lock,
  ToggleLeft,
  ToggleRight,
  Package,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { RideRequest } from "../../types";
import { useLogistics } from "../../context/LogisticsContext";
import { useAuthContext } from "../../context/AuthContext";
import { LocationPicker } from "./LocationPicker";

interface RideBoardProps {
  onOpenTracker: (rideId: string) => void;
}

const STATUS_LABEL: Record<string, string> = {
  requested: "Looking for a rider",
  assigned: "Rider assigned",
  picked_up: "Picked up",
  in_transit: "En route",
  completed: "Delivered",
  cancelled: "Cancelled",
};

const STATUS_COLOR: Record<string, string> = {
  requested: "bg-amber-100 text-amber-800",
  assigned: "bg-blue-100 text-blue-800",
  picked_up: "bg-blue-100 text-blue-800",
  in_transit: "bg-blue-100 text-blue-800",
  completed: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-slate-200 text-slate-600",
};

export const RideBoard: React.FC<RideBoardProps> = ({ onOpenTracker }) => {
  const { user } = useAuthContext();
  const { rides, drivers, loading, error, refresh, requestRide, cancelRide, assignDriver, setDriverStatus } = useLogistics();

  const isDriver = user?.role === "driver";
  const myDriverProfile = drivers.find((d) => d.userId === user?.uid);

  const [scopeFilter, setScopeFilter] = useState<"my_rides" | "all">(
    isDriver ? "all" : "my_rides"
  );
  const [requestModalOpen, setRequestModalOpen] = useState(false);

  // Request form state
  const [pickupName, setPickupName] = useState("");
  const [pickupLocation, setPickupLocation] = useState<{ address: string; lat?: number; lng?: number }>({
    address: "",
  });
  const [dropoffName, setDropoffName] = useState("");
  const [dropoffLocation, setDropoffLocation] = useState<{ address: string; lat?: number; lng?: number }>({
    address: "",
  });
  const [notes, setNotes] = useState("");

  const myRides = user
    ? rides.filter((r) => r.customerId === user.uid || r.driverId === user.uid)
    : [];

  const filteredRides = rides.filter((r) => {
    if (scopeFilter === "my_rides") {
      return user && (r.customerId === user.uid || r.driverId === user.uid);
    }
    return true;
  });

  const openRides = filteredRides.filter((r) => r.status === "requested");
  const activeRides = filteredRides.filter((r) => ["assigned", "picked_up", "in_transit"].includes(r.status));
  const closedRides = filteredRides.filter((r) => ["completed", "cancelled"].includes(r.status));

  const [submitting, setSubmitting] = useState(false);

  const handleRequestRide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSubmitting(true);
    const newRide = await requestRide({
      customerId: user.uid,
      customerName: user.displayName,
      customerPhone: user.phone,
      pickupName,
      pickupAddress: pickupLocation.address,
      pickupLat: pickupLocation.lat,
      pickupLng: pickupLocation.lng,
      dropoffName,
      dropoffAddress: dropoffLocation.address,
      dropoffLat: dropoffLocation.lat,
      dropoffLng: dropoffLocation.lng,
      notes: notes || undefined,
    });
    setSubmitting(false);

    if (!newRide) return; // error already toasted by the context

    setRequestModalOpen(false);
    setPickupName("");
    setPickupLocation({ address: "" });
    setDropoffName("");
    setDropoffLocation({ address: "" });
    setNotes("");
    onOpenTracker(newRide.id);
  };

  const handleSelfAssign = (ride: RideRequest) => {
    if (!myDriverProfile) return;
    assignDriver(ride.id, myDriverProfile.id);
  };

  const toggleDriverOnline = () => {
    if (!myDriverProfile || !user) return;
    setDriverStatus(user.uid, myDriverProfile.status === "available" ? "offline" : "available");
  };

  const renderRideCard = (ride: RideRequest) => (
    <div
      key={ride.id}
      className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 hover:shadow-xs transition"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {ride.sourceJobTitle && (
            <p className="text-[10px] text-slate-400 mb-0.5 truncate">
              Supplies for job: {ride.sourceJobTitle}
            </p>
          )}
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <MapPin className="w-3.5 h-3.5 text-orange-600 shrink-0" />
            <span className="truncate">{ride.pickupName}</span>
            <span className="text-slate-400">→</span>
            <span className="truncate">{ride.dropoffName}</span>
          </div>
          {ride.notes && (
            <p className="text-[11px] text-slate-500 mt-1 truncate">{ride.notes}</p>
          )}
        </div>
        <span className={`shrink-0 text-[10px] font-bold px-2 py-1 rounded-full ${STATUS_COLOR[ride.status]}`}>
          {STATUS_LABEL[ride.status]}
        </span>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <div className="text-xs text-slate-500">
          {ride.driverName ? (
            <span className="flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-slate-400" />
              {ride.driverName}
            </span>
          ) : (
            <span className="text-slate-400">No rider assigned yet</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-black text-slate-900">₦{ride.fare.toLocaleString()}</span>
          {isDriver && ride.status === "requested" && myDriverProfile?.status === "available" && (
            <button
              onClick={() => handleSelfAssign(ride)}
              className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-[11px] font-bold rounded-lg transition"
            >
              Accept Delivery
            </button>
          )}
          {(ride.status !== "requested" || !isDriver) && ride.status !== "cancelled" && (
            <button
              onClick={() => onOpenTracker(ride.id)}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-lg transition"
            >
              Track <ChevronRight className="w-3 h-3" />
            </button>
          )}
          {!isDriver && ride.customerId === user?.uid && ride.status === "requested" && (
            <button
              onClick={() => cancelRide(ride.id, "Customer cancelled")}
              className="px-2 py-1.5 text-[11px] font-bold text-red-600 hover:bg-red-50 rounded-lg transition"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-orange-600" />
              <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
                Rush Dispatch & Deliveries
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {isDriver
                ? "Browse open delivery requests and manage your active trips."
                : "Request a rider to pick up parts, tools, or supplies for your job."}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isDriver && myDriverProfile && (
              <button
                onClick={toggleDriverOnline}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition ${
                  myDriverProfile.status === "available"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-slate-100 text-slate-600 border-slate-200"
                }`}
              >
                {myDriverProfile.status === "available" ? (
                  <ToggleRight className="w-4 h-4" />
                ) : (
                  <ToggleLeft className="w-4 h-4" />
                )}
                {myDriverProfile.status === "available" ? "Online" : "Offline"}
              </button>
            )}
            {!isDriver && (
              <button
                onClick={() => setRequestModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold text-xs transition"
              >
                <Package className="w-3.5 h-3.5" />
                Request Delivery
              </button>
            )}
          </div>
        </div>

        {/* Scope Filter */}
        <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 self-start border border-slate-200">
          <button
            onClick={() => setScopeFilter("my_rides")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              scopeFilter === "my_rides"
                ? "bg-orange-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            My Deliveries ({myRides.length})
          </button>
          <button
            onClick={() => setScopeFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              scopeFilter === "all"
                ? "bg-orange-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All Requests ({rides.length})
          </button>
        </div>
      </div>

      {/* Loading / Error states */}
      {loading && (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-xs text-slate-500 font-semibold">
          Loading deliveries…
        </div>
      )}

      {!loading && error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between gap-3">
          <span className="text-xs text-red-700 font-semibold">{error}</span>
          <button
            onClick={refresh}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold rounded-lg"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && filteredRides.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-4">
          <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
            <Truck className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No Delivery Requests Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {isDriver
              ? "No open delivery requests right now — check back soon."
              : "Request a rider to fetch parts or tools for your job."}
          </p>
        </div>
      )}

      {/* Open requests (driver-facing priority section) */}
      {isDriver && openRides.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Open Requests
          </h3>
          {openRides.map(renderRideCard)}
        </div>
      )}

      {activeRides.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5" /> Active Deliveries
          </h3>
          {activeRides.map(renderRideCard)}
        </div>
      )}

      {closedRides.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> History
          </h3>
          {closedRides.map(renderRideCard)}
        </div>
      )}

      {!isDriver && scopeFilter === "my_rides" && openRides.length === 0 && activeRides.length === 0 && closedRides.length === 0 && (
        <div />
      )}

      {/* MODAL: Request Delivery */}
      {requestModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">Request a Delivery</h3>
                <p className="text-xs text-slate-500">A rider will pick up and drop off your item.</p>
              </div>
              <button
                onClick={() => setRequestModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRequestRide} className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Pickup Location</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Alaba Electricals Hub"
                    value={pickupName}
                    onChange={(e) => setPickupName(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 rounded-lg border border-slate-200 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none mb-2"
                  />
                  <LocationPicker
                    value={pickupLocation}
                    onChange={setPickupLocation}
                    placeholder="Full pickup address"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Dropoff Location</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Jaja Hall, Room 304"
                    value={dropoffName}
                    onChange={(e) => setDropoffName(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 rounded-lg border border-slate-200 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none mb-2"
                  />
                  <LocationPicker
                    value={dropoffLocation}
                    onChange={setDropoffLocation}
                    placeholder="Full dropoff address"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Notes (optional)</label>
                  <textarea
                    rows={2}
                    placeholder="What's being delivered?"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 rounded-lg border border-slate-200 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-[11px] text-slate-600 flex items-start gap-2">
                <Lock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <span>A rider will be matched automatically once posted. You can track live progress after submitting.</span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRequestModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-1.5 px-5 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white text-xs font-bold rounded-lg shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  {submitting ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};