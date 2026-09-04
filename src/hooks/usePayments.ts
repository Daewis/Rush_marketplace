import { useState, useCallback } from 'react';
import { paymentApi } from '@/lib/api';
import { toast } from 'sonner';
import type { Payment } from '@/types';

export interface InitializePaymentPayload {
  amount: number;
  email?: string;
  job_id?: string;
  callback_url?: string;
  metadata?: Record<string, any>;
  [key: string]: any;
}

export interface PaymentInitializationResult {
  authorization_url?: string;
  access_code?: string;
  reference: string;
  [key: string]: any;
}

export function usePayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPayments = useCallback(async (): Promise<Payment[] | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await paymentApi.me();
      if (response.data?.success) {
        const resData = response.data.data || {};
        const list: Payment[] = Array.isArray(resData)
          ? resData
          : (resData as any).payments || (response.data as any)?.payments || [];

        setPayments(list);
        return list;
      }
      const msg = response.data?.message || 'Failed to load payments';
      setError(msg);
      return null;
    } catch (err: any) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Failed to load payments. Please try again.';
      setError(msg);
      toast.error('Failed to load payments');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const initializePayment = useCallback(
    async (
      data: InitializePaymentPayload,
      options: { autoRedirect?: boolean } = { autoRedirect: true }
    ): Promise<PaymentInitializationResult | null> => {
      setLoading(true);
      setError(null);
      try {
        const response = await paymentApi.initialize(data);
        if (response.data?.success) {
          const result: PaymentInitializationResult = response.data.data;

          if (options.autoRedirect && result?.authorization_url) {
            window.location.href = result.authorization_url;
          }

          return result;
        }

        const msg = response.data?.message || 'Payment initialization failed';
        toast.error(msg);
        setError(msg);
        return null;
      } catch (err: any) {
        const msg =
          err.response?.data?.error ||
          err.response?.data?.message ||
          'Payment initialization failed';
        toast.error(msg);
        setError(msg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const verifyPayment = useCallback(async (reference: string): Promise<Payment | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await paymentApi.verify({ reference });
      if (response.data?.success) {
        toast.success('Payment verified successfully!');
        const payload = response.data.data as any;
        return payload?.payment || payload;
      }

      const msg = response.data?.message || 'Payment verification failed';
      toast.error(msg);
      setError(msg);
      return null;
    } catch (err: any) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Payment verification failed';
      toast.error(msg);
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getPayment = useCallback(async (id: string): Promise<Payment | null> => {
    try {
      const response = await paymentApi.get(id);
      if (response.data?.success) {
        return response.data.data.payment || response.data.data;
      }
      toast.error(response.data?.message || 'Failed to load payment details');
      return null;
    } catch (err: any) {
      toast.error(
        err.response?.data?.error ||
          err.response?.data?.message ||
          'Failed to load payment details'
      );
      return null;
    }
  }, []);

  const getJobPayments = useCallback(async (jobId: string): Promise<Payment[]> => {
    try {
      const response = await paymentApi.job(jobId);
      if (response.data?.success) {
        const resData = response.data.data || {};
        return Array.isArray(resData) ? resData : (resData as any).payments || [];
      }
      return [];
    } catch {
      toast.error('Failed to load job payments');
      return [];
    }
  }, []);

  return {
    payments,
    loading,
    error,
    fetchPayments,
    initializePayment,
    verifyPayment,
    getPayment,
    getJobPayments,
  };
}
