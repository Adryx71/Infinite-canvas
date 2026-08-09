// Core data types for Infinity Board

export type ToolType = 'pencil' | 'pen' | 'marker' | 'highlighter' | 'eraser' | 'shapes' | 'selection';
export type ShapeType = 'rectangle' | 'circle' | 'triangle' | 'diamond' | 'star' | 'polygon' | 'arrow' | 'line' | 'curve';
export type BackgroundType = 'amoled' | 'white' | 'paper' | 'graph';
export type ThemeType = 'light' | 'dark';
export type PointerType = 'touch' | 'pen' | 'mouse';

export interface Point {
  x: number;
  y: number;
  pressure: number;
  t: number;
}

export interface Stroke {
  id: string;
  pageId: string;
  kind: 'stroke';
  tool: 'pencil' | 'pen' | 'marker' | 'highlighter';
  points: Point[];
  color: string;
  width: number;
  opacity: number;
  smoothing: number;
  createdAt: number;
  /** If true, this stroke was drawn by the eraser — matches background color */
  isEraserStroke?: boolean;
}

export interface Shape {
  id: string;
  pageId: string;
  kind: 'shape';
  type: ShapeType;
  position: { x: number; y: number };
  size: { width: number; height: number };
  rotation: number;
  sides?: number;
  points?: { x: number; y: number }[];
  strokeColor: string;
  fillColor?: string;
  strokeWidth: number;
  opacity: number;
  createdAt: number;
}

export type CanvasObject = Stroke | Shape;

export interface Page {
  id: string;
  notebookId: string;
  order: number;
  background: BackgroundType;
  viewport: { x: number; y: number };
  zoom: number;
  createdAt: number;
  updatedAt: number;
}

export interface Notebook {
  id: string;
  schemaVersion: number;
  pageOrder: string[];
  createdAt: number;
  updatedAt: number;
}

export interface ToolSettings {
  thickness: number;
  opacity: number;
  smoothing: number;
  color: string;
}

export interface AppState {
  theme: ThemeType;
  toolSettings: Record<string, ToolSettings>;
  recentColors: string[];
  smartShapeRecognition: boolean;
  highContrast: boolean;
}

export interface VersionSnapshot {
  id: string;
  pageId: string;
  pageState: {
    background: BackgroundType;
    viewport: { x: number; y: number };
    zoom: number;
    objects: CanvasObject[];
  };
  createdAt: number;
}
