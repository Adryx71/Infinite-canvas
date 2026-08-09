import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { useUIStore } from '../../state/uiStore';
import { useCanvasStore } from '../../state/canvasStore';
import { canvasEngine } from '../../engine/canvasEngine';
import type { Stroke, Shape, CanvasObject } from '../../types';

/** Invert dark ↔ light colors — preserves chromatic hues, only flips luminance extremes */
function invertBlackWhite(color: string): string {
  const lower = color.toLowerCase().trim();
  if (lower === 'black') return '#FFFFFF';
  if (lower === 'white') return '#000000';
  const match = lower.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!match) return color;
  const r = parseInt(match[1], 16);
  const g = parseInt(match[2], 16);
  const b = parseInt(match[3], 16);
  // Only invert near-black or near-white — leave colored strokes untouched
  const brightness = (r + g + b) / 3;
  const maxChannel = Math.max(r, g, b);
  const minChannel = Math.min(r, g, b);
  const saturation = maxChannel === 0 ? 0 : (maxChannel - minChannel) / maxChannel;
  // If highly saturated (colored), keep as-is to avoid invisible strokes
  if (saturation > 0.3) return color;
  if (brightness < 30) return '#FFFFFF';
  if (brightness > 225) return '#000000';
  return color;
}

export function TopBar() {
  const { theme, toggleTheme } = useUIStore();
  const { zoom, setZoom, setViewport, setBackground } = useCanvasStore();

  const zoomPercent = Math.round(zoom * 100);

  const handleZoomReset = () => {
    setZoom(1);
    setViewport(0, 0);
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-30 safe-top safe-left safe-right flex justify-between items-start p-2 sm:p-3 pointer-events-none">
      {/* Zoom Indicator - Top Left */}
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2, delay: 0.1 }}
        onClick={handleZoomReset}
        className="glassmorphism rounded-xl px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-white/90 dark:hover:bg-gray-800/90 transition-colors pointer-events-auto cursor-pointer"
        title="Reset zoom to 100%"
      >
        {zoomPercent}%
      </motion.button>

      {/* Theme Toggle & Mini Map Toggle - Top Right */}
      <div className="flex gap-2 pointer-events-auto">
        <motion.button
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2, delay: 0.15 }}
          onClick={() => {
            toggleTheme();
            const newTheme = theme === 'dark' ? 'light' : 'dark';
            // Auto-switch canvas background: AMOLED for dark, white for light
            setBackground(newTheme === 'dark' ? 'amoled' : 'white');
            // Invert black ↔ white strokes and shape colors
            const { objects } = useCanvasStore.getState();
            const invertedObjects: CanvasObject[] = [];
            objects.forEach((obj) => {
              if (obj.kind === 'stroke') {
                const newColor = invertBlackWhite(obj.color);
                invertedObjects.push({ ...obj, color: newColor } as Stroke);
              } else if (obj.kind === 'shape') {
                const newStrokeColor = invertBlackWhite(obj.strokeColor);
                const newFillColor = obj.fillColor ? invertBlackWhite(obj.fillColor) : undefined;
                invertedObjects.push({ ...obj, strokeColor: newStrokeColor, fillColor: newFillColor } as Shape);
              }
            });
            const { clearObjects, addObjects } = useCanvasStore.getState();
            clearObjects();
            addObjects(invertedObjects);
            // Swap default tool colors for the active tool
            const { updateToolSettings, getToolSettings } = useUIStore.getState();
            const drawingTools = ['pencil', 'pen', 'marker', 'eraser', 'shapes'];
            drawingTools.forEach((tool) => {
              const s = getToolSettings(tool);
              const newColor = invertBlackWhite(s.color);
              updateToolSettings(tool, { color: newColor });
            });
            canvasEngine.requestRender();
          }}
          className="toolbar-btn glassmorphism"
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </motion.button>
      </div>
    </div>
  );
}
