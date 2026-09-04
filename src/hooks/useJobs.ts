import { useState, useEffect, useCallback } from 'react';
import { jobApi } from '@/lib/api';
import { toast } from 'sonner';
import type { Job } from '@/types';

export interface PaginationState {
  page: number;
  per_page: number;
  total: number;
  pages: number;
}

export interface UseJobsOptions {
  initialFilters?: Record<string, any>;
  autoFetch?: boolean;
}

export function useJobs(options: UseJobsOptions = {}) {
  const { initialFilters = {}, autoFetch = true } = options;

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<string, any>>(initialFilters);
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    per_page: 20,
    total: 0,
    pages: 0,
  });

  const fetchJobs = useCallback(
    async (params?: Record<string, any>) => {
      setLoading(true);
      setError(null);
      try {
        const queryParams = { ...filters, ...params };
        const response = await jobApi.list(queryParams);

        if (response.data?.success) {
          const resData = response.data.data;

          const jobList = Array.isArray(resData)
            ? resData
            : (resData as any)?.jobs || (response.data as any)?.jobs || [];

          setJobs(jobList);

          if ((resData as any)?.pagination) {
            setPagination((resData as any).pagination);
          } else if ((response.data as any)?.pagination) {
            setPagination((response.data as any).pagination);
          }
        } else {
          const msg = response.data?.message || 'Failed to load jobs';
          setError(msg);
        }
      } catch (err: any) {
        const msg =
          err.response?.data?.error ||
          err.response?.data?.message ||
          'Failed to load jobs. Please check your network connection.';
        setError(msg);
        toast.error('Failed to load jobs');
      } finally {
        setLoading(false);
      }
    },
    [filters]
  );

  useEffect(() => {
    if (autoFetch) {
      fetchJobs();
    }
  }, [autoFetch, fetchJobs]);

  const updateFilters = useCallback((newFilters: Record<string, any>) => {
    setFilters((prev) => ({
      ...prev,
      ...newFilters,
      page: 1,
    }));
  }, []);

  const createJob = useCallback(
    async (data: any) => {
      try {
        const response = await jobApi.create(data);
        if (response.data?.success) {
          toast.success('Job posted successfully!');
          fetchJobs();
          return response.data.data;
        }
        toast.error(response.data?.message || 'Failed to post job');
        return null;
      } catch (err: any) {
        toast.error(
          err.response?.data?.error || err.response?.data?.message || 'Failed to post job'
        );
        return null;
      }
    },
    [fetchJobs]
  );

  const updateJob = useCallback(
    async (id: string, data: any) => {
      try {
        const response = await jobApi.update(id, data);
        if (response.data?.success) {
          toast.success('Job updated successfully!');
          fetchJobs();
          return response.data.data;
        }
        toast.error(response.data?.message || 'Failed to update job');
        return null;
      } catch (err: any) {
        toast.error(
          err.response?.data?.error || err.response?.data?.message || 'Failed to update job'
        );
        return null;
      }
    },
    [fetchJobs]
  );

  const deleteJob = useCallback(
    async (id: string) => {
      try {
        const response = await jobApi.delete(id);
        if (response.data?.success) {
          toast.success('Job deleted successfully!');
          fetchJobs();
          return true;
        }
        toast.error(response.data?.message || 'Failed to delete job');
        return false;
      } catch (err: any) {
        toast.error(
          err.response?.data?.error || err.response?.data?.message || 'Failed to delete job'
        );
        return false;
      }
    },
    [fetchJobs]
  );

  const applyToJob = useCallback(
    async (id: string, data?: any) => {
      try {
        const response = await jobApi.apply(id, data);
        if (response.data?.success) {
          toast.success('Applied successfully!');
          fetchJobs();
          return response.data.data;
        }
        toast.error(response.data?.message || 'Failed to apply');
        return null;
      } catch (err: any) {
        toast.error(
          err.response?.data?.error || err.response?.data?.message || 'Failed to apply'
        );
        return null;
      }
    },
    [fetchJobs]
  );

  const checkIn = useCallback(async (id: string, data: any) => {
    try {
      const response = await jobApi.checkIn(id, data);
      if (response.data?.success) {
        toast.success('Checked in successfully!');
        return response.data.data;
      }
      toast.error(response.data?.message || 'Check-in failed');
      return null;
    } catch (err: any) {
      toast.error(
        err.response?.data?.error || err.response?.data?.message || 'Check-in failed'
      );
      return null;
    }
  }, []);

  const checkOut = useCallback(async (id: string, data: any) => {
    try {
      const response = await jobApi.checkOut(id, data);
      if (response.data?.success) {
        toast.success('Checked out successfully!');
        return response.data.data;
      }
      toast.error(response.data?.message || 'Check-out failed');
      return null;
    } catch (err: any) {
      toast.error(
        err.response?.data?.error || err.response?.data?.message || 'Check-out failed'
      );
      return null;
    }
  }, []);

  const confirmJob = useCallback(
    async (id: string, data?: any) => {
      try {
        const response = await jobApi.confirm(id, data);
        if (response.data?.success) {
          toast.success('Job confirmed!');
          fetchJobs();
          return response.data.data;
        }
        toast.error(response.data?.message || 'Failed to confirm');
        return null;
      } catch (err: any) {
        toast.error(
          err.response?.data?.error || err.response?.data?.message || 'Failed to confirm'
        );
        return null;
      }
    },
    [fetchJobs]
  );

  const cancelJob = useCallback(
    async (id: string, reason?: string) => {
      try {
        const response = await jobApi.cancel(id, { reason });
        if (response.data?.success) {
          toast.success('Job cancelled');
          fetchJobs();
          return response.data.data;
        }
        toast.error(response.data?.message || 'Failed to cancel');
        return null;
      } catch (err: any) {
        toast.error(
          err.response?.data?.error || err.response?.data?.message || 'Failed to cancel'
        );
        return null;
      }
    },
    [fetchJobs]
  );

  return {
    jobs,
    loading,
    error,
    pagination,
    filters,
    setFilters,
    updateFilters,
    fetchJobs,
    createJob,
    updateJob,
    deleteJob,
    applyToJob,
    checkIn,
    checkOut,
    confirmJob,
    cancelJob,
  };
}
