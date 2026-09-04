import axios from 'axios';
import { ApiResponse, Job, Provider, Payment, Violation, Notification, User } from '@/types';

// Default to local/same-origin /api proxy to avoid browser CORS restrictions
const API_BASE_URL = '/api';


export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  withCredentials: true,
  timeout: 30000,
});

// Request Interceptor: Attach token reliably
api.interceptors.request.use(
  (config) => {
    if (config.url) {
      config.url = config.url.replace(/\/+$/, '');
    }

    // Check both potential storage keys
    const token =
      typeof window !== 'undefined'
        ? localStorage.getItem('access_token') || localStorage.getItem('token')
        : null;

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle Refresh & Avoid Infinite 401 Retries
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Prevent retrying refresh endpoint or re-retrying an already retried request
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/refresh') &&
      !originalRequest.url?.includes('/auth/login')
    ) {
      originalRequest._retry = true;

      const refreshToken =
        typeof window !== 'undefined'
          ? localStorage.getItem('refresh_token')
          : null;

      if (refreshToken) {
        try {
          // Use a clean axios call (not the intercepted `api` instance) to avoid loops
          const res = await axios.post(
            `${API_BASE_URL}/auth/refresh`,
            { refresh_token: refreshToken },
            { headers: { 'Content-Type': 'application/json' } }
          );

          // Handle standard or nested response formats
          const newAccessToken =
            res.data?.access_token || res.data?.data?.access_token;

          if (newAccessToken) {
            localStorage.setItem('access_token', newAccessToken);
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return api(originalRequest);
          }
        } catch (refreshError) {
          // Refresh failed: clear storage to prevent persistent error loops
          if (typeof window !== 'undefined') {
            localStorage.removeItem('access_token');
            localStorage.removeItem('token');
            localStorage.removeItem('refresh_token');
            // hooks/useAuth.ts listens for this and calls its own logout(),
            // so Firebase + the local user state actually clear too —
            // without this, the UI keeps showing a logged-in wallet/role
            // while every real API call silently 401s underneath it.
            window.dispatchEvent(new Event('rush:session-expired'));
          }
        }
      } else if (typeof window !== 'undefined') {
        // No refresh token to even attempt recovery with — same cleanup + notify.
        localStorage.removeItem('access_token');
        localStorage.removeItem('token');
        window.dispatchEvent(new Event('rush:session-expired'));
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: (data: { email: string; password: string }) =>
    api.post<ApiResponse<{ user: User; access_token: string; refresh_token?: string }>>('/auth/login', data),
  register: (data: { full_name: string; email: string; phone: string; password: string; role?: string }) =>
    api.post<ApiResponse<{ user: User }>>('/auth/register', data),
  verify: (data: { email: string; code: string }) =>
    api.post<ApiResponse>('/auth/verify', data),
  resendVerification: (data: { email: string }) =>
    api.post<ApiResponse>('/auth/resend-verification', data),
  me: () =>
    api.get<ApiResponse<{ user: User }>>('/auth/me'),
  logout: () =>
    api.post<ApiResponse>('/auth/logout'),
  updateProfile: (data: any) =>
    api.put<ApiResponse<{ user: User }>>('/auth/profile', data),
  changePassword: (data: { current_password: string; new_password: string }) =>
    api.post<ApiResponse>('/auth/change-password', data),
  deleteAccount: () =>
    api.delete<ApiResponse>('/auth/delete-account'),
  refresh: (data: { refresh_token: string }) =>
    api.post<ApiResponse<{ access_token: string }>>('/auth/refresh', data),
  firebaseSession: (data: { id_token: string; role?: string; full_name?: string; phone?: string }) =>
    api.post<ApiResponse<{ user: User; access_token: string; refresh_token: string }>>(
      '/auth/firebase-session',
      data
    ),
  // Switches the ACTIVE WORKSPACE between capabilities this identity
  // already holds (e.g. customer <-> vendor for someone who's onboarded
  // as both). Pure UI hint — does NOT grant a new capability. Use
  // onboardingApi.vendor / .serviceProvider / .rider for that.
  switchWorkspace: (data: { workspace: 'CUSTOMER' | 'VENDOR' | 'SERVICE_PROVIDER' | 'RIDER' }) =>
    api.post<ApiResponse<{ user: User }>>('/auth/switch-workspace', data),
  /** @deprecated Use switchWorkspace — kept for backward compat with
   *  older code paths that haven't been migrated yet. */
  switchRole: (data: { role: string }) =>
    api.post<ApiResponse<{ user: User }>>('/auth/switch-workspace', { workspace: String(data.role).toUpperCase() } as any),
};

// Job API
export const jobApi = {
  list: (params?: any) =>
    api.get<ApiResponse<{ jobs: Job[] }>>('/jobs', { params }),
  get: (id: string) =>
    api.get<ApiResponse<{ job: Job }>>(`/jobs/${id}`),
  create: (data: any) =>
    api.post<ApiResponse<{ job: Job }>>('/jobs', data),
  update: (id: string, data: any) =>
    api.put<ApiResponse<{ job: Job }>>(`/jobs/${id}`, data),
  delete: (id: string) =>
    api.delete<ApiResponse>(`/jobs/${id}`),
  apply: (id: string, data?: any) =>
    api.post<ApiResponse>(`/jobs/${id}/apply`, data),
  assign: (id: string, data: { providerId: string }) =>
    api.post<ApiResponse>(`/jobs/${id}/assign`, data),
  checkIn: (id: string, data?: any) =>
    api.post<ApiResponse>(`/jobs/${id}/check-in`, data),
  checkOut: (id: string, data?: any) =>
    api.post<ApiResponse>(`/jobs/${id}/check-out`, data),
  confirm: (id: string, data?: any) =>
    api.post<ApiResponse>(`/jobs/${id}/confirm`, data),
  cancel: (id: string, data?: any) =>
    api.post<ApiResponse>(`/jobs/${id}/cancel`, data),
  getMyJobs: () =>
    api.get<ApiResponse<{ jobs: Job[] }>>('/jobs/my'),
  getCustomerStats: () =>
    api.get<ApiResponse<any>>('/jobs/stats/customer'),
  getRecentDeliveries: () =>
    api.get<ApiResponse<any[]>>('/jobs/recent'),
  getWeeklySpending: () =>
    api.get<ApiResponse<{ label: string; value: number }[]>>('/jobs/spending/weekly'),
  getProviderStats: () =>
    api.get<ApiResponse<any>>('/jobs/stats/provider'),
  getAvailableJobs: () =>
    api.get<ApiResponse<any[]>>('/jobs/available'),
  getDailyEarnings: () =>
    api.get<ApiResponse<{ label: string; value: number }[]>>('/jobs/earnings/daily'),
};

// Provider API
export const providerApi = {
  list: (params?: any) =>
    api.get<ApiResponse<{ providers: Provider[] }>>('/providers', { params }),
  search: (params?: any) =>
    api.get<ApiResponse<{ providers: Provider[] }>>('/providers', { params }),
  get: (id: string) =>
    api.get<ApiResponse<{ provider: Provider }>>(`/providers/${id}`),
  getMe: () =>
    api.get<ApiResponse<{ provider: Provider }>>('/providers/me'),
  register: (data: any) =>
    api.post<ApiResponse<{ provider: Provider }>>('/providers/register', data),
  update: (data: any) =>
    api.put<ApiResponse<{ provider: Provider }>>('/providers/me', data),
  verify: (data: any) =>
    api.post<ApiResponse>('/providers/verify', data),
  availability: (data: any) =>
    api.put<ApiResponse>('/providers/availability', data),
  stats: () =>
    api.get<ApiResponse>('/providers/stats'),
};

// Payment API
export const paymentApi = {
  list: (params?: any) =>
    api.get<ApiResponse<{ payments: Payment[] }>>('/payments', { params }),
  me: (params?: any) =>
    api.get<ApiResponse<{ payments: Payment[] }>>('/payments', { params }),
  get: (id: string) =>
    api.get<ApiResponse<{ payment: Payment }>>(`/payments/${id}`),
  create: (data: any) =>
    api.post<ApiResponse<{ payment: Payment }>>('/payments', data),
  initialize: (data: any) =>
    api.post<ApiResponse<any>>('/payments', data),
  initializePaystack: (data: { amount: number; email?: string; job_id?: string; payment_type?: string; callback_url?: string }) =>
    api.post<ApiResponse<{ authorization_url: string; access_code: string; reference: string; public_key?: string }>>('/payments/paystack/initialize', data),
  verifyPaystack: (data: { reference: string }) =>
    api.post<ApiResponse<any>>('/payments/paystack/verify', data),
  verify: (data: { reference: string }) =>
    api.post<ApiResponse>('/payments/verify', data),
  job: (jobId: string) =>
    api.get<ApiResponse<{ payments: Payment[] }>>('/payments', { params: { job_id: jobId } }),
};

// Rating API
export const ratingApi = {
  create: (data: any) =>
    api.post<ApiResponse<{ rating: any }>>('/ratings', data),
  getForTarget: (targetId: string) =>
    api.get<ApiResponse<{ ratings: any[] }>>(`/ratings/target/${targetId}`),
};

// Notification API
export const notificationApi = {
  list: (params?: any) =>
    api.get<ApiResponse<{ notifications: Notification[] }>>('/notifications', { params }),
  unreadCount: () =>
    api.get<ApiResponse<any>>('/notifications/unread-count'),
  markAsRead: (id: string) =>
    api.put<ApiResponse>(`/notifications/${id}/read`),
  markRead: (id: string) =>
    api.put<ApiResponse>(`/notifications/${id}/read`),
  markAllAsRead: () =>
    api.put<ApiResponse>('/notifications/read-all'),
  markAllRead: () =>
    api.put<ApiResponse>('/notifications/read-all'),
  delete: (id: string) =>
    api.delete<ApiResponse>(`/notifications/${id}`),
  deleteAll: () =>
    api.delete<ApiResponse>('/notifications'),
};

// Violation API
export const violationApi = {
  list: (params?: any) =>
    api.get<ApiResponse<{ violations: Violation[] }>>('/violations', { params }),
  my: (params?: any) =>
    api.get<ApiResponse<{ violations: Violation[] }>>('/violations', { params }),
  create: (data: any) =>
    api.post<ApiResponse<{ violation: Violation }>>('/violations', data),
  report: (data: any) =>
    api.post<ApiResponse<{ violation: Violation }>>('/violations', data),
  get: (id: string) =>
    api.get<ApiResponse<{ violation: Violation }>>(`/violations/${id}`),
  appeal: (id: string, data: any) =>
    api.post<ApiResponse>(`/violations/${id}/appeal`, data),
  resolve: (id: string, data: any) =>
    api.post<ApiResponse>(`/violations/${id}/resolve`, data),
  stats: () =>
    api.get<ApiResponse>('/violations/stats'),
};

// Admin API
export const adminApi = {
  getMetrics: () =>
    api.get<ApiResponse<any>>('/admin/metrics'),
  getRegionStats: () =>
    api.get<ApiResponse<{ label: string; value: number }[]>>('/admin/regions'),
  getSystemLogs: () =>
    api.get<ApiResponse<any[]>>('/admin/logs'),
  getRevenueData: () =>
    api.get<ApiResponse<{ label: string; value: number }[]>>('/admin/revenue'),
  getVerificationQueue: () =>
    api.get<ApiResponse<{ queue: any[] }>>('/admin/verification-queue'),
  approveCapability: (data: { userId: string; capability: string; action: 'approve' | 'reject' }) =>
    api.post<ApiResponse<any>>('/admin/approve-capability', data),
  getDrivers: () =>
    api.get<ApiResponse<{ drivers: any[] }>>('/admin/drivers'),
  getLogisticsRides: () =>
    api.get<ApiResponse<{ rides: any[] }>>('/admin/logistics/rides'),
  getVendors: () =>
    api.get<ApiResponse<{ vendors: any[] }>>('/admin/vendors'),
};

// User API
export const userApi = {
  getProfileStats: () =>
    api.get<ApiResponse<any>>('/users/stats'),
  updateProfile: (data: any) =>
    api.put<ApiResponse<{ user: User }>>('/users/profile', data),
  getSecuritySettings: () =>
    api.get<ApiResponse<any>>('/users/security'),
  updatePreferences: (data: any) =>
    api.put<ApiResponse>('/users/preferences', data),
  changePassword: (data: { current_password: string; new_password: string }) =>
    api.post<ApiResponse>('/users/change-password', data),
};

// Logistics API
export const logisticsApi = {
  createRide: (data: any) =>
    api.post<ApiResponse<{ ride: any }>>('/logistics/rides', data),
  openRides: () =>
    api.get<ApiResponse<{ rides: any[] }>>('/logistics/rides'),
  myRides: () =>
    api.get<ApiResponse<{ rides: any[] }>>('/logistics/rides/my'),
  rideStatus: (id: string) =>
    api.get<ApiResponse<{ ride: any }>>(`/logistics/rides/${id}/status`),
  assignDriver: (id: string, data?: { driverUserId?: string }) =>
    api.post<ApiResponse<{ ride: any }>>(`/logistics/rides/${id}/assign`, data),
  cancelRide: (id: string, data?: { reason?: string }) =>
    api.post<ApiResponse<{ ride: any }>>(`/logistics/rides/${id}/cancel`, data),
  availableDrivers: () =>
    api.get<ApiResponse<{ drivers: any[] }>>('/logistics/drivers/available'),
  onboardDriver: (data: { vehicleType: string; vehiclePlateNumber: string; licenseNumber: string }) =>
    api.post<ApiResponse<{ driver: any }>>('/logistics/drivers/onboard', data),
  setDriverStatus: (data: { status: string }) =>
    api.patch<ApiResponse<{ driver: any }>>('/logistics/drivers/status', data),
  setDriverLocation: (data: { lat: number; lng: number }) =>
    api.patch<ApiResponse<{ driver: any }>>('/logistics/drivers/location', data),
  logDispatchEvent: (rideId: string, data: { event: string; lat?: number; lng?: number }) =>
    api.post<ApiResponse<{ ride_id: string; status: string; event: string }>>(
      `/logistics/dispatch/${rideId}/event`,
      data
    ),
  dispatchHistory: (rideId: string) =>
    api.get<ApiResponse<{ events: any[] }>>(`/logistics/dispatch/${rideId}/history`),

  // Vendor-order deliveries (logistics handoff). These complement the
  // existing ride-based endpoints above — a vendor-order delivery still
  // creates a Ride for live tracking, but the DeliveryRequest is the
  // rider-facing entry point.
  openDeliveries: () =>
    api.get<ApiResponse<{ deliveries: any[] }>>('/logistics/deliveries'),
  myDeliveries: () =>
    api.get<ApiResponse<{ deliveries: any[] }>>('/logistics/deliveries/my'),
  acceptDelivery: (id: string) =>
    api.post<ApiResponse<any>>(`/logistics/deliveries/${id}/accept`),
  completeDelivery: (id: string) =>
    api.post<ApiResponse<any>>(`/logistics/deliveries/${id}/complete`),
};

// ============================================================
// Capability onboarding API
// Three deliberate actions to activate a new marketplace capability.
// None are available at registration — every new account is
// CUSTOMER-only and must explicitly opt in.
// ============================================================
export const onboardingApi = {
  slugSuggest: (name: string) =>
    api.get<ApiResponse<{ slug: string }>>('/onboarding/slug-suggest', { params: { name } }),
  vendor: (data: {
    businessName: string;
    slug?: string;
    description?: string;
    category?: string;
    phone?: string;
    whatsapp?: string;
    city?: string;
    state?: string;
  }) => api.post<ApiResponse<any>>('/onboarding/vendor', data),
  serviceProvider: (data: {
    skills?: string[];
    yearsExperience?: number;
    hourlyRate?: number;
    bio?: string;
    displayName?: string;
    serviceRadiusKm?: number;
  }) => api.post<ApiResponse<any>>('/onboarding/service-provider', data),
  rider: (data: {
    vehicleType: string;
    vehiclePlateNumber: string;
    vehicleMake: string;
    vehicleModel: string;
    vehicleYear?: number;
    licenseNumber: string;
    licenseDocumentUrl?: string;
    mobilityCapabilities?: string[];
  }) => api.post<ApiResponse<any>>('/onboarding/rider', data),
};

// ============================================================
// Vendor management API
// Requires the VENDOR capability (and capabilityStatus.VENDOR = ACTIVE).
// ============================================================
export const vendorApi = {
  getProfile: () =>
    api.get<ApiResponse<{ vendor_profile: any }>>('/vendor/profile'),
  updateProfile: (data: any) =>
    api.patch<ApiResponse<any>>('/vendor/profile', data),
  updateStore: (data: any) =>
    api.patch<ApiResponse<any>>('/vendor/store', data),
  listProducts: (params?: any) =>
    api.get<ApiResponse<{ products: any[] }>>('/vendor/products', { params }),
  createProduct: (data: any) =>
    api.post<ApiResponse<{ product: any }>>('/vendor/products', data),
  updateProduct: (id: string, data: any) =>
    api.patch<ApiResponse<any>>(`/vendor/products/${id}`, data),
  deleteProduct: (id: string) =>
    api.delete<ApiResponse<any>>(`/vendor/products/${id}`),
  listOrders: (params?: any) =>
    api.get<ApiResponse<{ orders: any[] }>>('/vendor/orders', { params }),
};

// ============================================================
// Public storefront API
// No auth required for GET endpoints.
// ============================================================
export const storeApi = {
  list: (params?: any) =>
    api.get<ApiResponse<{ stores: any[] }>>('/stores', { params }),
  checkSlug: (slug: string) =>
    api.get<ApiResponse<{ available: boolean; reason?: string }>>('/stores/check-slug', { params: { slug } }),
  getBySlug: (slug: string) =>
    api.get<ApiResponse<{ store: any; products: any[] }>>(`/stores/${slug}`),
  getProducts: (slug: string, params?: any) =>
    api.get<ApiResponse<{ products: any[] }>>(`/stores/${slug}/products`, { params }),
  getProduct: (id: string) =>
    api.get<ApiResponse<{ product: any; store: any }>>(`/stores/products/${id}`),
  getReviews: (slug: string) =>
    api.get<ApiResponse<{ reviews: any[]; average_rating: number; total_reviews: number }>>(`/stores/${slug}/reviews`),
};

// ============================================================
// Cart API
// ============================================================
export const cartApi = {
  get: () =>
    api.get<ApiResponse<{ cart: any }>>('/cart'),
  addItem: (data: { productId: string; quantity?: number }) =>
    api.post<ApiResponse<any>>('/cart/items', data),
  updateItem: (productId: string, data: { quantity: number }) =>
    api.patch<ApiResponse<any>>(`/cart/items/${productId}`, data),
  removeItem: (productId: string) =>
    api.delete<ApiResponse<any>>(`/cart/items/${productId}`),
  clear: () =>
    api.delete<ApiResponse<any>>('/cart'),
  checkout: (data: {
    deliveryAddress: {
      fullName: string;
      phone: string;
      address: string;
      city?: string;
      state?: string;
      notes?: string;
    };
  }) => api.post<ApiResponse<{ orders: any[] }>>('/cart/checkout', data),
};

// ============================================================
// Orders API
// ============================================================
export const orderApi = {
  list: (params?: any) =>
    api.get<ApiResponse<{ orders: any[] }>>('/orders', { params }),
  get: (id: string) =>
    api.get<ApiResponse<{ order: any }>>(`/orders/${id}`),
  confirm: (id: string) =>
    api.post<ApiResponse<any>>(`/orders/${id}/confirm`),
  markReady: (id: string) =>
    api.post<ApiResponse<any>>(`/orders/${id}/ready`),
  cancel: (id: string, data?: { reason?: string }) =>
    api.post<ApiResponse<any>>(`/orders/${id}/cancel`, data),
};

// ============================================================
// Logistics Handshake & Delivery Requests API
// ============================================================
export const deliveryApi = {
  listOpen: () =>
    api.get<ApiResponse<{ deliveries: any[] }>>('/logistics/deliveries'),
  my: () =>
    api.get<ApiResponse<{ deliveries: any[] }>>('/logistics/deliveries/my'),
  accept: (id: string) =>
    api.post<ApiResponse<any>>(`/logistics/deliveries/${id}/accept`),
};

// ============================================================
// Wallet & Escrow Ledger API
// ============================================================
export const walletApi = {
  getMe: () =>
    api.get<ApiResponse<{ balance: number; escrow_held: number }>>('/wallet/me'),
  getTransactions: (params?: { limit?: number; skip?: number }) =>
    api.get<ApiResponse<{ transactions: any[]; total: number }>>('/wallet/transactions', { params }),
  withdraw: (data: { amount: number; bankName: string; accountNumber: string }) =>
    api.post<ApiResponse<{ entry: any; balance: number }>>('/wallet/withdraw', data),
  topUp: (data: { amount: number; gateway?: string; reference?: string }) =>
    api.post<ApiResponse<{ balance: number; entry: any }>>('/wallet/topup', data),
};

// ============================================================
// Quotes & Bidding API
// ============================================================
export const quoteApi = {
  listForJob: (jobId: string) =>
    api.get<ApiResponse<{ quotes: any[] }>>(`/quotes/job/${jobId}`),
  myQuotes: () =>
    api.get<ApiResponse<{ quotes: any[] }>>('/quotes/my'),
  submit: (data: { jobId: string; price: number; estimatedDuration: string; proposal: string }) =>
    api.post<ApiResponse<{ quote: any }>>('/quotes', data),
  accept: (quoteId: string) =>
    api.post<ApiResponse<{ job_id: string; quote_id: string; provider_id: string; provider_name: string; final_price: number; status: string }>>(
      `/quotes/${quoteId}/accept`
    ),
};

export const handleApiError = (error: any): string => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.response?.data?.error) {
    return error.response.data.error;
  }
  if (error.message) {
    return error.message;
  }
  return 'An unexpected error occurred. Please try again.';
};

export default api;