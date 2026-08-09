import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers } from 'lucide-react';
import { useUIStore } from '../../state/uiStore';
import { useCanvasStore } from '../../state/canvasStore';
import { pageRepo, notebookRepo } from '../../persistence/db';

export function PagesButton() {
  const { openPagesPanel } = useUIStore();
  const { currentPageId, currentNotebookId } = useCanvasStore();
  const [pageCount, setPageCount] = useState(0);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  useEffect(() => {
    const loadPageCount = async () => {
      let nbId = currentNotebookId;
      if (!nbId) {
        const nb = await notebookRepo.getOrCreateDefault();
        nbId = nb.id;
      }
      const pages = await pageRepo.getByNotebook(nbId!);
      setPageCount(pages.length);
      const idx = pages.findIndex(p => p.id === currentPageId);
      setCurrentPageIndex(idx >= 0 ? idx : 0);
    };
    loadPageCount();
  }, [currentNotebookId, currentPageId]);

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25, delay: 0.2, type: 'spring', stiffness: 300 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={openPagesPanel}
      className="fixed bottom-4 right-4 z-[65] safe-right safe-bottom flex items-center gap-2 px-3 py-2.5 rounded-2xl glassmorphism hover:bg-white/95 dark:hover:bg-gray-800/95 transition-all duration-200 cursor-pointer group"
      aria-label="Open pages panel"
      title="Pages"
    >
      <div className="relative">
        <Layers 
          size={18} 
          strokeWidth={2}
          className="text-gray-600 dark:text-gray-300 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors" 
        />
        {pageCount > 0 && (
          <motion.div
            key={pageCount}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center"
          >
            <span className="text-[9px] font-bold text-white leading-none">
              {pageCount}
            </span>
          </motion.div>
        )}
      </div>
      
      <div className="flex flex-col items-start">
        <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 leading-none">
          Pages
        </span>
        <AnimatePresence mode="wait">
          <motion.span
            key={currentPageId}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.12 }}
            className="text-[10px] text-gray-400 dark:text-gray-500 leading-none mt-0.5"
          >
            {pageCount > 0 ? `${currentPageIndex + 1} of ${pageCount}` : 'No pages'}
          </motion.span>
        </AnimatePresence>
      </div>
    </motion.button>
  );
}
