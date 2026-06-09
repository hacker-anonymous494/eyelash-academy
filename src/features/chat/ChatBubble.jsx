import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/features/auth/hooks/useAuth';
import ChatDrawer from './ChatDrawer';

export default function ChatBubble() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  // Don't show the bubble at all if the user isn't logged in
  if (!user) return null;

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-brand-rose-600 to-brand-rose-400 text-white shadow-lg shadow-brand-rose-300 flex items-center justify-center hover:scale-110 transition-transform"
      >
        {open ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        )}
      </button>

      {/* Chat drawer */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 h-[450px] max-h-[60vh] bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-brand-rose-200/40 overflow-hidden"
          >
            <ChatDrawer userId={user.id} onClose={() => setOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}