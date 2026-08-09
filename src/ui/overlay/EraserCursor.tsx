import { useEffect, useRef } from 'react';
import { useCanvasStore } from '../../state/canvasStore';
import { useUIStore } from '../../state/uiStore';

/**
 * Renders a circle cursor at the mouse position showing the eraser radius.
 * Uses requestAnimationFrame for smooth 60fps updates without React re-renders.
 * Listens to pointer-move custom events dispatched by the gesture handler.
 */
export function EraserCursor() {
  const activeTool = useCanvasStore((s) => s.activeTool);
  const zoom = useCanvasStore((s) => s.zoom);
  const eraserSettings = useUIStore((s) => s.getToolSettings('eraser'));
  const worldRadius = eraserSettings.thickness / 2;

  // Screen-space radius = world radius × zoom
  const screenRadius = worldRadius * zoom;

  // Use refs for zero-react-rerender updates
  const circleRef = useRef<HTMLDivElement>(null);
  const posRef = useRef<{ x: number; y: number } | null>(null);
  const radiusRef = useRef(screenRadius);
  const rafRef = useRef<number>(0);
  const visibleRef = useRef(false);

  // Keep radiusRef in sync
  radiusRef.current = screenRadius;

  useEffect(() => {
    const updateDOM = () => {
      const el = circleRef.current;
      const pos = posRef.current;
      const r = radiusRef.current;
      if (!el) return;

      if (pos && visibleRef.current && r > 0) {
        el.style.left = `${pos.x - r}px`;
        el.style.top = `${pos.y - r}px`;
        el.style.width = `${r * 2}px`;
        el.style.height = `${r * 2}px`;
        el.style.opacity = '1';
      } else {
        el.style.opacity = '0';
      }
    };

    const scheduleUpdate = () => {
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = 0;
          updateDOM();
        });
      }
    };

    const handlePointerMove = (e: Event) => {
      const detail = (e as CustomEvent).detail as { x: number; y: number } | undefined;
      if (detail) {
        posRef.current = { x: detail.x, y: detail.y };
        visibleRef.current = true;
        scheduleUpdate();
      }
    };

    const handlePointerLeave = () => {
      visibleRef.current = false;
      scheduleUpdate();
    };

    window.addEventListener('infinity-board:pointer-move', handlePointerMove);
    window.addEventListener('infinity-board:pointer-leave', handlePointerLeave);
    return () => {
      window.removeEventListener('infinity-board:pointer-move', handlePointerMove);
      window.removeEventListener('infinity-board:pointer-leave', handlePointerLeave);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []); // Only attach once — radiusRef is always current

  // Don't render anything when eraser is not active
  if (activeTool !== 'eraser') return null;

  const diameter = screenRadius * 2;

  return (
    <div
      ref={circleRef}
      className="absolute pointer-events-none"
      style={{
        width: diameter,
        height: diameter,
        borderRadius: '50%',
        border: '2px solid rgba(255, 255, 255, 0.9)',
        boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.4), inset 0 0 2px rgba(0, 0, 0, 0.2)',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        opacity: 0,
        transform: 'translateZ(0)',
        zIndex: 60,
        willChange: 'left, top, width, height, opacity',
        transition: 'opacity 0.15s ease-out',
      }}
    />
  );
}
