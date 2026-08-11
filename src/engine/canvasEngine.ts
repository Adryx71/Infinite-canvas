import { Application, Container, Graphics } from 'pixi.js';
import type { CanvasObject, Stroke } from '../types';
import { CANVAS, BACKGROUND_COLORS, BACKGROUND_COLORS_DARK } from '../config';
import { useCanvasStore } from '../state/canvasStore';
import { useUIStore } from '../state/uiStore';

export class CanvasEngine {
  private app: Application | null = null;
  private container: Container = new Container();
  private backgroundGraphics: Graphics = new Graphics();
  private gridGraphics: Graphics = new Graphics();
  private objectsContainer: Container = new Container();
  private currentStrokeGraphics: Graphics = new Graphics();
  private renderObjects: Map<string, Graphics> = new Map();
  private animationFrame: number | null = null;
  private needsRender = true;
  private initialized = false;
  
  // Grid caching
  private gridDirty = true;
  private lastGridBg: string = '';
  private lastGridZoom = 0;
  private lastGridVx = 0;
  private lastGridVy = 0;
  private lastGridW = 0;
  private lastGridH = 0;

  async init(container: HTMLElement): Promise<void> {
    this.app = new Application();
    await this.app.init({
      resizeTo: container,
      backgroundColor: 0xffffff,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, CANVAS.HIGH_DPI_CAP),
      autoDensity: true,
    });

    container.appendChild(this.app.canvas as HTMLCanvasElement);
    
    this.container.addChild(this.backgroundGraphics);
    this.container.addChild(this.gridGraphics);
    this.container.addChild(this.objectsContainer);
    this.container.addChild(this.currentStrokeGraphics);
    
