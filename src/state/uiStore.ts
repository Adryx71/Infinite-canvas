import { create } from 'zustand';
import type { ThemeType, ToolSettings } from '../types';
import { TOOLS } from '../config';

interface UIState {
  // Theme
  theme: ThemeType;
  
  // Panels
  isPagesPanelOpen: boolean;
  isSettingsPanelOpen: boolean;
  isVersionHistoryOpen: boolean;
  
  // Toolbar
  isToolbarExpanded: boolean;
  toolbarOpacity: number;
  
  // Tool settings
  toolSettings: Record<string, ToolSettings>;
  recentColors: string[];
  
  // Features
  smartShapeRecognition: boolean;
  highContrast: boolean;
  
  // Toast
  toasts: Array<{ id: string; message: string; type: 'info' | 'success' | 'error' | 'undo'; action?: () => void }>;
  
  // Actions
  setTheme: (theme: ThemeType) => void;
  toggleTheme: () => void;
  openPagesPanel: () => void;
  closePagesPanel: () => void;
  openSettingsPanel: () => void;
  closeSettingsPanel: () => void;
  openVersionHistory: () => void;
  closeVersionHistory: () => void;
  setToolbarExpanded: (expanded: boolean) => void;
  setToolbarOpacity: (opacity: number) => void;
  updateToolSettings: (tool: string, settings: Partial<ToolSettings>) => void;
  getToolSettings: (tool: string) => ToolSettings;
  addRecentColor: (color: string) => void;
  setSmartShapeRecognition: (enabled: boolean) => void;
  setHighContrast: (enabled: boolean) => void;
  addToast: (message: string, type?: 'info' | 'success' | 'error' | 'undo', action?: () => void) => void;
  removeToast: (id: string) => void;
  loadSettings: (settings: Partial<UIState>) => void;
}

const defaultToolSettings: Record<string, ToolSettings> = {
  pencil: { ...TOOLS.PENCIL_DEFAULT, color: TOOLS.DEFAULT_COLORS.pencil },
  pen: { ...TOOLS.PEN_DEFAULT, color: TOOLS.DEFAULT_COLORS.pen },
  marker: { ...TOOLS.MARKER_DEFAULT, color: TOOLS.DEFAULT_COLORS.marker },
  highlighter: { ...TOOLS.HIGHLIGHTER_DEFAULT, color: TOOLS.DEFAULT_COLORS.highlighter },
  eraser: { thickness: TOOLS.ERASER_PRESETS.medium, opacity: 1, smoothing: 0, color: '#000000' },
  shapes: { thickness: 2, opacity: 1, smoothing: 0, color: window.matchMedia('(prefers-color-scheme: dark)').matches ? '#FFFFFF' : '#000000' },
  selection: { thickness: 2, opacity: 1, smoothing: 0, color: '#3B82F6' },
};

export const useUIStore = create<UIState>((set, get) => ({
  theme: (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') as ThemeType,
  isPagesPanelOpen: false,
  isSettingsPanelOpen: false,
  isVersionHistoryOpen: false,
  isToolbarExpanded: true,
  toolbarOpacity: 1,
  toolSettings: defaultToolSettings,
  recentColors: ['#000000', '#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6366F1'],
  smartShapeRecognition: false,
  highContrast: false,
  toasts: [],
  
  setTheme: (theme) => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    set({ theme });
  },
  
  toggleTheme: () => {
    const newTheme = get().theme === 'dark' ? 'light' : 'dark';
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    set({ theme: newTheme });
  },
  
  openPagesPanel: () => set({ isPagesPanelOpen: true }),
  closePagesPanel: () => set({ isPagesPanelOpen: false }),
  openSettingsPanel: () => set({ isSettingsPanelOpen: true }),
  closeSettingsPanel: () => set({ isSettingsPanelOpen: false }),
  openVersionHistory: () => set({ isVersionHistoryOpen: true }),
  closeVersionHistory: () => set({ isVersionHistoryOpen: false }),
  
  setToolbarExpanded: (expanded) => set({ isToolbarExpanded: expanded }),
  setToolbarOpacity: (opacity) => set({ toolbarOpacity: opacity }),
  
  updateToolSettings: (tool, settings) => {
    const current = get().toolSettings[tool] || defaultToolSettings[tool];
    set({
      toolSettings: {
        ...get().toolSettings,
        [tool]: { ...current, ...settings },
      },
    });
  },
  
  getToolSettings: (tool) => {
    return get().toolSettings[tool] || defaultToolSettings[tool];
  },
  
  addRecentColor: (color) => {
    const current = get().recentColors.filter(c => c !== color);
    set({ recentColors: [color, ...current].slice(0, 10) });
  },
  
  setSmartShapeRecognition: (enabled) => set({ smartShapeRecognition: enabled }),
  setHighContrast: (enabled) => set({ highContrast: enabled }),
  
  addToast: (message, type = 'info', action) => {
    const id = crypto.randomUUID();
    set({ toasts: [...get().toasts, { id, message, type, action }] });
    setTimeout(() => {
      set({ toasts: get().toasts.filter(t => t.id !== id) });
    }, 5000);
  },
  
  removeToast: (id) => set({ toasts: get().toasts.filter(t => t.id !== id) }),
  
  loadSettings: (settings) => set(settings),
}));
