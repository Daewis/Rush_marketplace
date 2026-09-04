import React, { useState } from "react";
import {
  Truck,
  MapPin,
  CheckCircle2,
  Circle,
  Phone,
  Clock,
  Package,
  ArrowRight,
  User,
} from "lucide-react";
import { useLogistics } from "../../context/LogisticsContext";
import { useAuthContext } from "../../context/AuthContext";
import { LiveMap, MapMarker } from "./LiveMap";

interface DispatchTrackerProps {
  rideId?: string;
}

const STEPS: { key: string; label: string }[] = [
  { key: "requested", label: "Requested" },
  { key: "assigned", label: "Rider Assigned" },
  { key: "picked_up", label: "Picked Up" },
  { key: "in_transit", label: "En Route" },
  { key: "completed", label: "Delivered" },
];

export const DispatchTracker: React.FC<DispatchTrackerProps> = ({ rideId }) => {
  const { user } = useAuthContext();
  const { rides, loading, logDispatchEvent } = useLogistics();

  const trackableRides = rides.filter((r) => r.status !== "cancelled");
  const [selectedRideId, setSelectedRideId] = useState<string>(
    rideId || trackableRides[0]?.id || ""
  );

  const ride = rides.find((r) => r.id === selectedRideId) || trackableRides[0];
  const isAssignedDriver = user?.role === "driver" && ride?.driverId === user.uid;

  if (loading && !ride) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-xs text-slate-500 font-semibold">
        Loading delivery status…
      </div>
    );
  }

  if (!ride) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-2">
        <Truck className="w-8 h-8 text-slate-300 mx-auto" />
        <h3 className="font-bold text-sm text-slate-800">No Deliveries to Track</h3>
        <p className="text-xs text-slate-500">Request a delivery to see live tracking here.</p>
      </div>
    );
  }

  const currentStepIndex = ride.status === "cancelled" ? -1 : STEPS.findIndex((s) => s.key === ride.status);

  const markers: MapMarker[] = [];
  if (ride.driverLocation) {
    markers.push({
      id: "driver",
      lat: ride.driverLocation.lat,
      lng: ride.driverLocation.lng,
      color: "#ea580c",
      label: ride.driverName ? `${ride.driverName}'s live position` : "Rider's live position",
      variant: "pulse",
    });
  }
  if (ride.pickupLat && ride.pickupLng) {
    markers.push({
      id: "pickup",
      lat: ride.pickupLat,
      lng: ride.pickupLng,
      color: "#2563eb",
      label: ride.pickupName,
      variant: "pin",
    });
  }
  if (ride.dropoffLat && ride.dropoffLng) {
    markers.push({
      id: "dropoff",
      lat: ride.dropoffLat,
      lng: ride.dropoffLng,
      color: "#16a34a",
      label: ride.dropoffName,
      variant: "pin",
    });
  }
  const showMap = markers.length > 0 && ride.status !== "cancelled" && ride.status !== "completed";

  return (
    <div className="space-y-4">
      {/* Ride selector, when multiple */}
      {trackableRides.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {trackableRides.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelectedRideId(r.id)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition ${
                r.id === ride.id
                  ? "bg-orange-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {r.trackingCode}
            </button>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">
              Tracking Code
            </p>
            <h3 className="text-base font-extrabold text-slate-900">{ride.trackingCode}</h3>
            {ride.sourceJobTitle && (
              <p className="text-[11px] text-slate-500 mt-0.5">For job: {ride.sourceJobTitle}</p>
            )}
          </div>
          <span className="text-sm font-black text-slate-900">₦{ride.fare.toLocaleString()}</span>
        </div>

        {/* Route */}
        <div className="flex items-center gap-2 text-xs bg-slate-50 border border-slate-200 rounded-lg p-3">
          <MapPin className="w-4 h-4 text-orange-600 shrink-0" />
          <span className="font-semibold text-slate-800 truncate">{ride.pickupName}</span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="font-semibold text-slate-800 truncate">{ride.dropoffName}</span>
        </div>

        {/* Live Map — only renders markers we actually have real coordinates
            for. The driver's own GPS marker will show once they're
            assigned and online; pickup/dropoff pins only appear if this
            request was created with coordinates (no map-picker exists in
            the request form yet, so most requests won't have them). */}
        {showMap && <LiveMap markers={markers} height="260px" />}

        {/* Status Timeline */}
        {ride.status === "cancelled" ? (
          <div className="bg-slate-100 rounded-lg p-3 text-xs text-slate-500 font-semibold text-center">
            This delivery was cancelled{ride.cancellationReason ? `: ${ride.cancellationReason}` : "."}
          </div>
        ) : (
          <div className="flex items-center">
            {STEPS.map((step, i) => (
              <React.Fragment key={step.key}>
                <div className="flex flex-col items-center gap-1 flex-1">
                  {i <= currentStepIndex ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <Circle className="w-5 h-5 text-slate-300" />
                  )}
                  <span
                    className={`text-[9px] font-bold text-center leading-tight ${
                      i <= currentStepIndex ? "text-slate-800" : "text-slate-400"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 -mt-4 ${
                      i < currentStepIndex ? "bg-emerald-400" : "bg-slate-200"
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Driver info */}
        {ride.driverName && (
          <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg p-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                <User className="w-4 h-4 text-slate-500" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">{ride.driverName}</p>
                <p className="text-[10px] text-slate-500">Your rider</p>
              </div>
            </div>
            {ride.driverPhone && (
              <a
                href={`tel:${ride.driverPhone}`}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 text-[11px] font-bold rounded-lg"
              >
                <Phone className="w-3.5 h-3.5" /> Call
              </a>
            )}
          </div>
        )}

        {/* Driver-only milestone actions */}
        {isAssignedDriver && ride.status !== "completed" && ride.status !== "cancelled" && (
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
            {ride.status === "assigned" && (
              <button
                onClick={() => logDispatchEvent(ride.id, "picked_up")}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-lg"
              >
                <Package className="w-3.5 h-3.5" /> Mark Picked Up
              </button>
            )}
            {ride.status === "picked_up" && (
              <button
                onClick={() => logDispatchEvent(ride.id, "arrived")}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-lg"
              >
                <Clock className="w-3.5 h-3.5" /> Mark Arrived
              </button>
            )}
            {ride.status === "in_transit" && (
              <button
                onClick={() => logDispatchEvent(ride.id, "completed")}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Mark Delivered
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};