    this.app.stage.addChild(this.container);
    this.initialized = true;
    this.startRenderLoop();
  }

  destroy(): void {
    this.initialized = false;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    if (this.app) {
      this.app.destroy(true);
      this.app = null;
    }
  }

  private startRenderLoop(): void {
    // Subscribe to specific Zustand store slices to avoid over-broad re-renders
    useCanvasStore.subscribe((state, prevState) => {
      if (
        state.objects !== prevState.objects ||
        state.viewportX !== prevState.viewportX ||
        state.viewportY !== prevState.viewportY ||
        state.zoom !== prevState.zoom ||
        state.background !== prevState.background ||
        state.currentStroke !== prevState.currentStroke
      ) {
        this.needsRender = true;
      }
    });
    
    // Only re-render on theme changes from UIStore
    useUIStore.subscribe((state, prevState) => {
      if (state.theme !== prevState.theme) {
        this.needsRender = true;
        this.gridDirty = true;
      }
    });
    
    const render = () => {
      this.animationFrame = requestAnimationFrame(render);
      
      if (this.needsRender) {
        this.render();
        this.needsRender = false;
      }
    };
    render();
  }

  private render(): void {
    if (!this.app) return;

    const state = useCanvasStore.getState();
    const { viewportX, viewportY, zoom, objects, currentStroke, background } = state;
    const uiState = useUIStore.getState();
    const { theme } = uiState;

    const w = this.app.screen.width;
    const h = this.app.screen.height;

    // Update background — draw at viewport position in world space so it always covers the full screen
    const bgColor = theme === 'dark' ? BACKGROUND_COLORS_DARK[background] : BACKGROUND_COLORS[background];
    this.backgroundGraphics.clear();
    this.backgroundGraphics.rect(viewportX, viewportY, w / zoom, h / zoom);
    this.backgroundGraphics.fill(bgColor);

    // Draw grid for graph background (with caching)
    if (background === 'graph') {
      const gridChanged = this.gridDirty || 
        this.lastGridBg !== background ||
        Math.abs(this.lastGridZoom - zoom) > 0.01 ||
        Math.abs(this.lastGridVx - viewportX) > 1 ||
        Math.abs(this.lastGridVy - viewportY) > 1 ||
        this.lastGridW !== w ||
        this.lastGridH !== h;
      
      if (gridChanged) {
        this.drawGrid(w, h, viewportX, viewportY, zoom, theme);
        this.lastGridBg = background;
        this.lastGridZoom = zoom;
        this.lastGridVx = viewportX;
        this.lastGridVy = viewportY;
        this.lastGridW = w;
        this.lastGridH = h;
        this.gridDirty = false;
      }
    } else {
      this.gridGraphics.clear();
    }

    // Update container transform
    this.container.x = -viewportX * zoom;
    this.container.y = -viewportY * zoom;
    this.container.scale.set(zoom);

    // Render objects
    this.renderCanvasObjects(objects, viewportX, viewportY, zoom, w, h);

    // Render current stroke
    this.currentStrokeGraphics.clear();
    this.currentStrokeGraphics.blendMode = 'normal' as any;
    if (currentStroke) {
      this.renderStroke(this.currentStrokeGraphics, currentStroke, 1);
    }


  }

  private drawGrid(w: number, h: number, vx: number, vy: number, zoom: number, theme: string): void {
    const gridSize = CANVAS.WORLD_UNITS_PER_GRID_LINE;
    const scaledGrid = gridSize * zoom;
    
    if (scaledGrid < 5) {
      this.gridGraphics.clear();
      return;
    }

    const startX = Math.floor(vx / gridSize) * gridSize;
    const startY = Math.floor(vy / gridSize) * gridSize;
    const endX = vx + w / zoom + gridSize;
    const endY = vy + h / zoom + gridSize;

    const lineColor = theme === 'dark' ? 0x333333 : 0xe0e0e0;
    
    this.gridGraphics.clear();
    
    // Draw vertical lines
    this.gridGraphics.setStrokeStyle({ width: 1 / zoom, color: lineColor });
    this.gridGraphics.moveTo(startX, 0);
    for (let x = startX; x <= endX; x += gridSize) {
      this.gridGraphics.lineTo(x, h);
      if (x + gridSize <= endX) {
        this.gridGraphics.moveTo(x + gridSize, 0);
      }
    }
    
    // Draw horizontal lines
    this.gridGraphics.moveTo(0, startY);
    for (let y = startY; y <= endY; y += gridSize) {
      this.gridGraphics.lineTo(w, y);
      if (y + gridSize <= endY) {
        this.gridGraphics.moveTo(0, y + gridSize);
      }
    }
    
    this.gridGraphics.stroke();
  }

  private renderCanvasObjects(
    objects: Map<string, CanvasObject>,
    vx: number,
    vy: number,
    zoom: number,
    screenW: number,
    screenH: number
  ): void {
    const padding = Math.max(screenW, screenH) * CANVAS.CULLING_PADDING;
    const viewLeft = vx - padding / zoom;
    const viewTop = vy - padding / zoom;
    const viewRight = vx + screenW / zoom + padding / zoom;
    const viewBottom = vy + screenH / zoom + padding / zoom;

    const visibleIds = new Set<string>();

    objects.forEach((obj) => {
      if (this.isObjectInBounds(obj, viewLeft, viewTop, viewRight, viewBottom)) {
        visibleIds.add(obj.id);
      }
    });

    // Remove off-screen OR deleted objects from render cache
    this.renderObjects.forEach((graphics, id) => {
      if (!visibleIds.has(id) || !objects.has(id)) {
        this.objectsContainer.removeChild(graphics);
        graphics.destroy();
        this.renderObjects.delete(id);
      }
    });

    // Render visible objects in chronological creation order.
    // This ensures eraser strokes only cover strokes that existed BEFORE them,
    // while new strokes drawn AFTER the eraser remain visible on top.
    const sortedIds = [...visibleIds].sort((a, b) => {
      const objA = objects.get(a);
      const objB = objects.get(b);
      const timeA = objA?.createdAt ?? 0;
      const timeB = objB?.createdAt ?? 0;
      return timeA - timeB;
    });

    sortedIds.forEach((id) => {
      const obj = objects.get(id);
      if (!obj) return;

      let graphics = this.renderObjects.get(id);
      if (!graphics) {
        graphics = new Graphics();
        this.objectsContainer.addChild(graphics);
        this.renderObjects.set(id, graphics);
      } else {
        graphics.clear();
        // Reset transform from previous render to avoid stale state
        graphics.position.set(0, 0);
        graphics.pivot.set(0, 0);
        graphics.rotation = 0;
        graphics.scale.set(1, 1);
        graphics.blendMode = 'normal' as any;
      }

      if (obj.kind === 'stroke') {
        this.renderStroke(graphics, obj, 1);
      } else {
        this.renderShape(graphics, obj);
      }
    });
  }

  private isObjectInBounds(obj: CanvasObject, left: number, top: number, right: number, bottom: number): boolean {
    if (obj.kind === 'stroke') {
      if (obj.points.length === 0) return false;
      // Check ALL points to handle curved strokes that loop back
      for (const point of obj.points) {
        if (point.x >= left && point.x <= right && point.y >= top && point.y <= bottom) {
          return true;
        }
      }
      return false;
    } else {
      return (
        obj.position.x + obj.size.width >= left &&
        obj.position.x <= right &&
        obj.position.y + obj.size.height >= top &&
        obj.position.y <= bottom
      );
    }
  }

  private renderStroke(graphics: Graphics, stroke: Stroke, alpha: number): void {
    // Reset blend mode from any previous render on this Graphics object
    graphics.blendMode = 'normal' as any;

    if (stroke.points.length < 2) return;

    const color = this.hexToNumber(stroke.color);

    // PixiJS v8 uses string values for cap and join
    graphics.setStrokeStyle({
      width: stroke.width,
      color,
      alpha: stroke.opacity * alpha,
      cap: 'round' as any,
      join: 'round' as any,
    });

    // Highlighter uses multiply blend mode per PRD §10
    if (stroke.tool === 'highlighter') {
      graphics.blendMode = 'multiply' as any;
    }

    graphics.moveTo(stroke.points[0].x, stroke.points[0].y);
    
    for (let i = 1; i < stroke.points.length; i++) {
      const point = stroke.points[i];
      const prevPoint = stroke.points[i - 1];
      
      const midX = (prevPoint.x + point.x) / 2;
      const midY = (prevPoint.y + point.y) / 2;
      
      graphics.quadraticCurveTo(prevPoint.x, prevPoint.y, midX, midY);
    }
    
    graphics.stroke();
  }

  private renderShape(graphics: Graphics, shape: CanvasObject & { kind: 'shape' }): void {
    const color = this.hexToNumber(shape.strokeColor);
    const fillColor = shape.fillColor ? this.hexToNumber(shape.fillColor) : undefined;

    graphics.setStrokeStyle({
      width: shape.strokeWidth,
      color,
      alpha: shape.opacity,
    });

    const w = shape.size.width;
    const h = shape.size.height;
    const hw = w / 2;
    const hh = h / 2;

    // Position graphics at world-space center of shape
    graphics.position.set(shape.position.x + hw, shape.position.y + hh);
    graphics.rotation = (shape.rotation * Math.PI) / 180;

    // Draw shape centered at local origin (0,0) — rotation and position handle placement
    switch (shape.type) {
      case 'rectangle':
        graphics.rect(-hw, -hh, w, h);
        break;
      case 'circle':
        graphics.circle(0, 0, Math.min(hw, hh));
        break;
      case 'triangle':
        graphics.poly([0, -hh, hw, hh, -hw, hh]);
        break;
      case 'diamond':
        graphics.poly([0, -hh, hw, 0, 0, hh, -hw, 0]);
        break;
      case 'star': {
        const numPoints = shape.sides || 5;
        const outerR = Math.min(hw, hh);
        const innerR = outerR * 0.4;
        const starPts: number[] = [];
        for (let i = 0; i < numPoints * 2; i++) {
          const r = i % 2 === 0 ? outerR : innerR;
          const angle = (i * Math.PI) / numPoints - Math.PI / 2;
          starPts.push(Math.cos(angle) * r, Math.sin(angle) * r);
        }
        graphics.poly(starPts);
        break;
      }
      case 'polygon': {
        const sides = shape.sides || 6;
        const polyPts: number[] = [];
        const radius = Math.min(hw, hh);
        for (let i = 0; i < sides; i++) {
          const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
          polyPts.push(Math.cos(angle) * radius, Math.sin(angle) * radius);
        }
        graphics.poly(polyPts);
        break;
      }
      case 'line':
        graphics.moveTo(-hw, 0);
        graphics.lineTo(hw, 0);
        break;
      case 'arrow': {
        graphics.moveTo(-hw, 0);
        graphics.lineTo(hw, 0);
        // Scale arrow head proportionally to shape size
        const headLen = Math.min(10, hw * 0.3);
        const headWidth = Math.min(5, hh * 0.3);
        graphics.moveTo(hw, 0);
        graphics.lineTo(hw - headLen, -headWidth);
        graphics.moveTo(hw, 0);
        graphics.lineTo(hw - headLen, headWidth);
        break;
      }
      case 'curve':
        graphics.moveTo(-hw, 0);
        graphics.bezierCurveTo(-hw / 2, -hh, hw / 2, hh, hw, 0);
        break;
    }

    if (fillColor !== undefined) {
      graphics.fill({ color: fillColor, alpha: shape.opacity * 0.3 });
    }
    graphics.stroke();
  }



  private hexToNumber(hex: string): number {
    // Handle rgba
    const rgbaMatch = hex.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (rgbaMatch) {
      return (parseInt(rgbaMatch[1]) << 16) + (parseInt(rgbaMatch[2]) << 8) + parseInt(rgbaMatch[3]);
    }
    
    // Handle hex
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
      return (parseInt(result[1], 16) << 16) + (parseInt(result[2], 16) << 8) + parseInt(result[3], 16);
    }
    
    // Handle short hex (3 chars)
    const shortResult = /^#?([a-f\d])([a-f\d])([a-f\d])$/i.exec(hex);
    if (shortResult) {
      return (
        (parseInt(shortResult[1] + shortResult[1], 16) << 16) +
        (parseInt(shortResult[2] + shortResult[2], 16) << 8) +
        parseInt(shortResult[3] + shortResult[3], 16)
      );
    }
    
    return 0x000000;
  }

  requestRender(): void {
    this.needsRender = true;
  }

  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    const state = useCanvasStore.getState();
    return {
      x: screenX / state.zoom + state.viewportX,
      y: screenY / state.zoom + state.viewportY,
    };
  }

  worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    const state = useCanvasStore.getState();
    return {
      x: (worldX - state.viewportX) * state.zoom,
      y: (worldY - state.viewportY) * state.zoom,
    };
  }

  getViewport(): { x: number; y: number; width: number; height: number } {
    if (!this.initialized || !this.app) return { x: 0, y: 0, width: 0, height: 0 };
    const state = useCanvasStore.getState();
    return {
      x: state.viewportX,
      y: state.viewportY,
      width: this.app.screen.width / state.zoom,
      height: this.app.screen.height / state.zoom,
    };
  }
}

export const canvasEngine = new CanvasEngine();