// Configuration constants for Infinity Board

export const CANVAS = {
  MIN_ZOOM: 0.05,
  MAX_ZOOM: 10.0,
  DEFAULT_ZOOM: 1.0,
  CULLING_PADDING: 0.2,
  HIGH_DPI_CAP: 3,
  WORLD_UNITS_PER_GRID_LINE: 20,
} as const;

export const GESTURE = {
  LONG_PRESS_DURATION: 500,
  LONG_PRESS_MAX_MOVEMENT: 10,
  DOUBLE_TAP_INTERVAL: 300,
  DOUBLE_TAP_MAX_DURATION: 200,
  DOUBLE_TAP_MAX_MOVEMENT: 30,
  THREE_FINGER_TAP_MAX_DURATION: 200,
  THREE_FINGER_TAP_MAX_MOVEMENT: 15,
  THREE_FINGER_SWIPE_MIN_DISTANCE: 80,
  THREE_FINGER_SWIPE_MAX_DURATION: 400,
  PALM_REJECTION_RADIUS_MM: 14,
} as const;

export const UI = {
  TOOLBAR_BUTTON_SIZE: 44,
  TOOLBAR_GAP: 6,
  TOOLBAR_BORDER_RADIUS: 24,
  PANEL_TRANSITION_MS: 200,
  TOAST_DURATION_MS: 5000,
  SAFE_AREA_MARGIN: 12,
} as const;

export const TOOLS = {
  PENCIL_DEFAULT: { thickness: 3, opacity: 0.9, smoothing: 30 },
  PEN_DEFAULT: { thickness: 2, opacity: 1.0, smoothing: 20 },
  MARKER_DEFAULT: { thickness: 20, opacity: 0.95, smoothing: 15 },
  HIGHLIGHTER_DEFAULT: { thickness: 24, opacity: 0.35, smoothing: 10 },
  ERASER_PRESETS: { small: 8, medium: 20, large: 40 },
  DEFAULT_COLORS: {
    pencil: '#2D2D2D',
    pen: '#000000',
    marker: '#E74C3C',
    highlighter: '#F1C40F',
  },
} as const;

export const SHAPES = {
  DEFAULT_SIZE: 200,
  MIN_POLYGON_SIDES: 3,
  MAX_POLYGON_SIDES: 12,
  DEFAULT_STAR_POINTS: 5,
  SMART_RECOGNITION_THRESHOLD: 0.7,
} as const;

export const STORAGE = {
  AUTOSAVE_DEBOUNCE_MS: 1000,
  VERSION_INTERVAL_MS: 5 * 60 * 1000,
  MAX_VERSIONS: 50,
  STORAGE_WARNING_THRESHOLD: 0.9,
  RECENT_COLORS_MAX: 10,
  UNDO_SOFT_CAP: 5000,
} as const;

export const BACKGROUND_COLORS: Record<string, string> = {
  amoled: '#000000',
  white: '#FFFFFF',
  paper: '#F5F0E8',
  graph: '#F0F4F8',
};

export const BACKGROUND_COLORS_DARK: Record<string, string> = {
  amoled: '#000000',
  white: '#000000',
  paper: '#2a2520',
  graph: '#1a2030',
};

export const THEME_COLORS = {
  light: {
    bg: '#FFFFFF',
    text: '#1a1a1a',
    textSecondary: '#666666',
    toolbarBg: 'rgba(255, 255, 255, 0.85)',
    toolbarBorder: 'rgba(0, 0, 0, 0.08)',
    panelBg: 'rgba(255, 255, 255, 0.95)',
    hover: 'rgba(0, 0, 0, 0.06)',
    active: 'rgba(59, 130, 246, 0.15)',
    selection: '#3B82F6',
    danger: '#EF4444',
    shadow: 'rgba(0, 0, 0, 0.08)',
  },
  dark: {
    bg: '#1a1a1a',
    text: '#f5f5f5',
    textSecondary: '#a0a0a0',
    toolbarBg: 'rgba(30, 30, 30, 0.85)',
    toolbarBorder: 'rgba(255, 255, 255, 0.1)',
    panelBg: 'rgba(40, 40, 40, 0.95)',
    hover: 'rgba(255, 255, 255, 0.1)',
    active: 'rgba(96, 165, 250, 0.2)',
    selection: '#60A5FA',
    danger: '#F87171',
    shadow: 'rgba(0, 0, 0, 0.32)',
  },
};
