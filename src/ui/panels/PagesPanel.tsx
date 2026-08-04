import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2 } from 'lucide-react';
import { useCanvasStore } from '../../state/canvasStore';
import { useUIStore } from '../../state/uiStore';
import { useUndoRedoStore } from '../../state/undoRedoStore';
import { pageRepo, notebookRepo, strokeRepo, shapeRepo } from '../../persistence/db';
import { PageThumbnail } from './PageThumbnail';
import type { Page, CanvasObject } from '../../types';

export function PagesPanel() {
  const { isPagesPanelOpen, closePagesPanel } = useUIStore();
  const { currentPageId, setBackground, loadPage, currentNotebookId } = useCanvasStore();
  const [pages, setPages] = useState<Page[]>([]);
  const [notebookId, setNotebookId] = useState<string | null>(currentNotebookId);
  const [pageObjects, setPageObjects] = useState<Map<string, CanvasObject[]>>(new Map());

  useEffect(() => {
    if (isPagesPanelOpen) {
      loadPages();
    }
  }, [isPagesPanelOpen]);

  const loadPages = async () => {
    let nbId = notebookId;
    if (!nbId) {
      const nb = await notebookRepo.getOrCreateDefault();
      nbId = nb.id;
      setNotebookId(nbId);
    }
    const loadedPages = await pageRepo.getByNotebook(nbId!);
    setPages(loadedPages);
    
    // Load objects for each page to generate thumbnails
    const objectsMap = new Map<string, CanvasObject[]>();
    await Promise.all(
      loadedPages.map(async (page) => {
        const strokes = await strokeRepo.getByPage(page.id);
        const shapes = await shapeRepo.getByPage(page.id);
        objectsMap.set(page.id, [...strokes, ...shapes]);
      })
    );
    setPageObjects(objectsMap);
  };

  const handlePageSelect = async (page: Page) => {
    if (page.id === currentPageId) return;

    // Trigger autosave for current page before switching
    window.dispatchEvent(new CustomEvent('infinity-board:autosave'));
    // Brief delay to allow autosave to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    const strokes = await strokeRepo.getByPage(page.id);
    const shapes = await shapeRepo.getByPage(page.id);
    loadPage(
      page.id,
      page.notebookId,
      [...strokes, ...shapes],
      page.background,
      page.viewport,
      page.zoom
    );
    setBackground(page.background);
    closePagesPanel();
  };

  const handleAddPage = async () => {
    if (!notebookId) return;
    const currentPage = pages.find(p => p.id === currentPageId);
    const newPage = await pageRepo.create(
      notebookId,
      currentPage?.background || 'white',
      pages.length
    );
    await notebookRepo.update(notebookId, {
      pageOrder: [...pages.map(p => p.id), newPage.id],
    });
    setPages([...pages, newPage]);
    handlePageSelect(newPage);
  };

  const handleDeletePage = async (pageId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (pages.length <= 1) return;

    // Clear undo/redo history for deleted page
    useUndoRedoStore.getState().clearPageHistory(pageId);

    await pageRepo.delete(pageId);
    if (notebookId) {
      await notebookRepo.update(notebookId, {
        pageOrder: pages.filter(p => p.id !== pageId).map(p => p.id),
      });
    }

    const updatedPages = pages.filter(p => p.id !== pageId);
    setPages(updatedPages);

    if (pageId === currentPageId && updatedPages.length > 0) {
      handlePageSelect(updatedPages[0]);
    }

    useUIStore.getState().addToast('Page deleted');
  };

  return (
    <AnimatePresence>
      {isPagesPanelOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            onClick={closePagesPanel}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 glassmorphism rounded-t-3xl safe-bottom"
            style={{ maxHeight: '60vh' }}
          >
            <div className="p-4">
              <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-4" />
              <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">Pages</h2>
              
              <div className="overflow-x-auto pb-4 custom-scrollbar">
                <div className="flex gap-3 min-w-max">
                  {pages.map((page, index) => (
                    <motion.div
                      key={page.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className={`page-card w-32 h-40 bg-gray-100 dark:bg-gray-800 flex-shrink-0 overflow-hidden ${
                        page.id === currentPageId ? 'selected' : ''
                      }`}
                      onClick={() => handlePageSelect(page)}
                    >
                      {/* Thumbnail Preview */}
                      <div className="absolute inset-0">
                        <PageThumbnail
                          objects={pageObjects.get(page.id) || []}
                          background={page.background}
                          width={128}
                          height={160}
                          className="w-full h-full"
                        />
                      </div>
                      {/* Overlay controls */}
                      <div className="absolute inset-0 p-2 flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                          <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 bg-black/20 dark:bg-white/20 px-1.5 py-0.5 rounded backdrop-blur-sm">
                            {index + 1}
                          </span>
                          <button
                            onClick={(e) => handleDeletePage(page.id, e)}
                            className="p-1 rounded-full bg-black/20 dark:bg-white/20 hover:bg-red-500/80 text-white hover:text-white backdrop-blur-sm transition-colors"
                            aria-label="Delete page"
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>
                      </div>
                      {/* Selected indicator */}
                      {page.id === currentPageId && (
                        <div className="absolute inset-0 ring-2 ring-blue-500 rounded-xl pointer-events-none" />
                      )}
                    </motion.div>
                  ))}
                  
                  <button
                    onClick={handleAddPage}
                    className="w-32 h-40 flex-shrink-0 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center gap-2 hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
                  >
                    <Plus size={24} className="text-gray-400" />
                    <span className="text-xs text-gray-400">New Page</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
