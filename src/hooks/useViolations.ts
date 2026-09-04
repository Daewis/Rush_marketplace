import { useState, useEffect, useCallback } from 'react';
import { violationApi } from '@/lib/api';
import { toast } from 'sonner';
import type { Violation } from '@/types';

export interface PaginationState {
  page: number;
  per_page: number;
  total: number;
  pages: number;
}

export interface UseViolationsOptions {
  autoFetch?: boolean;
  initialParams?: Record<string, any>;
}

export function useViolations(options: UseViolationsOptions = {}) {
  const { autoFetch = true, initialParams } = options;

  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    per_page: 20,
    total: 0,
    pages: 0,
  });

  const fetchViolations = useCallback(
    async (params?: Record<string, any>) => {
      setLoading(true);
      setError(null);
      try {
        const queryParams = { ...initialParams, ...params };
        const response = await violationApi.my(queryParams);

        if (response.data?.success) {
          const resData = response.data.data || {};

          const list: Violation[] = Array.isArray(resData)
            ? resData
            : (resData as any).violations || (resData as any).items || (response.data as any)?.violations || [];

          setViolations(list);

          if ((resData as any).pagination) {
            setPagination((resData as any).pagination);
          } else if ((response.data as any)?.pagination) {
            setPagination((response.data as any).pagination);
          }
        } else {
          setError(response.data?.message || 'Failed to load violations');
        }
      } catch (err: any) {
        const msg =
          err.response?.data?.error ||
          err.response?.data?.message ||
          'Failed to load violations. Please try again.';
        setError(msg);
        toast.error('Failed to load violations');
      } finally {
        setLoading(false);
      }
    },
    [initialParams]
  );

  const reportViolation = useCallback(
    async (data: Record<string, any>): Promise<any | null> => {
      setLoading(true);
      try {
        const response = await violationApi.report(data);
        if (response.data?.success) {
          toast.success('Violation reported successfully. Admin will review.');
          await fetchViolations();
          return response.data.data;
        }
        toast.error(response.data?.message || 'Failed to report violation');
        return null;
      } catch (err: any) {
        toast.error(
          err.response?.data?.error ||
            err.response?.data?.message ||
            'Failed to report violation'
        );
        return null;
      } finally {
        setLoading(false);
      }
    },
    [fetchViolations]
  );

  const appealViolation = useCallback(
    async (id: string, data: Record<string, any>): Promise<any | null> => {
      setLoading(true);
      try {
        const response = await violationApi.appeal(id, data);
        if (response.data?.success) {
          toast.success('Appeal submitted successfully.');

          setViolations((prev) =>
            prev.map((v) =>
              v.id === id ? { ...v, status: 'appealed' as any } : v
            )
          );

          await fetchViolations();
          return response.data.data;
        }
        toast.error(response.data?.message || 'Failed to submit appeal');
        return null;
      } catch (err: any) {
        toast.error(
          err.response?.data?.error ||
            err.response?.data?.message ||
            'Failed to submit appeal'
        );
        return null;
      } finally {
        setLoading(false);
      }
    },
    [fetchViolations]
  );

  const getViolationStats = useCallback(async (): Promise<Record<string, any> | null> => {
    try {
      const response = await violationApi.stats();
      if (response.data?.success) {
        return response.data.data as Record<string, any>;
      }
      return null;
    } catch {
      toast.error('Failed to load violation stats');
      return null;
    }
  }, []);

  useEffect(() => {
    if (autoFetch) {
      fetchViolations();
    }
  }, [autoFetch, fetchViolations]);

  return {
    violations,
    loading,
    error,
    pagination,
    fetchViolations,
    reportViolation,
    appealViolation,
    getViolationStats,
  };
}
