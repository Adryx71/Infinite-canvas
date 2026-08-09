import { useEffect, useCallback, useRef, Component, type ReactNode, lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import { useCanvasStore } from './state/canvasStore';
import { useUIStore } from './state/uiStore';
import { canvasEngine } from './engine/canvasEngine';
import { gestureHandler } from './gestures/handler';
import { notebookRepo, pageRepo, strokeRepo, shapeRepo, settingsRepo, versionRepo } from './persistence/db';

import { Toolbar } from './ui/toolbar/Toolbar';
import { PagesButton } from './ui/toolbar/PagesButton';
import { PageNavigator } from './ui/toolbar/PageNavigator';
import { TopBar } from './ui/topbar/TopBar';
import { ToastContainer } from './ui/toast/Toast';
import { SelectionOverlay } from './ui/overlay/SelectionOverlay';
import { EraserCursor } from './ui/overlay/EraserCursor';

// Lazy load heavy panels for better initial load
const PagesPanel = lazy(() => import('./ui/panels/PagesPanel').then(m => ({ default: m.PagesPanel })));
const SettingsPanel = lazy(() => import('./ui/panels/SettingsPanel').then(m => ({ default: m.SettingsPanel })));
import { BACKGROUND_COLORS, BACKGROUND_COLORS_DARK } from './config';
import type { CanvasObject } from './types';

// Error boundary for canvas initialization failures
class CanvasErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: string }> {
  state = { hasError: false, error: '' };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="text-center p-8 max-w-md">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">Canvas Failed to Load</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">WebGL may not be supported on this device. Try using a modern browser with hardware acceleration enabled.</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">{this.state.error}</p>
            <button onClick={() => window.location.reload()} className="px-4 py-2 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors">
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleCallbackRef = useRef<ReturnType<typeof requestIdleCallback> | null>(null);
  const versionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const initializedRef = useRef(false);
  const dirtyRef = useRef(false);
  const savingRef = useRef(false);

  const { theme, setTheme } = useUIStore();
  const { currentPageId, background, loadPage } = useCanvasStore();

  // Initialize app
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const init = async () => {
      // Load saved settings
      const savedSettings = await settingsRepo.get();
      if (savedSettings) {
        useUIStore.getState().loadSettings(savedSettings);
        setTheme(savedSettings.theme || theme);
      }

      // Get or create default notebook
      const notebook = await notebookRepo.getOrCreateDefault();
      const pages = await pageRepo.getByNotebook(notebook.id);

      if (pages.length === 0) {
        const page = await pageRepo.create(notebook.id, 'white', 0);
        await notebookRepo.update(notebook.id, { pageOrder: [page.id] });
        loadPage(page.id, notebook.id, [], 'white', { x: 0, y: 0 }, 1);
      } else {
        const lastPage = pages[pages.length - 1];
        const strokes = await strokeRepo.getByPage(lastPage.id);
        const shapes = await shapeRepo.getByPage(lastPage.id);
        loadPage(lastPage.id, notebook.id, [...strokes, ...shapes], lastPage.background, lastPage.viewport, lastPage.zoom);
      }

      if (canvasContainerRef.current) {
        await canvasEngine.init(canvasContainerRef.current);
        gestureHandler.attach(canvasContainerRef.current);
        canvasEngine.requestRender();
      }
    };

    init();

