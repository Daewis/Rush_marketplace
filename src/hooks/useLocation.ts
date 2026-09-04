import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

export interface LocationState {
  lat: number;
  lng: number;
  accuracy?: number;
  address?: string;
  heading?: number | null;
  speed?: number | null;
}

export function useLocation() {
  const [location, setLocation] = useState<LocationState | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const watchIdRef = useRef<number | null>(null);
  const addressCacheRef = useRef<Map<string, string>>(new Map());

  const getCurrentLocation = useCallback((): Promise<LocationState> => {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !navigator.geolocation) {
        const msg = 'Geolocation is not supported by your browser';
        setError(msg);
        reject(new Error(msg));
        return;
      }

      setLoading(true);
      setError(null);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy, heading, speed } = position.coords;
          const newLocation: LocationState = {
            lat: latitude,
            lng: longitude,
            accuracy,
            heading,
            speed,
          };
          setLocation(newLocation);
          setLoading(false);
          resolve(newLocation);
        },
        (err) => {
          let message = 'Failed to get location';
          if (err.code === err.PERMISSION_DENIED) {
            message = 'Location access denied. Please enable GPS permissions.';
          } else if (err.code === err.POSITION_UNAVAILABLE) {
            message = 'GPS signal unavailable. Try moving outdoors.';
          } else if (err.code === err.TIMEOUT) {
            message = 'GPS request timed out. Please try again.';
          }
          setError(message);
          setLoading(false);
          reject(new Error(message));
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
      );
    });
  }, []);

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null && typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  const startWatching = useCallback(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      const msg = 'Geolocation is not supported';
      toast.error(msg);
      setError(msg);
      return null;
    }

    stopWatching();

    const id = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy, heading, speed } = position.coords;
        setLocation((prev) => ({
          ...prev,
          lat: latitude,
          lng: longitude,
          accuracy,
          heading,
          speed,
        }));
        setError(null);
      },
      (err) => {
        let message = 'Failed to watch location';
        if (err.code === err.PERMISSION_DENIED) message = 'Please enable GPS permissions';
        else if (err.code === err.POSITION_UNAVAILABLE) message = 'GPS signal lost';
        else if (err.code === err.TIMEOUT) message = 'GPS connection timed out';
        setError(message);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 2000 }
    );

    watchIdRef.current = id;
    return id;
  }, [stopWatching]);

  const reverseGeocode = useCallback(async (lat: number, lng: number): Promise<string> => {
    const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    
    if (addressCacheRef.current.has(key)) {
      return addressCacheRef.current.get(key)!;
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'en',
            'User-Agent': 'RushNG Logistics App',
          },
        }
      );

      if (!response.ok) throw new Error('Geocoding service unavailable');

      const data = await response.json();
      const address = data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      
      addressCacheRef.current.set(key, address);
      return address;
    } catch {
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
  }, []);

  const calculateDistance = useCallback((lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371;
    const toRad = (angle: number) => (angle * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(Math.min(1, a)), Math.sqrt(Math.max(0, 1 - a)));
    return R * c;
  }, []);

  useEffect(() => {
    return () => {
      stopWatching();
    };
  }, [stopWatching]);

  return {
    location,
    loading,
    error,
    isWatching: watchIdRef.current !== null,
    getCurrentLocation,
    startWatching,
    stopWatching,
    reverseGeocode,
    calculateDistance,
  };
}
