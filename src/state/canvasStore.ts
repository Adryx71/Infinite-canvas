import { create } from 'zustand';
import type { CanvasObject, Stroke, ToolType, ShapeType, Point, BackgroundType } from '../types';

interface CanvasState {
  // Current page
  currentPageId: string | null;
  currentNotebookId: string | null;
  
  // Camera
  viewportX: number;
  viewportY: number;
  zoom: number;
  
  // Tools
  activeTool: ToolType;
  activeShape: ShapeType | null;
  
  // Canvas objects
  objects: Map<string, CanvasObject>;
  
  // Current stroke being drawn
  isDrawing: boolean;
  currentStroke: Stroke | null;
  
  // Selection
  selectedObjectIds: Set<string>;
  
  // Background
  background: BackgroundType;
  
  // Actions
  setCurrentPage: (pageId: string, notebookId: string) => void;
  setViewport: (x: number, y: number) => void;
  setZoom: (zoom: number) => void;
  pan: (dx: number, dy: number) => void;
  zoomAt: (point: { x: number; y: number }, delta: number) => void;
  setActiveTool: (tool: ToolType) => void;
  setActiveShape: (shape: ShapeType | null) => void;
  startStroke: (stroke: Stroke) => void;
  addPointToStroke: (point: Point) => void;
  endStroke: () => Stroke | null;
  addObject: (object: CanvasObject) => void;
  addObjects: (objects: CanvasObject[]) => void;
  removeObject: (id: string) => void;
  removeObjects: (ids: string[]) => void;
  updateObject: (id: string, changes: Partial<CanvasObject>) => void;
  clearObjects: () => void;
  selectObjects: (ids: string[]) => void;
  deselectAll: () => void;
  setBackground: (bg: BackgroundType) => void;
  loadPage: (pageId: string, notebookId: string, objects: CanvasObject[], background: BackgroundType, viewport: { x: number; y: number }, zoom: number) => void;
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  currentPageId: null,
  currentNotebookId: null,
  viewportX: 0,
  viewportY: 0,
  zoom: 1,
  activeTool: 'pen',
  activeShape: null,
  objects: new Map(),
  isDrawing: false,
  currentStroke: null,
  selectedObjectIds: new Set(),
  background: 'white',
  
  setCurrentPage: (pageId, notebookId) => set({ currentPageId: pageId, currentNotebookId: notebookId }),
  
  setViewport: (x, y) => set({ viewportX: x, viewportY: y }),
  
  setZoom: (zoom) => {
    const clampedZoom = Math.max(0.05, Math.min(10, zoom));
    set({ zoom: clampedZoom });
  },
  
  pan: (dx, dy) => {
    const state = get();
    set({ viewportX: state.viewportX + dx, viewportY: state.viewportY + dy });
  },
  
  zoomAt: (screenPoint, delta) => {
    const state = get();
    const newZoom = Math.max(0.05, Math.min(10, state.zoom * (1 + delta)));
    // Convert screen point to world coordinates BEFORE zoom
    const worldX = screenPoint.x / state.zoom + state.viewportX;
    const worldY = screenPoint.y / state.zoom + state.viewportY;
    // After zoom, keep the same world point under the cursor:
    // screenPoint = (worldX - newViewportX) * newZoom
    // newViewportX = worldX - screenPoint / newZoom
    const newViewportX = worldX - screenPoint.x / newZoom;
    const newViewportY = worldY - screenPoint.y / newZoom;
    set({ zoom: newZoom, viewportX: newViewportX, viewportY: newViewportY });
  },
  
  setActiveTool: (tool) => set({ activeTool: tool }),
  
  setActiveShape: (shape) => set({ activeShape: shape }),
  
  startStroke: (stroke) => set({ isDrawing: true, currentStroke: stroke }),
  
  addPointToStroke: (point) => {
    const state = get();
    if (state.currentStroke) {
      const updatedStroke = {
        ...state.currentStroke,
        points: [...state.currentStroke.points, point],
      };
      set({ currentStroke: updatedStroke });
    }
  },
  
  endStroke: () => {
    const state = get();
    if (state.currentStroke && state.currentStroke.points.length > 1) {
      const objects = new Map(state.objects);
      objects.set(state.currentStroke.id, state.currentStroke);
      set({ isDrawing: false, currentStroke: null, objects });
      return state.currentStroke;
    }
    set({ isDrawing: false, currentStroke: null });
    return null;
  },
  
  addObject: (object) => {
    const objects = new Map(get().objects);
    objects.set(object.id, object);
    set({ objects });
  },
  
  addObjects: (newObjects) => {
    const objects = new Map(get().objects);
    newObjects.forEach(obj => objects.set(obj.id, obj));
    set({ objects });
  },
  
  removeObject: (id) => {
    const objects = new Map(get().objects);
    objects.delete(id);
    set({ objects });
  },
  
  removeObjects: (ids) => {
    const objects = new Map(get().objects);
    ids.forEach(id => objects.delete(id));
    set({ objects });
  },
  
  updateObject: (id, changes) => {
    const objects = new Map(get().objects);
    const existing = objects.get(id);
    if (existing) {
      objects.set(id, { ...existing, ...changes } as CanvasObject);
      set({ objects });
    }
  },
  
  clearObjects: () => set({ objects: new Map() }),
  
  selectObjects: (ids) => set({ selectedObjectIds: new Set(ids) }),
  
  deselectAll: () => set({ selectedObjectIds: new Set() }),
  
  setBackground: (bg) => set({ background: bg }),
  
  loadPage: (pageId, notebookId, objects, background, viewport, zoom) => {
    const objectsMap = new Map<string, CanvasObject>();
    objects.forEach(obj => objectsMap.set(obj.id, obj));
    set({
      currentPageId: pageId,
      currentNotebookId: notebookId,
      objects: objectsMap,
      background,
      viewportX: viewport.x,
      viewportY: viewport.y,
      zoom,
      selectedObjectIds: new Set(),
      isDrawing: false,
      currentStroke: null,
    });
  },
}));