    return () => {
      gestureHandler.detach();
      canvasEngine.destroy();
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
      if (idleCallbackRef.current) cancelIdleCallback(idleCallbackRef.current);
      if (versionTimerRef.current) clearInterval(versionTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply theme class
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // Autosave handler - always reads fresh state to avoid stale closures
  const handleAutosave = useCallback(async () => {
    if (savingRef.current) return; // don't stack saves
    savingRef.current = true;
    dirtyRef.current = false;

    try {
      const state = useCanvasStore.getState();
      const pid = state.currentPageId;
      if (!pid) return;

      const allObjects = Array.from(state.objects.values());
      const strokes = allObjects.filter(o => o.kind === 'stroke');
      const shapes = allObjects.filter(o => o.kind === 'shape');

      await pageRepo.update(pid, {
        viewport: { x: state.viewportX, y: state.viewportY },
        zoom: state.zoom,
        background: state.background,
      });

      // Sync strokes: upsert current ones, delete any erased/undone from DB
      await strokeRepo.syncPage(pid, strokes);
      // Sync shapes: upsert current ones, delete any erased/undone from DB
      await shapeRepo.syncPage(pid, shapes);

      // Persist settings
      const uiState = useUIStore.getState();
      await settingsRepo.save({
        theme: uiState.theme,
        toolSettings: uiState.toolSettings,
        recentColors: uiState.recentColors,
        smartShapeRecognition: uiState.smartShapeRecognition,
        highContrast: uiState.highContrast,
      });
    } finally {
      savingRef.current = false;
      // If something changed while we were saving, schedule another save
      if (dirtyRef.current) {
        scheduleSave();
      }
    }
  }, []);

  // Schedule a save — uses requestIdleCallback when available, falls back to short debounce
  const scheduleSave = useCallback(() => {
    dirtyRef.current = true;
    if (savingRef.current) return; // save in progress, will re-schedule when done

    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);

    // requestIdleCallback: save when browser is idle (best for perf)
    if ('requestIdleCallback' in window) {
      if (idleCallbackRef.current) cancelIdleCallback(idleCallbackRef.current);
      idleCallbackRef.current = requestIdleCallback(() => {
        handleAutosave();
      }, { timeout: 300 }); // ensure save within 300ms even if never idle
    } else {
      // Fallback: short 200ms debounce
      autosaveTimerRef.current = setTimeout(handleAutosave, 200);
    }
  }, [handleAutosave]);

  // Listen for autosave events — 200ms debounce instead of 500ms
  useEffect(() => {
    const handler = () => scheduleSave();

    window.addEventListener('infinity-board:autosave', handler);
    return () => window.removeEventListener('infinity-board:autosave', handler);
  }, [scheduleSave]);

  // Save immediately before page unload — prevents data loss on refresh/close
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Cancel any pending debounced/idle save and run immediately
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
      if (idleCallbackRef.current) cancelIdleCallback(idleCallbackRef.current);
      handleAutosave();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
        if (idleCallbackRef.current) cancelIdleCallback(idleCallbackRef.current);
        handleAutosave();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [handleAutosave]);

  // Version history snapshots - always reads fresh state
  useEffect(() => {
    versionTimerRef.current = setInterval(async () => {
      const state = useCanvasStore.getState();
      const pid = state.currentPageId;
      if (!pid) return;
      const allObjects = Array.from(state.objects.values());
      if (allObjects.length === 0) return;

      const snapshot = {
        id: crypto.randomUUID(),
        pageId: pid,
        pageState: {
          background: state.background,
          viewport: { x: state.viewportX, y: state.viewportY },
          zoom: state.zoom,
          objects: allObjects.map(o => ({ ...o } as CanvasObject)),
        },
        createdAt: Date.now(),
      };

      await versionRepo.add(snapshot);
    }, 5 * 60 * 1000);

    return () => {
      if (versionTimerRef.current) clearInterval(versionTimerRef.current);
    };
  }, []);

  const bgColor = theme === 'dark'
    ? BACKGROUND_COLORS_DARK[background] || '#1a1a1a'
    : BACKGROUND_COLORS[background] || '#FFFFFF';

  return (
    <CanvasErrorBoundary>
      <div className="w-full h-full relative overflow-hidden" style={{ backgroundColor: bgColor }}>
        <div
          ref={canvasContainerRef}
          className="absolute inset-0"
          style={{ touchAction: 'none' }}
        />
        <SelectionOverlay />
        <EraserCursor />

        <TopBar />
        <Toolbar />
        <PageNavigator />
        <PagesButton />
        <Suspense fallback={null}>
          <PagesPanel />
          <SettingsPanel />
        </Suspense>
        <ToastContainer />

        {currentPageId === null && (
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="absolute inset-0 flex items-center justify-center bg-white dark:bg-gray-900 z-50"
          >
            <div className="text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"
              />
              <p className="text-gray-500 dark:text-gray-400">Loading...</p>
            </div>
          </motion.div>
        )}
      </div>
    </CanvasErrorBoundary>
  );
}

export default App;
