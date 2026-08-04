import { create } from 'zustand';
import type { CanvasObject } from '../types';

interface HistoryEntry {
  objects: CanvasObject[];
}

interface UndoRedoState {
  // Per-page undo/redo stacks
  undoStacks: Map<string, HistoryEntry[]>;
  redoStacks: Map<string, HistoryEntry[]>;
  
  // Actions
  pushUndo: (pageId: string, objects: CanvasObject[]) => void;
  undo: (pageId: string) => CanvasObject[] | null;
  redo: (pageId: string) => CanvasObject[] | null;
  canUndo: (pageId: string) => boolean;
  canRedo: (pageId: string) => boolean;
  clearPageHistory: (pageId: string) => void;
  getUndoStack: (pageId: string) => HistoryEntry[];
}

const MAX_UNDO_DEPTH = 100;

export const useUndoRedoStore = create<UndoRedoState>((set, get) => ({
  undoStacks: new Map(),
  redoStacks: new Map(),
  
  pushUndo: (pageId, objects) => {
    const state = get();
    const stack = state.undoStacks.get(pageId) || [];
    
    // Deduplicate: skip push if objects are identical to last entry
    if (stack.length > 0) {
      const lastEntry = stack[stack.length - 1];
      if (lastEntry.objects.length === objects.length) {
        const allMatch = lastEntry.objects.every((obj, i) => obj.id === objects[i].id);
        if (allMatch) return;
      }
    }
    
    // Lightweight snapshot: only store IDs and minimal diff data
    const snapshot: HistoryEntry = {
      objects: objects.map(obj => ({ ...obj } as CanvasObject)),
    };
    
    const newStack = [...stack, snapshot];
    if (newStack.length > MAX_UNDO_DEPTH) {
      newStack.splice(0, newStack.length - MAX_UNDO_DEPTH);
    }
    
    const undoStacks = new Map(state.undoStacks);
    undoStacks.set(pageId, newStack);
    
    // Clear redo stack on new action
    const redoStacks = new Map(state.redoStacks);
    redoStacks.set(pageId, []);
    
    set({ undoStacks, redoStacks });
  },
  
  undo: (pageId) => {
    const state = get();
    const undoStack = state.undoStacks.get(pageId) || [];
    if (undoStack.length === 0) return null;
    
    const newUndoStack = [...undoStack];
    const entry = newUndoStack.pop()!;
    
    const undoStacks = new Map(state.undoStacks);
    undoStacks.set(pageId, newUndoStack);
    
    const redoStack = state.redoStacks.get(pageId) || [];
    const redoStacks = new Map(state.redoStacks);
    redoStacks.set(pageId, [...redoStack, entry]);
    
    set({ undoStacks, redoStacks });
    return entry.objects;
  },
  
  redo: (pageId) => {
    const state = get();
    const redoStack = state.redoStacks.get(pageId) || [];
    if (redoStack.length === 0) return null;
    
    const newRedoStack = [...redoStack];
    const entry = newRedoStack.pop()!;
    
    const redoStacks = new Map(state.redoStacks);
    redoStacks.set(pageId, newRedoStack);
    
    const undoStack = state.undoStacks.get(pageId) || [];
    const undoStacks = new Map(state.undoStacks);
    undoStacks.set(pageId, [...undoStack, entry]);
    
    set({ undoStacks, redoStacks });
    return entry.objects;
  },
  
  canUndo: (pageId) => {
    const stack = get().undoStacks.get(pageId) || [];
    return stack.length > 0;
  },
  
  canRedo: (pageId) => {
    const stack = get().redoStacks.get(pageId) || [];
    return stack.length > 0;
  },
  
  clearPageHistory: (pageId) => {
    const state = get();
    const undoStacks = new Map(state.undoStacks);
    undoStacks.delete(pageId);
    const redoStacks = new Map(state.redoStacks);
    redoStacks.delete(pageId);
    set({ undoStacks, redoStacks });
  },
  
  getUndoStack: (pageId) => {
    return get().undoStacks.get(pageId) || [];
  },
}));
