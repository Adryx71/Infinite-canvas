import type { Point, Stroke, Shape, CanvasObject } from '../types';
import { GESTURE } from '../config';
import { useCanvasStore } from '../state/canvasStore';
import { useUIStore } from '../state/uiStore';
import { useUndoRedoStore } from '../state/undoRedoStore';
import { canvasEngine } from '../engine/canvasEngine';

interface ActivePointer {
  id: number;
  type: string;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  startTime: number;
  pressure: number;
}

export class GestureHandler {
  private pointers: Map<number, ActivePointer> = new Map();
  private lastTapTime = 0;
  private lastTapX = 0;
  private lastTapY = 0;
  private longPressTimer: ReturnType<typeof setTimeout> | null = null;
  private container: HTMLElement | null = null;
  private isPanning = false;
  private panStartX = 0;
  private panStartY = 0;
  private panStartViewportX = 0;
  private panStartViewportY = 0;
  private isPinching = false;
  private pinchStartDistance = 0;
  private pinchStartZoom = 1;
  private isDrawing = false;
  private spacePressed = false;
  // Resize state
  private isResizing = false;
  private resizeHandleIndex = -1;
  private resizeShapeId = '';
  private resizeStartWorldX = 0;
  private resizeStartWorldY = 0;
  private resizeOriginalX = 0;
  private resizeOriginalY = 0;
  private resizeOriginalW = 0;
  private resizeOriginalH = 0;
  // Move state
  private isMoving = false;
  private moveStartWorldX = 0;
  private moveStartWorldY = 0;
  private moveOriginalPositions: Map<string, { x: number; y: number }> = new Map();
  // Rotation state
  private isRotating = false;
  private rotateShapeId = '';
  private rotateStartAngle = 0;
  private rotateOriginalRotation = 0;
  // Eraser throttling
  private lastEraserTime = 0;
  private static readonly ERASER_THROTTLE_MS = 16; // ~60fps

