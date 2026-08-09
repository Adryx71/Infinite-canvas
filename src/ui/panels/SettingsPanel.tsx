import { motion, AnimatePresence } from 'framer-motion';
import { X, Layers, Github } from 'lucide-react';
import { useUIStore } from '../../state/uiStore';

export function SettingsPanel() {
  const { isSettingsPanelOpen, closeSettingsPanel, smartShapeRecognition, setSmartShapeRecognition } = useUIStore();

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
              <div className="flex-1 overflow-y-auto p-4">
                {/* Features */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Features</h3>
                  <button
                    onClick={() => setSmartShapeRecognition(!smartShapeRecognition)}
                    className={`w-full p-3 rounded-xl border-2 transition-all text-left ${
                      smartShapeRecognition
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        smartShapeRecognition ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                      }`}>
                        <Layers size={16} />
                      </div>
                      <div>
                        <div className="font-medium text-gray-800 dark:text-gray-200 text-sm">Smart Shape Recognition</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Auto-convert rough sketches to perfect shapes</div>
                      </div>
                    </div>
                  </button>
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
