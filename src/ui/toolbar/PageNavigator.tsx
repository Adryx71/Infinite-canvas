import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useCanvasStore } from '../../state/canvasStore';
import { useUIStore } from '../../state/uiStore';
import { pageRepo, notebookRepo, strokeRepo, shapeRepo } from '../../persistence/db';
import type { Page } from '../../types';

export function PageNavigator() {
  const { currentPageId, currentNotebookId, loadPage, setBackground } = useCanvasStore();
  const { addToast, toolbarPosition } = useUIStore();
  const [pages, setPages] = useState<Page[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load pages when component mounts or notebook changes
  useEffect(() => {
    const loadPages = async () => {
      let nbId = currentNotebookId;
      if (!nbId) {
        const nb = await notebookRepo.getOrCreateDefault();
        nbId = nb.id;
      }
      const loadedPages = await pageRepo.getByNotebook(nbId!);
      setPages(loadedPages);
    };
    loadPages();
  }, [currentNotebookId, currentPageId]);

  const currentIndex = pages.findIndex(p => p.id === currentPageId);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < pages.length - 1;

  const handlePageSelect = useCallback(async (page: Page) => {
    if (page.id === currentPageId || isLoading) return;
    
    setIsLoading(true);
    try {
      // Trigger autosave for current page before switching
      window.dispatchEvent(new CustomEvent('infinity-board:autosave'));
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
    } catch (error) {
      addToast('Failed to load page', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [currentPageId, isLoading, loadPage, setBackground, addToast]);

  const handlePreviousPage = useCallback(() => {
    if (hasPrevious && !isLoading) {
      handlePageSelect(pages[currentIndex - 1]);
    }
  }, [hasPrevious, isLoading, pages, currentIndex, handlePageSelect]);

  const handleNextPage = useCallback(() => {
    if (hasNext && !isLoading) {
      handlePageSelect(pages[currentIndex + 1]);
    }
  }, [hasNext, isLoading, pages, currentIndex, handlePageSelect]);

  const handleAddPage = useCallback(async () => {
    if (isLoading || !currentNotebookId) return;
    
    setIsLoading(true);
    try {
      const currentPage = pages.find(p => p.id === currentPageId);
      const newPage = await pageRepo.create(
        currentNotebookId,
        currentPage?.background || 'white',
        pages.length
      );
      
      await notebookRepo.update(currentNotebookId, {
        pageOrder: [...pages.map(p => p.id), newPage.id],
      });
      
      setPages(prev => [...prev, newPage]);
      await handlePageSelect(newPage);
      addToast('New page created', 'success');
    } catch (error) {
      addToast('Failed to create page', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, currentNotebookId, pages, currentPageId, handlePageSelect, addToast]);

  // Keyboard shortcuts — use Ctrl+Shift+Arrow to avoid browser conflicts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd+Shift+Left for previous page
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePreviousPage();
      }
      // Ctrl/Cmd+Shift+Right for next page
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextPage();
      }
      // Ctrl/Cmd+Shift+N for new page
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'N') {
        e.preventDefault();
        handleAddPage();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePreviousPage, handleNextPage, handleAddPage]);

  if (pages.length === 0) return null;

  // Position classes based on toolbarPosition
  const positionClasses = {
    bottom: 'fixed bottom-[5rem] sm:bottom-20 left-2 sm:left-3 z-[55] pointer-events-none safe-left safe-bottom',
    left: 'fixed left-[5rem] sm:left-20 bottom-2 sm:left-3 z-[55] pointer-events-none safe-left safe-bottom',
    right: 'fixed right-[5rem] sm:right-20 bottom-2 sm:right-3 z-[55] pointer-events-none safe-right safe-bottom',
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay: 0.15 }}
      className={positionClasses[toolbarPosition]}
    >
      <div className="pointer-events-auto glassmorphism rounded-2xl px-1.5 py-1 flex items-center gap-0.5">
        {/* Previous Page Button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handlePreviousPage}
          disabled={!hasPrevious || isLoading}
          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150 ${
            !hasPrevious || isLoading
              ? 'opacity-30 cursor-not-allowed'
              : 'hover:bg-white/20 dark:hover:bg-white/10'
          }`}
          aria-label="Previous page"
          title="Previous page (Ctrl+Shift+←)"
        >
          <ChevronLeft size={14} strokeWidth={2.5} />
        </motion.button>

        {/* Page Indicator with Label */}
        <div className="flex flex-col items-center px-1.5 min-w-[40px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPageId}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.12 }}
              className="flex items-center gap-0.5"
            >
              <span className="text-xs font-bold text-gray-700 dark:text-gray-200">
                {currentIndex + 1}/{pages.length}
              </span>
            </motion.div>
          </AnimatePresence>
          <span className="text-[9px] font-medium text-gray-400 dark:text-gray-500 leading-none mt-0.5">
            pages
          </span>
        </div>

        {/* Add New Page Button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleAddPage}
          disabled={isLoading}
          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150 ${
            isLoading
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:bg-blue-500/20 dark:hover:bg-blue-400/20 text-blue-500 dark:text-blue-400'
          }`}
          aria-label="Add new page"
          title="Add new page (Ctrl+Shift+N)"
        >
          {isLoading ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-3 h-3 border-2 border-current border-t-transparent rounded-full"
            />
          ) : (
            <Plus size={14} strokeWidth={2.5} />
          )}
        </motion.button>

        {/* Next Page Button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleNextPage}
          disabled={!hasNext || isLoading}
          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150 ${
            !hasNext || isLoading
              ? 'opacity-30 cursor-not-allowed'
              : 'hover:bg-white/20 dark:hover:bg-white/10'
          }`}
          aria-label="Next page"
          title="Next page (Ctrl+Shift+→)"
        >
          <ChevronRight size={14} strokeWidth={2.5} />
        </motion.button>
      </div>
    </motion.div>
  );
}
