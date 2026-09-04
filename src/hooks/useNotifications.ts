import { useState, useEffect, useCallback, useRef } from 'react';
import { notificationApi } from '@/lib/api';
import { toast } from 'sonner';
import type { Notification } from '@/types';

export interface PaginationState {
  page: number;
  per_page: number;
  total: number;
  pages: number;
}

export interface UseNotificationsOptions {
  autoFetch?: boolean;
  pollInterval?: number;
  initialParams?: Record<string, any>;
}

export function useNotifications(options: UseNotificationsOptions = {}) {
  const { autoFetch = true, pollInterval, initialParams } = options;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    per_page: 20,
    total: 0,
    pages: 0,
  });

  const pollTimerRef = useRef<any>(null);

  const fetchNotifications = useCallback(
    async (params?: Record<string, any>) => {
      setLoading(true);
      setError(null);
      try {
        const queryParams = { ...initialParams, ...params };
        const response = await notificationApi.list(queryParams);

        if (response.data?.success) {
          const resData = response.data.data || {};

          const list: Notification[] = Array.isArray(resData)
            ? resData
            : (resData as any).notifications || (resData as any).items || (response.data as any)?.notifications || [];

          setNotifications(list);

          const count =
            (resData as any).unread_count ??
            (resData as any).unreadCount ??
            (response.data as any)?.unread_count ??
            list.filter((n: any) => !n.is_read && !n.read).length;

          setUnreadCount(count);

          if ((resData as any).pagination) {
            setPagination((resData as any).pagination);
          } else if ((response.data as any)?.pagination) {
            setPagination((response.data as any).pagination);
          }
        } else {
          setError(response.data?.message || 'Failed to load notifications');
        }
      } catch (err: any) {
        const msg =
          err.response?.data?.error ||
          err.response?.data?.message ||
          'Failed to load notifications. Please try again.';
        setError(msg);
        toast.error('Failed to load notifications');
      } finally {
        setLoading(false);
      }
    },
    [initialParams]
  );

  const getUnreadCount = useCallback(async (): Promise<number> => {
    try {
      const response = await notificationApi.unreadCount();
      if (response.data?.success) {
        const count =
          response.data.data?.count ??
          response.data.data?.unread_count ??
          (response.data as any)?.count ??
          0;
        setUnreadCount(count);
        return count;
      }
      return 0;
    } catch {
      return 0;
    }
  }, []);

  const markAsRead = useCallback(async (id: string): Promise<boolean> => {
    let previousNotifications: Notification[] = [];
    let previousUnreadCount = 0;

    setNotifications((prev) => {
      previousNotifications = prev;
      return prev.map((n: any) =>
        n.id === id ? { ...n, is_read: true, read: true } : n
      );
    });

    setUnreadCount((prev) => {
      previousUnreadCount = prev;
      return Math.max(0, prev - 1);
    });

    try {
      const response = await notificationApi.markRead(id);
      if (response.data?.success) {
        return true;
      }
      setNotifications(previousNotifications);
      setUnreadCount(previousUnreadCount);
      toast.error(response.data?.message || 'Failed to mark notification as read');
      return false;
    } catch (err: any) {
      setNotifications(previousNotifications);
      setUnreadCount(previousUnreadCount);
      toast.error(
        err.response?.data?.error ||
          err.response?.data?.message ||
          'Failed to mark notification as read'
      );
      return false;
    }
  }, []);

  const markAllAsRead = useCallback(async (): Promise<boolean> => {
    let previousNotifications: Notification[] = [];
    let previousUnreadCount = 0;

    setNotifications((prev) => {
      previousNotifications = prev;
      return prev.map((n) => ({ ...n, is_read: true, read: true }));
    });

    setUnreadCount((prev) => {
      previousUnreadCount = prev;
      return 0;
    });

    try {
      const response = await notificationApi.markAllRead();
      if (response.data?.success) {
        toast.success('All notifications marked as read');
        return true;
      }
      setNotifications(previousNotifications);
      setUnreadCount(previousUnreadCount);
      toast.error(response.data?.message || 'Failed to mark all as read');
      return false;
    } catch (err: any) {
      setNotifications(previousNotifications);
      setUnreadCount(previousUnreadCount);
      toast.error(
        err.response?.data?.error ||
          err.response?.data?.message ||
          'Failed to mark all as read'
      );
      return false;
    }
  }, []);

  const deleteNotification = useCallback(async (id: string): Promise<boolean> => {
    let previousNotifications: Notification[] = [];
    let previousUnreadCount = 0;

    setNotifications((prev) => {
      previousNotifications = prev;
      const target = prev.find((n) => n.id === id);
      const wasUnread = target ? (!target.is_read && !(target as any).read) : false;

      if (wasUnread) {
        setUnreadCount((count) => {
          previousUnreadCount = count;
          return Math.max(0, count - 1);
        });
      }

      return prev.filter((n) => n.id !== id);
    });

    try {
      const response = await notificationApi.delete(id);
      if (response.data?.success) {
        toast.success('Notification deleted');
        return true;
      }
      setNotifications(previousNotifications);
      if (previousUnreadCount) setUnreadCount(previousUnreadCount);
      toast.error(response.data?.message || 'Failed to delete notification');
      return false;
    } catch (err: any) {
      setNotifications(previousNotifications);
      if (previousUnreadCount) setUnreadCount(previousUnreadCount);
      toast.error(
        err.response?.data?.error ||
          err.response?.data?.message ||
          'Failed to delete notification'
      );
      return false;
    }
  }, []);

  const deleteAllNotifications = useCallback(async (): Promise<boolean> => {
    let previousNotifications: Notification[] = [];
    let previousUnreadCount = 0;

    setNotifications((prev) => {
      previousNotifications = prev;
      return [];
    });

    setUnreadCount((prev) => {
      previousUnreadCount = prev;
      return 0;
    });

    try {
      const response = await notificationApi.deleteAll();
      if (response.data?.success) {
        toast.success('All notifications cleared');
        return true;
      }
      setNotifications(previousNotifications);
      setUnreadCount(previousUnreadCount);
      toast.error(response.data?.message || 'Failed to delete all notifications');
      return false;
    } catch (err: any) {
      setNotifications(previousNotifications);
      setUnreadCount(previousUnreadCount);
      toast.error(
        err.response?.data?.error ||
          err.response?.data?.message ||
          'Failed to delete all notifications'
      );
      return false;
    }
  }, []);

  useEffect(() => {
    if (autoFetch) {
      fetchNotifications();
    }
  }, [autoFetch, fetchNotifications]);

  useEffect(() => {
    if (pollInterval && pollInterval > 0) {
      pollTimerRef.current = setInterval(() => {
        getUnreadCount();
      }, pollInterval);
    }

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, [pollInterval, getUnreadCount]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    pagination,
    fetchNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
  };
}
