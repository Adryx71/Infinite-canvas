import { useEffect, useRef } from 'react';
import { useUIStore } from '../../state/uiStore';
import { BACKGROUND_COLORS, BACKGROUND_COLORS_DARK } from '../../config';
import type { CanvasObject } from '../../types';

interface PageThumbnailProps {
  objects: CanvasObject[];
  background: string;
  width?: number;
  height?: number;
  className?: string;
}

export function PageThumbnail({
  objects,
  background,
  width = 120,
  height = 80,
  className = '',
}: PageThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme } = useUIStore();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas resolution
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Clear and draw background using the same colors as the canvas engine
    const bgColors = theme === 'dark' ? BACKGROUND_COLORS_DARK : BACKGROUND_COLORS;
    ctx.fillStyle = bgColors[background] || (theme === 'dark' ? '#000000' : '#FFFFFF');
    ctx.fillRect(0, 0, width, height);

    if (objects.length === 0) return;

    // Find bounds of all objects
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    objects.forEach(obj => {
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

    if (!isFinite(minX)) return;

    const padding = 50;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;

    const worldWidth = maxX - minX || 1;
    const worldHeight = maxY - minY || 1;
    const scale = Math.min(width / worldWidth, height / worldHeight);

    // Center the content
    const offsetX = (width - worldWidth * scale) / 2;
    const offsetY = (height - worldHeight * scale) / 2;

    // Draw objects
    objects.forEach(obj => {
      if (obj.kind === 'stroke' && obj.points.length > 1) {
        ctx.beginPath();
        ctx.strokeStyle = theme === 'dark' && obj.color === '#000000' ? '#FFFFFF' : obj.color;
        ctx.lineWidth = Math.max(0.5, obj.width * scale);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = obj.opacity;

        const firstPoint = obj.points[0];
        ctx.moveTo(
          (firstPoint.x - minX) * scale + offsetX,
          (firstPoint.y - minY) * scale + offsetY
        );

        for (let i = 1; i < obj.points.length; i++) {
          const point = obj.points[i];
          ctx.lineTo(
            (point.x - minX) * scale + offsetX,
            (point.y - minY) * scale + offsetY
          );
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else if (obj.kind === 'shape') {
        const strokeColor = theme === 'dark' && obj.strokeColor === '#000000' ? '#FFFFFF' : obj.strokeColor;
        ctx.fillStyle = obj.fillColor || strokeColor;
        ctx.globalAlpha = obj.opacity * 0.5;
        ctx.fillRect(
          (obj.position.x - minX) * scale + offsetX,
          (obj.position.y - minY) * scale + offsetY,
          obj.size.width * scale,
          obj.size.height * scale
        );
        ctx.globalAlpha = 1;
      }
    });
  }, [objects, background, width, height, theme]);

  return (
    <canvas
      ref={canvasRef}
      className={`rounded-lg ${className}`}
      style={{ width, height }}
    />
  );
}
