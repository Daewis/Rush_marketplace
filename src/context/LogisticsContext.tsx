import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import { DriverProfile, RideRequest } from "../types";
import { logisticsApi, handleApiError } from "../lib/api";
import { useAuthContext } from "./AuthContext";
import { useAppStore } from "../store/app-store";

interface LogisticsContextType {
  drivers: DriverProfile[];
  rides: RideRequest[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  requestRide: (
    ride: Omit<RideRequest, "id" | "status" | "trackingCode" | "createdAt" | "fare"> & { fare?: number }
  ) => Promise<RideRequest | null>;
  cancelRide: (rideId: string, reason: string) => Promise<void>;
  assignDriver: (rideId: string, driverId: string) => Promise<void>;
  setDriverStatus: (driverUserId: string, status: DriverProfile["status"]) => Promise<void>;
  logDispatchEvent: (rideId: string, event: "picked_up" | "arrived" | "completed") => Promise<void>;
  onboardDriver: (data: { vehicleType: string; vehiclePlateNumber: string; licenseNumber: string }) => Promise<boolean>;
  myLiveLocation: { lat: number; lng: number } | null;
  gpsError: string | null;
}

const LogisticsContext = createContext<LogisticsContextType | undefined>(undefined);

// How often to re-poll while this context is mounted. There's no
// websocket/SSE layer in the backend yet, so short-interval polling is
// the "real-time enough" approach — swap this for a socket subscription
// later without changing anything that consumes useLogistics().
const POLL_INTERVAL_MS = 8000;

// Maps the backend's snake_case Ride shape (server/routes/logistics/rides.ts
// formatRide) onto the frontend's camelCase RideRequest type, so
// RideBoard.tsx and DispatchTracker.tsx don't need to change at all.
function mapRide(apiRide: any): RideRequest {
  return {
    id: apiRide.id,
    customerId: apiRide.customer_id,
    customerName: apiRide.customer_name || "Customer",
    customerPhone: apiRide.customer_phone || undefined,
    driverId: apiRide.driver_id || undefined,
    driverName: apiRide.driver_name || undefined,
    driverPhone: apiRide.driver_phone || undefined,
    sourceJobId: apiRide.source_job_id || undefined,
    sourceJobTitle: apiRide.source_job_title || undefined,
    pickupName: apiRide.pickup?.name || "",
    pickupAddress: apiRide.pickup?.address || "",
    pickupLat: apiRide.pickup?.lat ?? undefined,
    pickupLng: apiRide.pickup?.lng ?? undefined,
    dropoffName: apiRide.dropoff?.name || "",
    dropoffAddress: apiRide.dropoff?.address || "",
    dropoffLat: apiRide.dropoff?.lat ?? undefined,
    dropoffLng: apiRide.dropoff?.lng ?? undefined,
    driverLocation: apiRide.driver_location
      ? { lat: apiRide.driver_location.lat, lng: apiRide.driver_location.lng }
      : undefined,
    itemType: apiRide.item_type || undefined,
    notes: apiRide.notes || undefined,
    fare: apiRide.fare ?? 0,
    status: apiRide.status,
    trackingCode: apiRide.tracking_code,
    createdAt: apiRide.created_at,
    pickedUpAt: apiRide.picked_up_at || undefined,
    completedAt: apiRide.completed_at || undefined,
    cancelledAt: apiRide.cancelled_at || undefined,
    cancellationReason: apiRide.cancellation_reason || undefined,
  };
}

function mapDriver(apiDriver: any): DriverProfile {
  return {
    id: apiDriver.id,
    userId: apiDriver.user_id,
    displayName: apiDriver.name || "Driver",
    phone: apiDriver.phone || "",
    avatar: "",
    vehicleType: apiDriver.vehicle_type,
    vehiclePlateNumber: apiDriver.vehicle_plate_number,
    licenseVerified: !!apiDriver.license_verified,
    status: apiDriver.status,
    rating: apiDriver.rating ?? 5,
    totalTrips: apiDriver.total_trips ?? 0,
  };
}

export const LogisticsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuthContext();
  const storeUser = useAppStore((state) => state.user);
  const setStoreUser = useAppStore((state) => state.setUser);
  const isDriver = user?.role === "driver";

  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [rides, setRides] = useState<RideRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Tracked locally because `drivers` state only ever holds the "available"
  // list from the backend — a driver who's offline or on_trip won't be in
  // it, so it can't tell us our OWN current status to gate GPS watching on.
  const [selfDriverStatus, setSelfDriverStatus] = useState<DriverProfile["status"] | null>(null);
  const [myLiveLocation, setMyLiveLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const lastLocationPushRef = useRef<number>(0);

  const fetchAll = useCallback(async (showLoading: boolean) => {
    if (!user) {
      setRides([]);
      setDrivers([]);
      return;
    }

    if (showLoading) setLoading(true);
    setError(null);

    try {
      // Drivers browse open + their own rides; everyone else just needs their own.
      const ridesPromise = isDriver
        ? Promise.all([logisticsApi.openRides(), logisticsApi.myRides()])
        : logisticsApi.myRides().then((res) => [res, null] as const);

      const [ridesResult, driversResult] = await Promise.all([
        ridesPromise,
        logisticsApi.availableDrivers().catch(() => null),
      ]);

      if (isDriver) {
        const [openRes, myRes] = ridesResult as any;
        const open = (openRes.data?.data?.rides || []).map(mapRide);
        const mine = (myRes.data?.data?.rides || []).map(mapRide);
        const merged = [...mine, ...open.filter((o: RideRequest) => !mine.some((m: RideRequest) => m.id === o.id))];
        setRides(merged);
      } else {
        const [myRes] = ridesResult as any;
        setRides((myRes.data?.data?.rides || []).map(mapRide));
      }

      if (driversResult) {
        setDrivers((driversResult.data?.data?.drivers || []).map(mapDriver));
      }
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [user, isDriver]);

  useEffect(() => {
    fetchAll(true);

    if (pollRef.current) clearInterval(pollRef.current);
    if (user) {
      pollRef.current = setInterval(() => fetchAll(false), POLL_INTERVAL_MS);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, isDriver]);

  const refresh = () => fetchAll(false);

  // Real device GPS tracking — only runs for a driver who has gone
  // online (available or on_trip). Updates `myLiveLocation` on every fix
  // for instant local map rendering, but only pushes to the backend at
  // most once per POLL_INTERVAL_MS to avoid hammering the API on every
  // GPS tick (which can fire multiple times a second on some devices).
  useEffect(() => {
    const shouldWatch = isDriver && (selfDriverStatus === "available" || selfDriverStatus === "on_trip");
    if (!shouldWatch) {
      setMyLiveLocation(null);
      return;
    }

    if (!("geolocation" in navigator)) {
      setGpsError("This device/browser doesn't support GPS location.");
      return;
    }

    setGpsError(null);
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setMyLiveLocation({ lat: latitude, lng: longitude });

        const now = Date.now();
        if (now - lastLocationPushRef.current >= POLL_INTERVAL_MS) {
          lastLocationPushRef.current = now;
          logisticsApi.setDriverLocation({ lat: latitude, lng: longitude }).catch(() => {
            // Silent — a single missed location push isn't worth
            // interrupting the driver with a toast every few seconds.
          });
        }
      },
      (err) => {
        setGpsError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission denied — enable it to appear on the live map and receive nearby requests."
            : "Could not get your GPS location."
        );
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [isDriver, selfDriverStatus]);

  const requestRide: LogisticsContextType["requestRide"] = async (rideData) => {
    try {
      const response = await logisticsApi.createRide({
        pickup: {
          name: rideData.pickupName,
          address: rideData.pickupAddress,
          lat: rideData.pickupLat,
          lng: rideData.pickupLng,
        },
        dropoff: {
          name: rideData.dropoffName,
          address: rideData.dropoffAddress,
          lat: rideData.dropoffLat,
          lng: rideData.dropoffLng,
        },
        itemType: rideData.itemType,
        notes: rideData.notes,
        sourceJobId: rideData.sourceJobId,
      });

      if (!response.data?.success || !response.data.data) {
        toast.error(response.data?.message || "Could not submit delivery request");
        return null;
      }

      const newRide = mapRide(response.data.data.ride);
      setRides((prev) => [newRide, ...prev]);
      toast.success("Delivery request submitted — looking for a rider.");
      return newRide;
    } catch (err) {
      toast.error(handleApiError(err));
      return null;
    }
  };

  const cancelRide = async (rideId: string, reason: string) => {
    try {
      const response = await logisticsApi.cancelRide(rideId, { reason });
      if (response.data?.success && response.data.data) {
        const updated = mapRide(response.data.data.ride);
        setRides((prev) => prev.map((r) => (r.id === rideId ? updated : r)));
        toast.info("Delivery request cancelled");
      } else {
        toast.error(response.data?.message || "Could not cancel this delivery");
      }
    } catch (err) {
      toast.error(handleApiError(err));
    }
  };

  const assignDriver = async (rideId: string, driverId: string) => {
    try {
      // driverId here is the Driver *profile* id in local state, but the
      // backend now derives the driver from the authenticated user for
      // self-assign — dispatcher/admin flows can still pass driverUserId.
      const driverProfile = drivers.find((d) => d.id === driverId);
      const response = await logisticsApi.assignDriver(
        rideId,
        isDriver ? undefined : { driverUserId: driverProfile?.userId }
      );
      if (response.data?.success && response.data.data) {
        const updated = mapRide(response.data.data.ride);
        setRides((prev) => prev.map((r) => (r.id === rideId ? updated : r)));
        refresh(); // driver availability changed too
        toast.success("Delivery accepted!");
      } else {
        toast.error(response.data?.message || "Could not accept this delivery");
      }
    } catch (err) {
      toast.error(handleApiError(err));
    }
  };

  const setDriverStatus = async (_driverUserId: string, status: DriverProfile["status"]) => {
    try {
      const response = await logisticsApi.setDriverStatus({ status });
      if (response.data?.success && response.data.data) {
        const updated = mapDriver(response.data.data.driver);
        setDrivers((prev) => prev.map((d) => (d.userId === updated.userId ? updated : d)));
        setSelfDriverStatus(updated.status);
      } else {
        toast.error(response.data?.message || "Could not update your status");
      }
    } catch (err) {
      toast.error(handleApiError(err));
    }
  };

  const logDispatchEvent = async (rideId: string, event: "picked_up" | "arrived" | "completed") => {
    try {
      const response = await logisticsApi.logDispatchEvent(rideId, { event });
      if (response.data?.success && response.data.data) {
        const { status } = response.data.data;
        setRides((prev) => prev.map((r) => (r.id === rideId ? { ...r, status: status as any } : r)));
        refresh(); // pull the fully updated ride (timestamps, driver availability)
      } else {
        toast.error(response.data?.message || "Could not update delivery status");
      }
    } catch (err) {
      toast.error(handleApiError(err));
    }
  };

  const onboardDriver: LogisticsContextType["onboardDriver"] = async (data) => {
    try {
      const response = await logisticsApi.onboardDriver(data);
      if (!response.data?.success) {
        toast.error(response.data?.message || "Could not complete driver onboarding");
        return false;
      }

      const responseData = response.data.data as any;

      // Onboarding grants the DRIVER role server-side immediately — sync
      // the local store the same way switchRole does, so the app treats
      // this user as a driver right away without needing a fresh login.
      if (storeUser) {
        setStoreUser({
          ...storeUser,
          role: "driver",
          roles: (responseData?.roles || [...(storeUser as any).roles || [], "DRIVER"]).map((r: string) =>
            r.toLowerCase()
          ),
        } as any);
      }

      if (responseData?.driver) {
        setDrivers((prev) => [mapDriver(responseData.driver), ...prev]);
      }

      toast.success("You're onboarded as a rider! Go online from the Deliveries tab to start accepting requests.");
      return true;
    } catch (err) {
      toast.error(handleApiError(err));
      return false;
    }
  };

  return (
    <LogisticsContext.Provider
      value={{
        drivers,
        rides,
        loading,
        error,
        refresh,
        requestRide,
        cancelRide,
        assignDriver,
        setDriverStatus,
        logDispatchEvent,
        onboardDriver,
        myLiveLocation,
        gpsError,
      }}
    >
      {children}
    </LogisticsContext.Provider>
  );
};

export const useLogistics = () => {
  const context = useContext(LogisticsContext);
  if (!context) {
    throw new Error("useLogistics must be used within a LogisticsProvider");
  }
  return context;
};