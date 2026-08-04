import { motion, AnimatePresence } from 'framer-motion';
import { X, Layers } from 'lucide-react';
import { useCanvasStore } from '../../state/canvasStore';
import { useUIStore } from '../../state/uiStore';
import { BACKGROUND_COLORS } from '../../config';
import type { BackgroundType } from '../../types';
import { canvasEngine } from '../../engine/canvasEngine';

const backgrounds: { id: BackgroundType; label: string; color: string }[] = [
  { id: 'white', label: 'Pure White', color: BACKGROUND_COLORS.white },
  { id: 'amoled', label: 'AMOLED Black', color: BACKGROUND_COLORS.amoled },
  { id: 'paper', label: 'Paper', color: BACKGROUND_COLORS.paper },
  { id: 'graph', label: 'Graph Paper', color: BACKGROUND_COLORS.graph },
];

export function SettingsPanel() {
  const { isSettingsPanelOpen, closeSettingsPanel, smartShapeRecognition, setSmartShapeRecognition } = useUIStore();
  const { background, setBackground } = useCanvasStore();

  const handleBackgroundChange = (bg: BackgroundType) => {
    setBackground(bg);
    canvasEngine.requestRender();
  };

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
            className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-80 panel-glass shadow-2xl safe-right"
          >
            <div className="p-6 h-full overflow-y-auto custom-scrollbar">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Settings</h2>
                <button
                  onClick={closeSettingsPanel}
                  className="toolbar-btn"
                  aria-label="Close settings"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Background Selection */}
              <div className="mb-8">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Background</h3>
                <div className="grid grid-cols-2 gap-3">
                  {backgrounds.map((bg) => (
                    <button
                      key={bg.id}
                      onClick={() => handleBackgroundChange(bg.id)}
                      className={`relative p-4 rounded-xl border-2 transition-all ${
                        background === bg.id
                          ? 'border-blue-500 dark:border-blue-400'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div
                        className="w-full h-12 rounded-lg mb-2"
                        style={{ backgroundColor: bg.color }}
                      />
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        {bg.label}
                      </span>
                      {background === bg.id && (
                        <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Features */}
              <div className="mb-8">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Features</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => setSmartShapeRecognition(!smartShapeRecognition)}
                    className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                      smartShapeRecognition
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        smartShapeRecognition ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                      }`}>
                        <Layers size={20} />
                      </div>
                      <div>
                        <div className="font-medium text-gray-800 dark:text-gray-200">Smart Shape Recognition</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Auto-convert rough sketches to perfect shapes</div>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* About */}
              <div className="text-center text-xs text-gray-400 dark:text-gray-500 mt-auto pt-8">
                <p>Infinity Board v1.0.0</p>
                <p className="mt-1">Distraction-free infinite whiteboard</p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
