// Basic tests for canvas store
// TODO: Need to add more comprehensive tests

import { describe, it, expect, beforeEach } from 'vitest';
import { useCanvasStore } from '../state/canvasStore';

describe('CanvasStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useCanvasStore.setState({
      objects: new Map(),
      selectedObjectIds: new Set(),
      viewportX: 0,
      viewportY: 0,
      zoom: 1,
    });
  });

  it('should have initial state', () => {
    const state = useCanvasStore.getState();
    expect(state.viewportX).toBe(0);
    expect(state.viewportY).toBe(0);
    expect(state.zoom).toBe(1);
  });

  it('should set viewport', () => {
    useCanvasStore.getState().setViewport(100, 200);
    const state = useCanvasStore.getState();
    expect(state.viewportX).toBe(100);
    expect(state.viewportY).toBe(200);
  });

  it('should set zoom within bounds', () => {
    useCanvasStore.getState().setZoom(5);
    expect(useCanvasStore.getState().zoom).toBe(5);
    
    // Test min bound
    useCanvasStore.getState().setZoom(0.01);
    expect(useCanvasStore.getState().zoom).toBe(0.05);
    
    // Test max bound
    useCanvasStore.getState().setZoom(15);
    expect(useCanvasStore.getState().zoom).toBe(10);
  });

  it('should add object', () => {
    const stroke = {
      id: 'test-1',
      pageId: 'page-1',
      kind: 'stroke' as const,
      tool: 'pen' as const,
      points: [{ x: 0, y: 0, pressure: 0.5, t: Date.now() }],
      color: '#000000',
      width: 2,
      opacity: 1,
      smoothing: 0.5,
      createdAt: Date.now(),
    };
    
    useCanvasStore.getState().addObject(stroke);
    expect(useCanvasStore.getState().objects.size).toBe(1);
  });

  it('should clear objects', () => {
    useCanvasStore.getState().clearObjects();
    expect(useCanvasStore.getState().objects.size).toBe(0);
  });
});
