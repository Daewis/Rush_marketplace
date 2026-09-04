import { useLoadingStore } from '@/store/loading-store';
import { Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function GlobalLoadingOverlay() {
  const { isLoading, message } = useLoadingStore();

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-card rounded-2xl p-8 shadow-2xl border border-border/50 max-w-sm w-full mx-4"
          >
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <div className="h-16 w-16 rounded-full border-4 border-orange-200 border-t-orange-500 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 text-orange-500 animate-pulse" />
                </div>
              </div>
              <div className="text-center space-y-1">
                <p className="font-semibold text-foreground">Loading...</p>
                {message && (
                  <p className="text-sm text-muted-foreground">{message}</p>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
