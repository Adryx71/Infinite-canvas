import { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCanvasStore } from '../../state/canvasStore';
import { useUIStore } from '../../state/uiStore';
import { canvasEngine } from '../../engine/canvasEngine';

export function MiniMap() {
  const { miniMapVisible } = useUIStore();
  const { objects, viewportX, viewportY, zoom, setViewport } = useCanvasStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const renderMiniMap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 120;
    const height = 80;
    canvas.width = width;
    canvas.height = height;

    // Find bounds of all objects
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const objectArray = Array.from(objects.values());

    if (objectArray.length === 0) {
      // Default view when empty
      minX = viewportX - 500;
      minY = viewportY - 500;
      maxX = viewportX + 500;
      maxY = viewportY + 500;
    } else {
      objectArray.forEach(obj => {
        if (obj.kind === 'stroke' && obj.points.length > 0) {
          obj.points.forEach(p => {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
          });
        } else if (obj.kind === 'shape') {
          minX = Math.min(minX, obj.position.x);
          minY = Math.min(minY, obj.position.y);
          maxX = Math.max(maxX, obj.position.x + obj.size.width);
          maxY = Math.max(maxY, obj.position.y + obj.size.height);
        }
      });
    }

    const padding = 100;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;

    const worldWidth = maxX - minX || 1;
    const worldHeight = maxY - minY || 1;
    const scale = Math.min(width / worldWidth, height / worldHeight);

    // Draw background
    const uiState = useUIStore.getState();
    ctx.fillStyle = uiState.theme === 'dark' ? '#1a1a1a' : '#f5f5f5';
    ctx.fillRect(0, 0, width, height);

    // Draw objects
    objectArray.forEach(obj => {
      if (obj.kind === 'stroke' && obj.points.length > 1) {
        ctx.beginPath();
        ctx.strokeStyle = obj.color;
        ctx.lineWidth = Math.max(1, obj.width * scale);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = obj.opacity;

        const firstPoint = obj.points[0];
        ctx.moveTo(
          (firstPoint.x - minX) * scale,
          (firstPoint.y - minY) * scale
        );

        for (let i = 1; i < obj.points.length; i++) {
          const point = obj.points[i];
          ctx.lineTo(
            (point.x - minX) * scale,
            (point.y - minY) * scale
          );
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else if (obj.kind === 'shape') {
        ctx.fillStyle = obj.fillColor || obj.strokeColor;
        ctx.globalAlpha = obj.opacity * 0.5;
        ctx.fillRect(
          (obj.position.x - minX) * scale,
          (obj.position.y - minY) * scale,
          obj.size.width * scale,
          obj.size.height * scale
        );
        ctx.globalAlpha = 1;
      }
    });

    // Draw viewport rectangle
    const viewport = canvasEngine.getViewport();
    if (viewport.width === 0 || viewport.height === 0) return;
    const viewX = (viewport.x - minX) * scale;
    const viewY = (viewport.y - minY) * scale;
    const viewW = viewport.width * scale;
    const viewH = viewport.height * scale;

    ctx.strokeStyle = uiState.theme === 'dark' ? '#60A5FA' : '#3B82F6';
    ctx.lineWidth = 2;
    ctx.strokeRect(viewX, viewY, viewW, viewH);
    ctx.fillStyle = uiState.theme === 'dark' ? 'rgba(96,165,250,0.1)' : 'rgba(59,130,246,0.1)';
    ctx.fillRect(viewX, viewY, viewW, viewH);
  }, [objects, viewportX, viewportY, zoom]);

  useEffect(() => {
    if (miniMapVisible) {
      renderMiniMap();
    }
  }, [miniMapVisible, renderMiniMap]);

  useEffect(() => {
    const interval = setInterval(renderMiniMap, 500);
    return () => clearInterval(interval);
  }, [renderMiniMap]);

  const handleCanvasInteraction = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = clientX - rect.left;
    const clickY = clientY - rect.top;

    const objectArray = Array.from(objects.values());
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    if (objectArray.length === 0) {
      minX = viewportX - 500;
      minY = viewportY - 500;
      maxX = viewportX + 500;
      maxY = viewportY + 500;
    } else {
      objectArray.forEach(obj => {
        if (obj.kind === 'stroke' && obj.points.length > 0) {
          obj.points.forEach(p => {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
          });
        } else if (obj.kind === 'shape') {
          minX = Math.min(minX, obj.position.x);
          minY = Math.min(minY, obj.position.y);
          maxX = Math.max(maxX, obj.position.x + obj.size.width);
          maxY = Math.max(maxY, obj.position.y + obj.size.height);
        }
      });
    }

    const padding = 100;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;

    const worldWidth = maxX - minX || 1;
    const worldHeight = maxY - minY || 1;
    const scale = Math.min(120 / worldWidth, 80 / worldHeight);

    const worldX = clickX / scale + minX;
    const worldY = clickY / scale + minY;

    const viewport = canvasEngine.getViewport();
    if (viewport.width === 0 || viewport.height === 0) return;
    setViewport(
      worldX - viewport.width / 2,
      worldY - viewport.height / 2
    );
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    handleCanvasInteraction(e.clientX, e.clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const touch = e.changedTouches[0];
    if (touch) {
      handleCanvasInteraction(touch.clientX, touch.clientY);
    }
  };

  return (
    <AnimatePresence>
      {miniMapVisible && (
        <motion.div
          ref={containerRef}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.15 }}
          className="fixed bottom-20 right-3 sm:right-4 z-40 safe-right safe-bottom"
        >
          <div className="glassmorphism rounded-xl overflow-hidden shadow-lg">
            <canvas
              ref={canvasRef}
              width={120}
              height={80}
              onClick={handleClick}
              onTouchEnd={handleTouchEnd}
              className="cursor-pointer touch-none"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
