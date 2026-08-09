import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Pencil, Pen, Highlighter, Eraser, MousePointer2, Shapes, Square, Circle, Triangle,
  Diamond, Star, Minus, ArrowRight, Undo2, Redo2, Trash2
} from 'lucide-react';
import { useCanvasStore } from '../../state/canvasStore';
import { useUIStore } from '../../state/uiStore';
import { useUndoRedoStore } from '../../state/undoRedoStore';
import { canvasEngine } from '../../engine/canvasEngine';
import type { ToolType, ShapeType } from '../../types';

const drawingTools: { id: ToolType; icon: typeof Pencil; label: string }[] = [
  { id: 'pencil', icon: Pencil, label: 'Pencil' },
  { id: 'pen', icon: Pen, label: 'Pen' },
  { id: 'marker', icon: Highlighter, label: 'Marker' },
  { id: 'eraser', icon: Eraser, label: 'Eraser' },
  { id: 'selection', icon: MousePointer2, label: 'Selection' },
];

const shapeOptions: { id: ShapeType; icon: typeof Square; label: string }[] = [
  { id: 'rectangle', icon: Square, label: 'Rectangle' },
  { id: 'circle', icon: Circle, label: 'Circle' },
  { id: 'triangle', icon: Triangle, label: 'Triangle' },
  { id: 'diamond', icon: Diamond, label: 'Diamond' },
  { id: 'star', icon: Star, label: 'Star' },
  { id: 'line', icon: Minus, label: 'Line' },
  { id: 'arrow', icon: ArrowRight, label: 'Arrow' },
];

