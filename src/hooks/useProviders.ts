import { useState, useEffect, useCallback, useRef } from 'react';
import { providerApi } from '@/lib/api';
import { toast } from 'sonner';
import type { Provider } from '@/types';

export interface PaginationState {
  page: number;
  per_page: number;
  total: number;
  pages: number;
}

export interface UseProvidersOptions {
  initialFilters?: Record<string, any>;
  autoFetch?: boolean;
}

export function useProviders(options: UseProvidersOptions = {}) {
  const { initialFilters = {}, autoFetch = true } = options;

  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<string, any>>(initialFilters);
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    per_page: 20,
    total: 0,
    pages: 0,
  });

  const initialFiltersRef = useRef(initialFilters);

  const fetchProviders = useCallback(
    async (params?: Record<string, any>) => {
      setLoading(true);
      setError(null);
      try {
        const queryParams = { ...filters, ...params };
        const response = await providerApi.search(queryParams);

        if (response.data?.success) {
          const resData = response.data.data || {};

          const list: Provider[] = Array.isArray(resData)
            ? resData
            : (resData as any).providers || (resData as any).items || (response.data as any)?.providers || [];

          setProviders(list);

          if ((resData as any).pagination) {
            setPagination((resData as any).pagination);
          } else if ((response.data as any)?.pagination) {
            setPagination((response.data as any).pagination);
          }
        } else {
          const msg = response.data?.message || 'Failed to load providers';
          setError(msg);
        }
      } catch (err: any) {
        const msg =
          err.response?.data?.error ||
          err.response?.data?.message ||
          'Failed to load providers. Please try again.';
        setError(msg);
        toast.error('Failed to load providers');
      } finally {
        setLoading(false);
      }
    },
    [filters]
  );

  const updateFilters = useCallback((newFilters: Record<string, any>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(initialFiltersRef.current);
  }, []);

  const registerProvider = useCallback(async (data: Record<string, any>): Promise<Provider | null> => {
    setLoading(true);
    try {
      const response = await providerApi.register(data);
      if (response.data?.success) {
        toast.success('Provider registration successful!');
        return response.data.data.provider || response.data.data;
      }
      toast.error(response.data?.message || 'Registration failed');
      return null;
    } catch (err: any) {
      toast.error(
        err.response?.data?.error ||
          err.response?.data?.message ||
          'Registration failed'
      );
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProvider = useCallback(async (data: Record<string, any>): Promise<Provider | null> => {
    setLoading(true);
    try {
      const response = await providerApi.update(data);
      if (response.data?.success) {
        toast.success('Profile updated successfully!');
        const updated = response.data.data.provider || response.data.data;

        if (updated?.id) {
          setProviders((prev) =>
            prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p))
          );
        }

        return updated;
      }
      toast.error(response.data?.message || 'Failed to update profile');
      return null;
    } catch (err: any) {
      toast.error(
        err.response?.data?.error ||
          err.response?.data?.message ||
          'Failed to update profile'
      );
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const verifyProvider = useCallback(async (data: Record<string, any>): Promise<any | null> => {
    try {
      const response = await providerApi.verify(data);
      if (response.data?.success) {
        toast.success('Verification submitted! Awaiting review.');
        return response.data.data;
      }
      toast.error(response.data?.message || 'Verification failed');
      return null;
    } catch (err: any) {
      toast.error(
        err.response?.data?.error ||
          err.response?.data?.message ||
          'Verification failed'
      );
      return null;
    }
  }, []);

  const updateAvailability = useCallback(async (data: Record<string, any>): Promise<any | null> => {
    try {
      const response = await providerApi.availability(data);
      if (response.data?.success) {
        toast.success('Availability updated!');
        return response.data.data;
      }
      toast.error(response.data?.message || 'Failed to update availability');
      return null;
    } catch (err: any) {
      toast.error(
        err.response?.data?.error ||
          err.response?.data?.message ||
          'Failed to update availability'
      );
      return null;
    }
  }, []);

  const getProviderStats = useCallback(async (): Promise<Record<string, any> | null> => {
    try {
      const response = await providerApi.stats();
      if (response.data?.success) {
        return response.data.data as Record<string, any>;
      }
      return null;
    } catch {
      toast.error('Failed to load stats');
      return null;
    }
  }, []);

  useEffect(() => {
    if (autoFetch) {
      fetchProviders();
    }
  }, [autoFetch, fetchProviders]);

  return {
    providers,
    loading,
    error,
    pagination,
    filters,
    setFilters,
    updateFilters,
    resetFilters,
    fetchProviders,
    registerProvider,
    updateProvider,
    verifyProvider,
    updateAvailability,
    getProviderStats,
  };
}
