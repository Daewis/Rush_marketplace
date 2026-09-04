import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User } from '@/types';

export type ViewType =
  | 'home'
  | 'login'
  | 'register'
  | 'verify'
  | 'reset-password'
  | 'customer-dashboard'
  | 'provider-dashboard'
  | 'admin-dashboard'
  | 'jobs'
  | 'job-post'
  | 'job-details'
  | 'job-tracking'
  | 'new-job'
  | 'my-jobs'
  | 'providers'
  | 'provider-register'
  | 'provider-profile'
  | 'payments'
  | 'violations'
  | 'notifications'
  | 'profile'
  | 'settings';

export type AppView = ViewType;

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id?: string;
  message: string;
  type: ToastType;
}

export interface JobFilters {
  category?: string;
  status?: string;
  search?: string;
  city?: string;
  state?: string;
  minBudget?: number;
  maxBudget?: number;
}

export interface ProviderFilters {
  skill?: string;
  city?: string;
  state?: string;
  minRating?: number;
  availableOnly?: boolean;
}

export interface AppState {
  hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;

  currentView: ViewType;
  previousView: ViewType | null;
  setView: (view: ViewType) => void;
  goBack: () => void;

  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setAuth: (isAuth: boolean) => void;

  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;

  toast: ToastMessage | null;
  setToast: (toast: ToastMessage | null) => void;
  showToast: (message: string, type?: ToastType, durationMs?: number) => void;

  jobFilters: JobFilters;
  setJobFilters: (filters: Partial<JobFilters> | ((prev: JobFilters) => JobFilters)) => void;
  resetJobFilters: () => void;

  providerFilters: ProviderFilters;
  setProviderFilters: (filters: Partial<ProviderFilters> | ((prev: ProviderFilters) => ProviderFilters)) => void;
  resetProviderFilters: () => void;

  logout: () => void;
}

const defaultJobFilters: JobFilters = {};
const defaultProviderFilters: ProviderFilters = {};

let toastTimer: any = null;

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      hasHydrated: false,
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),

      currentView: 'home',
      previousView: null,
      setView: (view) =>
        set((state) => ({
          currentView: view,
          previousView: state.currentView,
        })),
      goBack: () =>
        set((state) => ({
          currentView: state.previousView || 'home',
          previousView: null,
        })),

      user: null,
      isAuthenticated: false,
      setUser: (user) => {
        // Normalize legacy role field to lowercase for backward compat
        // with components that still check `user.role === 'artisan'`.
        // The capability fields (capabilities, capability_status,
        // active_workspace, system_roles) are preserved untouched —
        // they're the source of truth for authz on the backend.
        if (user) {
          const u = user as any;
          if (u.role) u.role = u.role.toLowerCase();
          if (u.active_workspace) u.active_workspace = String(u.active_workspace).toUpperCase();
          if (Array.isArray(u.capabilities)) {
            u.capabilities = u.capabilities.map((c: string) => String(c).toUpperCase());
          }
        }
        set({
          user,
          isAuthenticated: !!user
        });
      },
      setAuth: (isAuthenticated) => {
        if (!isAuthenticated) {
          set({ user: null, isAuthenticated: false });
        } else {
          const state = get();
          if (!state.user) {
            try {
              const stored = localStorage.getItem('rushng-app-storage');
              if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed.state?.user) {
                  const user = parsed.state.user;
                  if (user.role) {
                    user.role = user.role.toLowerCase();
                  }
                  set({ user, isAuthenticated: true });
                  return;
                }
              }
            } catch (e) {
              console.error('Error restoring user from storage:', e);
            }
          }
          set({ isAuthenticated });
        }
      },

      isLoading: false,
      setIsLoading: (isLoading) => set({ isLoading }),
      mobileMenuOpen: false,
      setMobileMenuOpen: (mobileMenuOpen) => set({ mobileMenuOpen }),

      toast: null,
      setToast: (toast) => set({ toast }),
      showToast: (message, type = 'info', durationMs = 4000) => {
        if (toastTimer) clearTimeout(toastTimer);

        set({ toast: { message, type } });

        toastTimer = setTimeout(() => {
          set({ toast: null });
        }, durationMs);
      },

      jobFilters: defaultJobFilters,
      setJobFilters: (filters) =>
        set((state) => ({
          jobFilters:
            typeof filters === 'function'
              ? filters(state.jobFilters)
              : { ...state.jobFilters, ...filters },
        })),
      resetJobFilters: () => set({ jobFilters: defaultJobFilters }),

      providerFilters: defaultProviderFilters,
      setProviderFilters: (filters) =>
        set((state) => ({
          providerFilters:
            typeof filters === 'function'
              ? filters(state.providerFilters)
              : { ...state.providerFilters, ...filters },
        })),
      resetProviderFilters: () => set({ providerFilters: defaultProviderFilters }),

      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('access_token');
        }
        set({
          user: null,
          isAuthenticated: false,
          currentView: 'home',
          previousView: null,
        });
      },
    }),
    {
      name: 'rushng-app-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        currentView: state.currentView,
      }),
      onRehydrateStorage: () => (state) => {
        // Same normalization on rehydrate — a user loaded from
        // localStorage might be a stale cache from before the
        // capability migration, so default capabilities to ['CUSTOMER'].
        if (state?.user) {
          const u = state.user as any;
          if (u.role) u.role = u.role.toLowerCase();
          if (u.active_workspace) u.active_workspace = String(u.active_workspace).toUpperCase();
          if (!Array.isArray(u.capabilities) || u.capabilities.length === 0) {
            u.capabilities = ['CUSTOMER'];
          } else {
            u.capabilities = u.capabilities.map((c: string) => String(c).toUpperCase());
          }
        }
        state?.setHasHydrated(true);
      },
    }
  )
);