const PRIMARY_COLORS_LIGHT = ['#000000', '#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];
const PRIMARY_COLORS_DARK = ['#FFFFFF', '#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];

export function Toolbar() {
  const { activeTool, setActiveTool, activeShape, setActiveShape, currentPageId, clearObjects } = useCanvasStore();
  const { toolbarOpacity, updateToolSettings, getToolSettings, toolbarPosition } = useUIStore();
  const { canUndo, canRedo } = useUndoRedoStore();
  const [showShapePicker, setShowShapePicker] = useState(false);
  const [showBrushSettings, setShowBrushSettings] = useState(false);
  const shapePickerRef = useRef<HTMLDivElement>(null);
  const brushSettingsRef = useRef<HTMLDivElement>(null);

  const { theme } = useUIStore();
  const settings = getToolSettings(activeTool);
  const isDrawingTool = ['pencil', 'pen', 'marker', 'eraser', 'shapes'].includes(activeTool);
  const PRIMARY_COLORS = theme === 'dark' ? PRIMARY_COLORS_DARK : PRIMARY_COLORS_LIGHT;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (shapePickerRef.current && !shapePickerRef.current.contains(target)) {
        setShowShapePicker(false);
      }
      if (brushSettingsRef.current && !brushSettingsRef.current.contains(target)) {
        setShowBrushSettings(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const handleToolSelect = (tool: ToolType) => {
    if (tool === 'shapes') {
      setActiveTool(tool);
      if (!activeShape) setActiveShape('rectangle');
      return;
    }
    if (tool === activeTool && isDrawingTool) {
      setShowBrushSettings(!showBrushSettings);
    } else {
      setActiveTool(tool);
      if (tool !== 'selection') {
        setShowBrushSettings(true);
      } else {
        setShowBrushSettings(false);
      }
    }
  };

  const handleUndo = () => {
    if (!currentPageId) return;
    const { undo } = useUndoRedoStore.getState();
    const { clearObjects: clearObjs, addObjects } = useCanvasStore.getState();
    const restored = undo(currentPageId);
    if (restored) {
      clearObjs();
      addObjects(restored);
      canvasEngine.requestRender();
    }
  };

  const handleRedo = () => {
    if (!currentPageId) return;
    const { redo } = useUndoRedoStore.getState();
    const { clearObjects: clearObjs, addObjects } = useCanvasStore.getState();
    const restored = redo(currentPageId);
    if (restored) {
      clearObjs();
      addObjects(restored);
      canvasEngine.requestRender();
    }
  };

  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleClearAll = () => {
    setShowClearConfirm(true);
  };

  const confirmClearAll = () => {
    setShowClearConfirm(false);
    if (currentPageId) {
      const { pushUndo } = useUndoRedoStore.getState();
      const currentObjects = Array.from(useCanvasStore.getState().objects.values());
      pushUndo(currentPageId, currentObjects);
    }
    clearObjects();
    canvasEngine.requestRender();
  };

  // Position classes based on toolbarPosition
  const isVertical = toolbarPosition === 'left' || toolbarPosition === 'right';
  
  const containerClasses = {
    bottom: 'fixed bottom-0 left-0 right-0 z-[60] pointer-events-none flex justify-center pb-4 px-2',
    left: 'fixed left-0 top-0 bottom-0 z-[60] pointer-events-none flex items-center pl-4 py-2',
    right: 'fixed right-0 top-0 bottom-0 z-[60] pointer-events-none flex items-center pr-4 py-2',
  };

  const innerClasses = {
    bottom: 'pointer-events-auto relative',
    left: 'pointer-events-auto relative flex flex-col',
    right: 'pointer-events-auto relative flex flex-col',
  };

  const initialAnimation = {
    bottom: { y: 100, opacity: 0 },
    left: { x: -100, opacity: 0 },
    right: { x: 100, opacity: 0 },
  };

  const animateAnimation = {
    bottom: { y: 0, opacity: toolbarOpacity },
    left: { x: 0, opacity: toolbarOpacity },
    right: { x: 0, opacity: toolbarOpacity },
  };

  // Brush settings popover position
  const brushSettingsPosition = {
    bottom: 'absolute bottom-full mb-3 left-1/2 -translate-x-1/2',
    left: 'absolute left-full ml-3 top-1/2 -translate-y-1/2',
    right: 'absolute right-full mr-3 top-1/2 -translate-y-1/2',
  };

  // Shape picker position
  const shapePickerPosition = {
    bottom: 'absolute bottom-full mb-3 left-1/2 -translate-x-1/2',
    left: 'absolute left-full ml-3 top-0',
    right: 'absolute right-full mr-3 top-0',
  };

  return (
    <div className={containerClasses[toolbarPosition]}>
      <motion.div
        className={innerClasses[toolbarPosition]}
        initial={initialAnimation[toolbarPosition]}
        animate={animateAnimation[toolbarPosition]}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        {/* Brush Settings Popover */}
        <AnimatePresence>
          {showBrushSettings && isDrawingTool && (
            <motion.div
              ref={brushSettingsRef}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className={`${brushSettingsPosition[toolbarPosition]} glassmorphism rounded-2xl p-4 min-w-[200px] z-10`}
            >
              {/* Color Grid */}
              {activeTool !== 'eraser' && (
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {PRIMARY_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => {
                        updateToolSettings(activeTool, { color });
                        if (activeTool === 'shapes') {
                          const { selectedObjectIds, objects, updateObject } = useCanvasStore.getState();
                          selectedObjectIds.forEach((id) => {
                            const obj = objects.get(id);
                            if (obj?.kind === 'shape') {
                              updateObject(id, { strokeColor: color });
                            }
                          });
                          canvasEngine.requestRender();
                        }
                      }}
                      className="w-10 h-10 rounded-full border-2 transition-transform hover:scale-110"
                      style={{
                        backgroundColor: color,
                        borderColor: settings.color === color ? '#3B82F6' : 'transparent',
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Thickness Slider */}
              <div className="mb-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-gray-500 dark:text-gray-400">{activeTool === 'shapes' ? 'Border' : 'Thickness'}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{settings.thickness}px</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max={activeTool === 'eraser' ? '400' : activeTool === 'marker' || activeTool === 'highlighter' ? '60' : activeTool === 'shapes' ? '20' : '40'}
                  value={settings.thickness}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    updateToolSettings(activeTool, { thickness: val });
                    if (activeTool === 'shapes') {
                      const { selectedObjectIds, objects, updateObject } = useCanvasStore.getState();
                      selectedObjectIds.forEach((id) => {
                        const obj = objects.get(id);
                        if (obj?.kind === 'shape') {
                          updateObject(id, { strokeWidth: val });
                        }
                      });
                      canvasEngine.requestRender();
                    }
                  }}
                  className="w-full accent-blue-500"
                />
              </div>

              {/* Opacity Slider */}
              {activeTool !== 'eraser' && (
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Opacity</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{Math.round(settings.opacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={Math.round(settings.opacity * 100)}
                    onChange={(e) => {
                      const val = Number(e.target.value) / 100;
                      updateToolSettings(activeTool, { opacity: val });
                      if (activeTool === 'shapes') {
                        const { selectedObjectIds, objects, updateObject } = useCanvasStore.getState();
                        selectedObjectIds.forEach((id) => {
                          const obj = objects.get(id);
                          if (obj?.kind === 'shape') {
                            updateObject(id, { opacity: val });
                          }
                        });
                        canvasEngine.requestRender();
                      }
                    }}
                    className="w-full accent-blue-500"
                  />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Shape Picker Dropdown */}
        <AnimatePresence>
          {showShapePicker && (
            <motion.div
              ref={shapePickerRef}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className={`${shapePickerPosition[toolbarPosition]} glassmorphism rounded-2xl p-2 flex gap-1 z-10 ${isVertical ? 'flex-col' : ''}`}
            >
              {shapeOptions.map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  onClick={() => {
                    setActiveShape(id);
                    setShowShapePicker(false);
                  }}
                  className={`toolbar-btn ${activeShape === id ? 'active' : ''}`}
                  aria-label={label}
                >
                  <Icon size={18} />
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div className={`glassmorphism rounded-3xl px-2 sm:px-3 py-1.5 sm:py-2 flex items-center gap-0.5 sm:gap-1 max-w-full no-scrollbar ${isVertical ? 'flex-col overflow-y-auto max-h-full' : 'flex-row overflow-x-auto'}`}>
          {/* Drawing Tools */}
          {drawingTools.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => handleToolSelect(id)}
              className={`toolbar-btn ${activeTool === id ? 'active' : ''}`}
              aria-label={label}
              title={label}
            >
              <Icon size={20} strokeWidth={activeTool === id ? 2.5 : 1.5} />
            </button>
          ))}

          {/* Shapes Button */}
          <div className="relative">
            <button
              onClick={() => {
                handleToolSelect('shapes');
                setShowShapePicker(!showShapePicker);
              }}
              className={`toolbar-btn ${activeTool === 'shapes' ? 'active' : ''}`}
              aria-label="Shapes"
            >
              <Shapes size={20} strokeWidth={activeTool === 'shapes' ? 2.5 : 1.5} />
            </button>
          </div>

          {/* Divider */}
          <div className={`${isVertical ? 'w-6 h-px' : 'w-px h-6'} bg-gray-300 dark:bg-gray-600 mx-1`} />

          {/* Undo/Redo */}
          <button
            onClick={handleUndo}
            className="toolbar-btn"
            aria-label="Undo"
            disabled={!canUndo(currentPageId || '')}
            style={{ opacity: canUndo(currentPageId || '') ? 1 : 0.4 }}
          >
            <Undo2 size={20} />
          </button>
          <button
            onClick={handleRedo}
            className="toolbar-btn"
            aria-label="Redo"
            disabled={!canRedo(currentPageId || '')}
            style={{ opacity: canRedo(currentPageId || '') ? 1 : 0.4 }}
          >
            <Redo2 size={20} />
          </button>

          {/* Divider */}
          <div className={`${isVertical ? 'w-6 h-px' : 'w-px h-6'} bg-gray-300 dark:bg-gray-600 mx-1`} />

          {/* Clear All Button */}
          <button
            onClick={handleClearAll}
            className="toolbar-btn flex items-center justify-center gap-1.5 px-3 rounded-xl text-red-500 hover:bg-red-500/10 transition-colors"
            aria-label="Clear All"
            title="Clear entire canvas"
          >
            <Trash2 size={18} />
            <span className="text-xs font-medium hidden sm:inline">Clear</span>
          </button>
        </div>
      </motion.div>

      {/* Clear All Confirmation Dialog */}
      <AnimatePresence>
        {showClearConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-auto"
            onClick={() => setShowClearConfirm(false)}
          >
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="relative glassmorphism rounded-2xl p-6 mx-4 max-w-sm w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                  <Trash2 size={24} className="text-red-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">Clear entire canvas?</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">This will remove all strokes and shapes. You can undo this action.</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmClearAll}
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors"
                  >
                    Clear All
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
