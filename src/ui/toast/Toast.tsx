import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useUIStore } from '../../state/uiStore';

export function ToastContainer() {
  const { toasts, removeToast } = useUIStore();
  // Limit visible toasts to 3
  const visibleToasts = toasts.slice(-3);

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] safe-top flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {visibleToasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="toast pointer-events-auto flex items-center gap-3"
          >
            <span className="text-gray-800 dark:text-gray-200">{toast.message}</span>
            {toast.action && (
              <button
                onClick={() => {
                  toast.action?.();
                  removeToast(toast.id);
                }}
                className="text-blue-500 hover:text-blue-600 text-sm font-medium"
              >
                Undo
              </button>
            )}
            <button
              onClick={() => removeToast(toast.id)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
