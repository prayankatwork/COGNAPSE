import { motion, AnimatePresence } from 'framer-motion';
import { Ban } from 'lucide-react';
import { Button } from './ui';

interface SessionTakeoverOverlayProps {
  visible: boolean;
}

export default function SessionTakeoverOverlay({ visible }: SessionTakeoverOverlayProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[200] bg-my-bg flex items-center justify-center p-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className="max-w-md text-center"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ delay: 0.15, duration: 0.3 }}
          >
            <div className="w-20 h-20 bg-red-500/10 border border-red-500/30 rounded-[4px] flex items-center justify-center ds-text-danger mx-auto mb-8">
              <Ban size={32} />
            </div>
            <h1 className="text-2xl font-black text-my-ink uppercase tracking-[0.3em] mb-4">
              Session Taken Over
            </h1>
            <p className="text-xs text-my-muted uppercase tracking-[0.2em] leading-relaxed mb-6">
              Another instance of COGNAPSE was opened in a new tab.
            </p>
            <p className="text-xs text-my-muted/80 leading-relaxed mb-10">
              This session is now inactive. The new tab has control of your active session.
            </p>
            <Button
              variant="primary"
              onClick={() => window.location.href = '/'}
              className="px-12 py-4 text-xs hover:scale-105 shadow-2xl"
            >
              Return to Home
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
