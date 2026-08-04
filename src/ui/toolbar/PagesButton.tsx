import { motion } from 'framer-motion';
import { BookOpen } from 'lucide-react';
import { useUIStore } from '../../state/uiStore';

export function PagesButton() {
  const { openPagesPanel } = useUIStore();

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: 0.2 }}
      onClick={openPagesPanel}
      className="fixed bottom-4 right-4 z-[65] safe-right safe-bottom toolbar-btn glassmorphism"
      aria-label="Open pages panel"
      title="Pages"
    >
      <BookOpen size={20} />
    </motion.button>
  );
}