  attach(element: HTMLElement): void {
    if (!element) return;
    this.container = element;
    element.addEventListener('pointerdown', this.handlePointerDown);
    element.addEventListener('pointermove', this.handlePointerMove);
    element.addEventListener('pointerup', this.handlePointerUp);
    element.addEventListener('pointercancel', this.handlePointerCancel);
    element.addEventListener('wheel', this.handleWheel, { passive: false });
    element.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  detach(): void {
    if (!this.container) return;
    this.container.removeEventListener('pointerdown', this.handlePointerDown);
    this.container.removeEventListener('pointermove', this.handlePointerMove);
    this.container.removeEventListener('pointerup', this.handlePointerUp);
    this.container.removeEventListener('pointercancel', this.handlePointerCancel);
    this.container.removeEventListener('wheel', this.handleWheel);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    this.cancelLongPress();
  }

  private handlePointerDown = (e: PointerEvent): void => {
    if (!this.container) return;

    this.pointers.set(e.pointerId, {
      id: e.pointerId,
      type: e.pointerType,
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
      startTime: Date.now(),
      pressure: e.pressure,
    });

    const rect = this.container.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    const hasStylus = Array.from(this.pointers.values()).some((p) => p.type === 'pen');
    const isTouch = e.pointerType === 'touch';

    if (this.pointers.size === 2) {
      const points = Array.from(this.pointers.values());
      const dist = this.getDistance(points[0], points[1]);
      this.isPinching = true;
      this.pinchStartDistance = dist;
      this.pinchStartZoom = useCanvasStore.getState().zoom;
      this.cancelDrawing();
      return;
    }

    if (this.pointers.size >= 3) {
      this.cancelDrawing();
      this.cancelLongPress();
      return;
    }

    const state = useCanvasStore.getState();
    const tool = state.activeTool;

    if (isTouch && hasStylus) {
      this.startPan(screenX, screenY);
      return;
    }

    if (this.spacePressed || e.button === 1) {
      this.startPan(screenX, screenY);
      return;
    }

    if (tool === 'selection') {
      this.handleSelectionStart(screenX, screenY);
      return;
    }

    if (['pencil', 'pen', 'marker', 'highlighter'].includes(tool)) {
      this.startDrawing(screenX, screenY, tool);
      return;
    }

    if (tool === 'eraser') {
      this.startErasing(screenX, screenY);
      return;
    }

    if (tool === 'shapes') {
      this.startShapeCreation(screenX, screenY);
      return;
    }

    this.startPan(screenX, screenY);

    this.longPressTimer = setTimeout(() => {
      this.handleLongPress(screenX, screenY);
    }, GESTURE.LONG_PRESS_DURATION);
  };

  private handlePointerMove = (e: PointerEvent): void => {
    const pointer = this.pointers.get(e.pointerId);
    if (!pointer) return;

    pointer.currentX = e.clientX;
    pointer.currentY = e.clientY;
    pointer.pressure = e.pressure;

    const rect = this.container?.getBoundingClientRect();
    if (!rect) return;

    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    const dist = Math.hypot(e.clientX - pointer.startX, e.clientY - pointer.startY);
    if (dist > GESTURE.LONG_PRESS_MAX_MOVEMENT) {
      this.cancelLongPress();
    }

    if (this.isPinching && this.pointers.size === 2) {
      const points = Array.from(this.pointers.values());
      const pinchDist = this.getDistance(points[0], points[1]);
      const scale = pinchDist / this.pinchStartDistance;
      const targetZoom = this.pinchStartZoom * scale;
      // Compute delta relative to current zoom, not start zoom
      const currentZoom = useCanvasStore.getState().zoom;
      const delta = targetZoom / currentZoom - 1;

      const midScreenX = (points[0].currentX + points[1].currentX) / 2 - rect.left;
      const midScreenY = (points[0].currentY + points[1].currentY) / 2 - rect.top;

      useCanvasStore.getState().zoomAt({ x: midScreenX, y: midScreenY }, delta);
      canvasEngine.requestRender();
      return;
    }

    if (this.isPanning) {
      const dx = e.clientX - this.panStartX;
      const dy = e.clientY - this.panStartY;
      const state = useCanvasStore.getState();
      state.setViewport(
        this.panStartViewportX - dx / state.zoom,
        this.panStartViewportY - dy / state.zoom
      );
      canvasEngine.requestRender();
      return;
    }

    // Handle resize dragging
    if (this.isResizing) {
      const worldPoint = canvasEngine.screenToWorld(screenX, screenY);
      const dx = worldPoint.x - this.resizeStartWorldX;
      const dy = worldPoint.y - this.resizeStartWorldY;
      const MIN_SIZE = 10;
      const state = useCanvasStore.getState();
      const shape = state.objects.get(this.resizeShapeId);
      if (shape?.kind === 'shape') {
        let newX = this.resizeOriginalX;
        let newY = this.resizeOriginalY;
        let newW = this.resizeOriginalW;
        let newH = this.resizeOriginalH;
        switch (this.resizeHandleIndex) {
          case 0: // TL
            newX = this.resizeOriginalX + dx;
            newY = this.resizeOriginalY + dy;
            newW = this.resizeOriginalW - dx;
            newH = this.resizeOriginalH - dy;
            break;
          case 1: // TR
            newY = this.resizeOriginalY + dy;
            newW = this.resizeOriginalW + dx;
            newH = this.resizeOriginalH - dy;
            break;
          case 2: // BL
            newX = this.resizeOriginalX + dx;
            newW = this.resizeOriginalW - dx;
            newH = this.resizeOriginalH + dy;
            break;
          case 3: // BR
            newW = this.resizeOriginalW + dx;
            newH = this.resizeOriginalH + dy;
            break;
        }
        // Enforce minimum size and reanchor position when clamping
        if (newW < MIN_SIZE) {
          if (this.resizeHandleIndex === 0 || this.resizeHandleIndex === 2) {
            newX = this.resizeOriginalX + this.resizeOriginalW - MIN_SIZE;
          }
          newW = MIN_SIZE;
        }
        if (newH < MIN_SIZE) {
          if (this.resizeHandleIndex === 0 || this.resizeHandleIndex === 1) {
            newY = this.resizeOriginalY + this.resizeOriginalH - MIN_SIZE;
          }
          newH = MIN_SIZE;
        }
        state.updateObject(this.resizeShapeId, {
          position: { x: newX, y: newY },
          size: { width: newW, height: newH },
        } as any);
        canvasEngine.requestRender();
      }
      return;
    }

    // Handle rotation dragging
    if (this.isRotating) {
      const worldPoint = canvasEngine.screenToWorld(screenX, screenY);
      const state = useCanvasStore.getState();
      const shape = state.objects.get(this.rotateShapeId);
      if (shape?.kind === 'shape') {
        const centerX = shape.position.x + shape.size.width / 2;
        const centerY = shape.position.y + shape.size.height / 2;
        const currentAngle = Math.atan2(worldPoint.y - centerY, worldPoint.x - centerX);
        const deltaAngle = currentAngle - this.rotateStartAngle;
        const newRotation = this.rotateOriginalRotation + (deltaAngle * 180) / Math.PI;
        // Snap to 15-degree increments when Shift is held
        let snapped = newRotation;
        if (this.spacePressed) {
          snapped = Math.round(newRotation / 15) * 15;
        }
        state.updateObject(this.rotateShapeId, { rotation: snapped } as any);
        canvasEngine.requestRender();
      }
      return;
    }

    // Handle move dragging
    if (this.isMoving) {
      const worldPoint = canvasEngine.screenToWorld(screenX, screenY);
      const dx = worldPoint.x - this.moveStartWorldX;
      const dy = worldPoint.y - this.moveStartWorldY;
      const state = useCanvasStore.getState();
      this.moveOriginalPositions.forEach((orig, id) => {
        state.updateObject(id, {
          position: { x: orig.x + dx, y: orig.y + dy },
        } as any);
      });
      canvasEngine.requestRender();
      return;
    }

    if (this.isDrawing) {
      const state = useCanvasStore.getState();
      if (state.currentStroke) {
        const worldPoint = canvasEngine.screenToWorld(screenX, screenY);
        const now = Date.now();
        // Pressure simulation: if no real pressure (finger/mouse), derive from speed
        let pressure = pointer.pressure;
        if (pressure === 0 || pointer.type === 'mouse') {
          const lastPt = state.currentStroke.points[state.currentStroke.points.length - 1];
          if (lastPt) {
            const dist = Math.hypot(worldPoint.x - lastPt.x, worldPoint.y - lastPt.y);
            const dt = Math.max(1, now - lastPt.t);
            const speed = dist / dt; // world units per ms
            // Slower = thicker/darker (higher pressure), faster = thinner/lighter
            pressure = Math.max(0.15, Math.min(0.85, 0.8 - speed * 0.3));
          } else {
            pressure = 0.5;
          }
        }
        state.addPointToStroke({
          x: worldPoint.x,
          y: worldPoint.y,
          pressure,
          t: now,
        });
        canvasEngine.requestRender();
      } else if (state.activeTool === 'eraser') {
        // Throttle eraser moves for performance
        const now = Date.now();
        if (now - this.lastEraserTime >= GestureHandler.ERASER_THROTTLE_MS) {
          this.handleErasing(screenX, screenY);
          this.lastEraserTime = now;
        }
      }
      return;
    }
  };

  private handlePointerUp = (e: PointerEvent): void => {
    const pointer = this.pointers.get(e.pointerId);
    if (!pointer) return;

    const now = Date.now();
    const tapDist = Math.hypot(e.clientX - this.lastTapX, e.clientY - this.lastTapY);
    if (
      now - this.lastTapTime < GESTURE.DOUBLE_TAP_INTERVAL &&
      now - pointer.startTime < GESTURE.DOUBLE_TAP_MAX_DURATION &&
      tapDist < GESTURE.DOUBLE_TAP_MAX_MOVEMENT
    ) {
      this.handleDoubleTap();
    }

    this.lastTapTime = now;
    this.lastTapX = e.clientX;
    this.lastTapY = e.clientY;

    if (this.isPinching && this.pointers.size === 2) {
      this.isPinching = false;
      this.pointers.delete(e.pointerId);
      if (!this.pointers.size) this.isPanning = false;
      return;
    }

    // Finalize resize
    if (this.isResizing) {
      const state = useCanvasStore.getState();
      if (state.currentPageId) {
        const { pushUndo } = useUndoRedoStore.getState();
        pushUndo(state.currentPageId, Array.from(state.objects.values()));
      }
      this.isResizing = false;
      this.resizeHandleIndex = -1;
      this.resizeShapeId = '';
      this.autosave();
    }

    // Finalize rotation
    if (this.isRotating) {
      const state = useCanvasStore.getState();
      if (state.currentPageId) {
        const { pushUndo } = useUndoRedoStore.getState();
        pushUndo(state.currentPageId, Array.from(state.objects.values()));
      }
      this.isRotating = false;
      this.rotateShapeId = '';
      this.autosave();
    }

    // Finalize move
    if (this.isMoving) {
      const state = useCanvasStore.getState();
      if (state.currentPageId) {
        const { pushUndo } = useUndoRedoStore.getState();
        pushUndo(state.currentPageId, Array.from(state.objects.values()));
      }
      this.isMoving = false;
      this.moveOriginalPositions.clear();
      this.autosave();
    }

    if (this.isDrawing) {
      const state = useCanvasStore.getState();
      if (state.activeTool === 'eraser') {
        this.endErasing();
      } else {
        this.endDrawing();
      }
    }

    this.pointers.delete(e.pointerId);
    this.cancelLongPress();

    if (this.pointers.size === 0) {
      this.isPanning = false;
      this.isDrawing = false;
    }
  };

  private handlePointerCancel = (e: PointerEvent): void => {
    // Push undo if resize, move, or rotate was in progress
    if (this.isResizing || this.isMoving || this.isRotating) {
      const state = useCanvasStore.getState();
      if (state.currentPageId) {
        const { pushUndo } = useUndoRedoStore.getState();
        pushUndo(state.currentPageId, Array.from(state.objects.values()));
      }
      this.autosave();
    }
    this.pointers.delete(e.pointerId);
    this.cancelLongPress();
    this.isResizing = false;
    this.isMoving = false;
    this.isRotating = false;
    if (!this.pointers.size) {
      this.isPanning = false;
      this.isDrawing = false;
      this.isPinching = false;
    }
  };

  private handleWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const rect = this.container?.getBoundingClientRect();
    if (!rect) return;

    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const delta = -e.deltaY * 0.001;

    useCanvasStore.getState().zoomAt({ x: screenX, y: screenY }, delta);
    canvasEngine.requestRender();
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === ' ') {
      this.spacePressed = true;
    }
    // Ctrl/Cmd+Z for undo, Ctrl/Cmd+Shift+Z for redo
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      this.undo();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
      e.preventDefault();
      this.redo();
    }
    // Ctrl/Cmd+Y for redo (Windows convention)
    if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
      e.preventDefault();
      this.redo();
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    if (e.key === ' ') {
      this.spacePressed = false;
    }
  };

  private getDistance(a: ActivePointer, b: ActivePointer): number {
    return Math.hypot(a.currentX - b.currentX, a.currentY - b.currentY);
  }

  private startPan(screenX: number, screenY: number): void {
    this.isPanning = true;
    this.panStartX = screenX;
    this.panStartY = screenY;
    const state = useCanvasStore.getState();
    this.panStartViewportX = state.viewportX;
    this.panStartViewportY = state.viewportY;
  }

  private startDrawing(screenX: number, screenY: number, tool: string): void {
    const state = useCanvasStore.getState();
    const uiState = useUIStore.getState();
    const toolSettings = uiState.getToolSettings(tool);
    const worldPoint = canvasEngine.screenToWorld(screenX, screenY);

    const stroke: Stroke = {
      id: crypto.randomUUID(),
      pageId: state.currentPageId || '',
      kind: 'stroke',
      tool: tool as Stroke['tool'],
      points: [
        {
          x: worldPoint.x,
          y: worldPoint.y,
          pressure: 0.5,
          t: Date.now(),
        },
      ],
      color: toolSettings.color,
      width: toolSettings.thickness,
      opacity: toolSettings.opacity,
      smoothing: toolSettings.smoothing,
      createdAt: Date.now(),
    };

    state.startStroke(stroke);
    this.isDrawing = true;
    uiState.setToolbarExpanded(false);
    uiState.setToolbarOpacity(0.6);
  }

  private endDrawing(): void {
    const state = useCanvasStore.getState();
    const completedStroke = state.endStroke();

    if (completedStroke) {
      const { pushUndo } = useUndoRedoStore.getState();
      pushUndo(completedStroke.pageId, Array.from(state.objects.values()));
      this.autosave();
    }

    setTimeout(() => {
      useUIStore.getState().setToolbarExpanded(true);
      useUIStore.getState().setToolbarOpacity(1);
    }, 800);
  }

  private startErasing(screenX: number, screenY: number): void {
    this.isDrawing = true;
    this.lastEraserTime = Date.now();
    this.handleErasing(screenX, screenY);
  }

  private handleErasing(screenX: number, screenY: number): void {
    const state = useCanvasStore.getState();
    const worldPoint = canvasEngine.screenToWorld(screenX, screenY);
    const eraserSettings = useUIStore.getState().getToolSettings('eraser');
    const eraserRadius = eraserSettings.thickness / 2;

    const objectsToRemove: string[] = [];
    state.objects.forEach((obj) => {
      if (this.isObjectNearPoint(obj, worldPoint, eraserRadius)) {
        objectsToRemove.push(obj.id);
      }
    });

    if (objectsToRemove.length > 0) {
      state.removeObjects(objectsToRemove);
      canvasEngine.requestRender();
    }
  }

  private endErasing(): void {
    this.isDrawing = false;
    this.autosave();
  }

  private isObjectNearPoint(
    obj: CanvasObject,
    point: { x: number; y: number },
    radius: number
  ): boolean {
    if (obj.kind === 'stroke') {
      // Early exit: check bounding box first before iterating all points
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const p of obj.points) {
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
      }
      // If point is far from bounding box, skip expensive per-point check
      if (
        point.x < minX - radius || point.x > maxX + radius ||
        point.y < minY - radius || point.y > maxY + radius
      ) {
        return false;
      }
      return obj.points.some(
        (p: Point) => Math.hypot(p.x - point.x, p.y - point.y) < radius
      );
    } else {
      const bounds = {
        left: obj.position.x - radius,
        right: obj.position.x + obj.size.width + radius,
        top: obj.position.y - radius,
        bottom: obj.position.y + obj.size.height + radius,
      };
      return (
        point.x >= bounds.left &&
        point.x <= bounds.right &&
        point.y >= bounds.top &&
        point.y <= bounds.bottom
      );
    }
  }

  private handleSelectionStart(screenX: number, screenY: number): void {
    const worldPoint = canvasEngine.screenToWorld(screenX, screenY);
    const state = useCanvasStore.getState();
    const zoom = state.zoom;

    // Check if clicking on rotation/resize handles of a selected shape
    if (state.selectedObjectIds.size > 0) {
      const handleRadius = 12 / zoom; // generous hit area in world units
      for (const id of state.selectedObjectIds) {
        const obj = state.objects.get(id);
        if (!obj || obj.kind !== 'shape') continue;

        // Use shape's own position/size (matches renderSelection — NOT the AABB)
        const cx = obj.position.x + obj.size.width / 2;
        const cy = obj.position.y + obj.size.height / 2;
        const pad = 4 / zoom;
        const hw = obj.size.width / 2 + pad;
        const hh = obj.size.height / 2 + pad;
        const angle = (obj.rotation * Math.PI) / 180;
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);

        // Rotation handle — above top-center of rotated box
        const handleDist = 32 / zoom;
        const rotHandleX = cx + (hh + handleDist) * sinA;
        const rotHandleY = cy - (hh + handleDist) * cosA;
        const rotDist = Math.hypot(worldPoint.x - rotHandleX, worldPoint.y - rotHandleY);
        if (rotDist < handleRadius) {
          this.isRotating = true;
          this.rotateShapeId = id;
          this.rotateStartAngle = Math.atan2(worldPoint.y - cy, worldPoint.x - cx);
          this.rotateOriginalRotation = obj.rotation;
          return;
        }

        // 4 corner resize handles at rotated positions
        const corners = [
          { x: cx + (-hw * cosA - -hh * sinA), y: cy + (-hw * sinA + -hh * cosA) },
          { x: cx + (hw * cosA - -hh * sinA), y: cy + (hw * sinA + -hh * cosA) },
          { x: cx + (-hw * cosA - hh * sinA), y: cy + (-hw * sinA + hh * cosA) },
          { x: cx + (hw * cosA - hh * sinA), y: cy + (hw * sinA + hh * cosA) },
        ];
        for (let i = 0; i < corners.length; i++) {
          const dx = worldPoint.x - corners[i].x;
          const dy = worldPoint.y - corners[i].y;
          if (Math.hypot(dx, dy) < handleRadius) {
            this.isResizing = true;
            this.resizeHandleIndex = i;
            this.resizeShapeId = id;
            this.resizeStartWorldX = worldPoint.x;
            this.resizeStartWorldY = worldPoint.y;
            this.resizeOriginalX = obj.position.x;
            this.resizeOriginalY = obj.position.y;
            this.resizeOriginalW = obj.size.width;
            this.resizeOriginalH = obj.size.height;
            return;
          }
        }
      }
    }

    // Check if clicking on a selected shape body → start moving
    if (state.selectedObjectIds.size > 0) {
      for (const id of state.selectedObjectIds) {
        const obj = state.objects.get(id);
        if (!obj) continue;
        if (this.isObjectNearPoint(obj, worldPoint, 5)) {
          this.isMoving = true;
          this.moveStartWorldX = worldPoint.x;
          this.moveStartWorldY = worldPoint.y;
          this.moveOriginalPositions = new Map();
          state.selectedObjectIds.forEach((sid) => {
            const sobj = state.objects.get(sid);
            if (sobj?.kind === 'shape') {
              this.moveOriginalPositions.set(sid, { x: sobj.position.x, y: sobj.position.y });
            }
          });
          return;
        }
      }
    }

    // Default: select objects near the point
    const selectedIds: string[] = [];
    state.objects.forEach((obj) => {
      if (this.isObjectNearPoint(obj, worldPoint, 10)) {
        selectedIds.push(obj.id);
      }
    });

    state.selectObjects(selectedIds);
    canvasEngine.requestRender();
  }

  private startShapeCreation(screenX: number, screenY: number): void {
    const state = useCanvasStore.getState();
    const worldPoint = canvasEngine.screenToWorld(screenX, screenY);
    const uiState = useUIStore.getState();
    const settings = uiState.getToolSettings('shapes');

    const shape: Shape = {
      id: crypto.randomUUID(),
      pageId: state.currentPageId || '',
      kind: 'shape',
      type: state.activeShape || 'rectangle',
      position: { x: worldPoint.x - 100, y: worldPoint.y - 100 },
      size: { width: 200, height: 200 },
      rotation: 0,
      strokeColor: settings.color,
      strokeWidth: settings.thickness,
      opacity: settings.opacity,
      createdAt: Date.now(),
    };

    state.addObject(shape);
    // Push undo for shape creation
    if (state.currentPageId) {
      const { pushUndo } = useUndoRedoStore.getState();
      pushUndo(state.currentPageId, Array.from(useCanvasStore.getState().objects.values()));
    }
    canvasEngine.requestRender();
    this.autosave();
  }

  private handleDoubleTap(): void {
    this.undo();
  }

  private handleLongPress(_screenX: number, _screenY: number): void {
    useUIStore.getState().openSettingsPanel();
    canvasEngine.requestRender();
  }

  private undo(): void {
    const state = useCanvasStore.getState();
    if (!state.currentPageId) return;

    const { undo } = useUndoRedoStore.getState();
    const restoredObjects = undo(state.currentPageId);
    if (restoredObjects) {
      state.clearObjects();
      state.addObjects(restoredObjects);
      canvasEngine.requestRender();
      this.autosave();
      useUIStore.getState().addToast('Undo', 'info');
    }
  }

  private redo(): void {
    const state = useCanvasStore.getState();
    if (!state.currentPageId) return;

    const { redo } = useUndoRedoStore.getState();
    const restoredObjects = redo(state.currentPageId);
    if (restoredObjects) {
      state.clearObjects();
      state.addObjects(restoredObjects);
      canvasEngine.requestRender();
      this.autosave();
      useUIStore.getState().addToast('Redo', 'info');
    }
  }

  private cancelDrawing(): void {
    if (this.isDrawing) {
      useCanvasStore.getState().endStroke();
      this.isDrawing = false;
    }
  }

  private cancelLongPress(): void {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  private autosave(): void {
    window.dispatchEvent(new CustomEvent('infinity-board:autosave'));
  }
}

export const gestureHandler = new GestureHandler();
