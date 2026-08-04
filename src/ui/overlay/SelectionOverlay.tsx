import { useMemo } from 'react';
import { useCanvasStore } from '../../state/canvasStore';
import { useUIStore } from '../../state/uiStore';
import type { Shape } from '../../types';

/**
 * HTML/CSS/SVG overlay for selection UI.
 * Renders selection polygon, corner handles, rotation handle, and connector line
 * as DOM elements instead of PixiJS Graphics — completely avoids the v8 stroke path leak.
 */
export function SelectionOverlay() {
  const selectedObjectIds = useCanvasStore((s) => s.selectedObjectIds);
  const objects = useCanvasStore((s) => s.objects);
  const viewportX = useCanvasStore((s) => s.viewportX);
  const viewportY = useCanvasStore((s) => s.viewportY);
  const zoom = useCanvasStore((s) => s.zoom);
  const theme = useUIStore((s) => s.theme);

  const selectionColor = theme === 'dark' ? '#60A5FA' : '#3B82F6';
  const lineWidth = 2 / zoom;
  const handleRadius = 6 / zoom;
  const padding = 4 / zoom;

  // Compute selection geometry for all selected objects
  const selectionData = useMemo(() => {
    if (selectedObjectIds.size === 0) return null;

    const results: Array<{
      id: string;
      // Polygon corners in screen space (for SVG polygon)
      polygonPoints: string;
      // Corner handles in screen space (4 corners)
      corners: Array<{ x: number; y: number }>;
      // Rotation handle position in screen space
      rotHandleX: number;
      rotHandleY: number;
      // Connector line start (top-center of rotated box)
      connectorStartX: number;
      connectorStartY: number;
      isShape: boolean;
    }> = [];

    selectedObjectIds.forEach((id) => {
      const obj = objects.get(id);
      if (!obj) return;

      const isShape = obj.kind === 'shape';
      let centerX: number, centerY: number, shapeW: number, shapeH: number, rotation: number;

      if (isShape) {
        const shape = obj as Shape;
        centerX = shape.position.x + shape.size.width / 2;
        centerY = shape.position.y + shape.size.height / 2;
        shapeW = shape.size.width;
        shapeH = shape.size.height;
        rotation = shape.rotation;
      } else {
        // Strokes: compute AABB from points
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const p of obj.points) {
          minX = Math.min(minX, p.x);
          minY = Math.min(minY, p.y);
          maxX = Math.max(maxX, p.x);
          maxY = Math.max(maxY, p.y);
        }
        centerX = (minX + maxX) / 2;
        centerY = (minY + maxY) / 2;
        shapeW = maxX - minX;
        shapeH = maxY - minY;
        rotation = 0;
      }

      const angle = (rotation * Math.PI) / 180;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const hw = shapeW / 2 + padding;
      const hh = shapeH / 2 + padding;

      // Compute rotated corners of the selection box
      const worldCorners = [
        { x: centerX + (-hw * cosA - -hh * sinA), y: centerY + (-hw * sinA + -hh * cosA) },
        { x: centerX + (hw * cosA - -hh * sinA), y: centerY + (hw * sinA + -hh * cosA) },
        { x: centerX + (hw * cosA - hh * sinA), y: centerY + (hw * sinA + hh * cosA) },
        { x: centerX + (-hw * cosA - hh * sinA), y: centerY + (-hw * sinA + hh * cosA) },
      ];

      // Convert to screen space
      const screenCorners = worldCorners.map((c) => ({
        x: (c.x - viewportX) * zoom,
        y: (c.y - viewportY) * zoom,
      }));

      const polygonPoints = screenCorners.map((c) => `${c.x},${c.y}`).join(' ');

      // Rotation handle
      const handleDist = 32 / zoom;
      const rotHandleWorldX = centerX + (hh + handleDist) * sinA;
      const rotHandleWorldY = centerY - (hh + handleDist) * cosA;
      const rotHandleScreenX = (rotHandleWorldX - viewportX) * zoom;
      const rotHandleScreenY = (rotHandleWorldY - viewportY) * zoom;

      // Connector line start (top-center of rotated box)
      const connectorWorldX = centerX + hh * sinA;
      const connectorWorldY = centerY - hh * cosA;
      const connectorScreenX = (connectorWorldX - viewportX) * zoom;
      const connectorScreenY = (connectorWorldY - viewportY) * zoom;

      results.push({
        id,
        polygonPoints,
        corners: screenCorners,
        rotHandleX: rotHandleScreenX,
        rotHandleY: rotHandleScreenY,
        connectorStartX: connectorScreenX,
        connectorStartY: connectorScreenY,
        isShape,
      });
    });

    return results;
  }, [selectedObjectIds, objects, viewportX, viewportY, zoom, padding]);

  if (!selectionData) return null;

  const handleScreenRadius = handleRadius * zoom;

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 50 }}>
      <svg className="absolute inset-0 w-full h-full" style={{ overflow: 'visible' }}>
        {selectionData.map((sel) => (
          <g key={sel.id}>
            {/* Selection polygon */}
            <polygon
              points={sel.polygonPoints}
              fill="none"
              stroke={selectionColor}
              strokeWidth={lineWidth * zoom}
              vectorEffect="non-scaling-stroke"
            />

            {/* Connector line from top-center to rotation handle (only for shapes) */}
            {sel.isShape && (
              <line
                x1={sel.connectorStartX}
                y1={sel.connectorStartY}
                x2={sel.rotHandleX}
                y2={sel.rotHandleY}
                stroke={selectionColor}
                strokeWidth={lineWidth * zoom}
                vectorEffect="non-scaling-stroke"
              />
            )}
          </g>
        ))}
      </svg>

      {/* Corner handles */}
      {selectionData.map((sel) =>
        sel.corners.map((corner, i) => (
          <div
            key={`${sel.id}-corner-${i}`}
            className="absolute"
            style={{
              left: corner.x - handleScreenRadius,
              top: corner.y - handleScreenRadius,
              width: handleScreenRadius * 2,
              height: handleScreenRadius * 2,
              borderRadius: '50%',
              backgroundColor: '#ffffff',
              border: `${lineWidth * zoom}px solid ${selectionColor}`,
              pointerEvents: 'none',
              transform: 'translateZ(0)',
            }}
          />
        ))
      )}

      {/* Rotation handle (only for shapes) */}
      {selectionData.filter((s) => s.isShape).map((sel) => {
        const rotRadius = handleScreenRadius * 1.1;
        return (
          <div
            key={`${sel.id}-rotation`}
            className="absolute"
            style={{
              left: sel.rotHandleX - rotRadius - 1.5,
              top: sel.rotHandleY - rotRadius - 1.5,
              width: (rotRadius + 1.5) * 2,
              height: (rotRadius + 1.5) * 2,
              borderRadius: '50%',
              backgroundColor: selectionColor,
              pointerEvents: 'none',
              transform: 'translateZ(0)',
            }}
          >
            {/* White inner circle */}
            <div
              className="absolute"
              style={{
                left: 1.5,
                top: 1.5,
                width: rotRadius * 2,
                height: rotRadius * 2,
                borderRadius: '50%',
                backgroundColor: '#ffffff',
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
