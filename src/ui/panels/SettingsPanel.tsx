import { motion, AnimatePresence } from 'framer-motion';
import { X, Github, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import { useUIStore } from '../../state/uiStore';

export function SettingsPanel() {
  const { isSettingsPanelOpen, closeSettingsPanel, toolbarPosition, setToolbarPosition } = useUIStore();

  const positions = [
    { id: 'bottom' as const, label: 'Bottom', icon: ArrowDown },
    { id: 'left' as const, label: 'Left', icon: ArrowLeft },
    { id: 'right' as const, label: 'Right', icon: ArrowRight },
  ];

  return (
    <AnimatePresence>
      {isSettingsPanelOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            onClick={closeSettingsPanel}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-20 z-50 w-full sm:w-80 bg-white dark:bg-gray-900 shadow-2xl safe-right overflow-hidden rounded-bl-2xl"
          >
            <div className="h-full flex flex-col">
              {/* Header */}
              <div className="p-4 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Settings</h2>
                <button
                  onClick={closeSettingsPanel}
                  className="toolbar-btn"
                  aria-label="Close settings"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
                {/* Toolbar Position */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Toolbar Position</h3>
                  <div className="flex flex-col gap-2">
                    {positions.map(({ id, label, icon: Icon }) => (
                      <button
                        key={id}
                        onClick={() => setToolbarPosition(id)}
                        className={`flex items-center gap-3 py-3 px-4 rounded-xl border-2 transition-all ${
                          toolbarPosition === id
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        <Icon size={16} />
                        <span className="text-sm font-medium">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* GitHub Link - Always visible at bottom */}
              <div className="p-3 border-t border-gray-300 dark:border-gray-600">
                <a
                  href="https://github.com/Adryx71/Infinite-canvas"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-gray-700 dark:text-gray-300"
                >
                  <Github size={14} />
                  <span className="text-xs font-medium">Github</span>
                </a>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
