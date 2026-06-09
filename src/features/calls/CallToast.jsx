import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export default function CallToast() {
  const [invite, setInvite] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e) => {
      setInvite(e.detail);
      setTimeout(() => setInvite(null), 30000);
    };
    window.addEventListener('call:invite', handler);
    return () => window.removeEventListener('call:invite', handler);
  }, []);

  const handleJoin = () => {
    if (invite) {
      setInvite(null);
      navigate(`/call/${invite.sessionId}`);
    }
  };

  return (
    <AnimatePresence>
      {invite && (
        <motion.div
          initial={{ opacity: 0, y: -20, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: -20, x: '-50%' }}
          className="fixed top-6 left-1/2 z-[9999] bg-gradient-to-r from-green-600 to-emerald-500 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4"
        >
          <span className="text-2xl">📞</span>
          <div>
            <p className="font-semibold">Your call is starting!</p>
            <p className="text-sm opacity-90">The instructor is waiting for you.</p>
          </div>
          <button
            onClick={handleJoin}
            className="ml-4 bg-white text-green-700 px-4 py-1.5 rounded-full text-sm font-semibold hover:bg-green-50 transition"
          >
            Join Now
          </button>
          <button onClick={() => setInvite(null)} className="ml-2 text-white/70 hover:text-white">✕</button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}