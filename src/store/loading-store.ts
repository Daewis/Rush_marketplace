import { create } from 'zustand';

interface LoadingStore {
  isLoading: boolean;
  message: string | null;
  setLoading: (isLoading: boolean, message?: string) => void;
  startLoading: (message?: string) => void;
  stopLoading: () => void;
}

export const useLoadingStore = create<LoadingStore>((set) => ({
  isLoading: false,
  message: null,
  setLoading: (isLoading, message = undefined) => set({ isLoading, message: message ?? null }),
  startLoading: (message = undefined) => set({ isLoading: true, message: message ?? null }),
  stopLoading: () => set({ isLoading: false, message: null }),
}));
