/**
 * CallToast.jsx — Incoming call toast notification
 *
 * Fixes:
 * ─ Uses notifyIncomingCall() (sound + vibrate + browser notification)
 * ─ Countdown timer showing seconds remaining
 * ─ Auto-dismiss after 30s
 * ─ Prevents duplicate toasts for same session
 * ─ Animated entrance/exit
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { notifyIncomingCall } from '@/lib/notifications';

const TOAST_TIMEOUT = 30; // seconds

export default function CallToast() {
  const [invite, setInvite]     = useState(null); // { sessionId }
  const [countdown, setCountdown] = useState(TOAST_TIMEOUT);
  const navigate = useNavigate();
  const countRef = useRef(null);
  const lastSessionRef = useRef(null); // prevent duplicate toasts

  const dismiss = useCallback(() => {
    setInvite(null);
    setCountdown(TOAST_TIMEOUT);
    clearInterval(countRef.current);
  }, []);

  const handleJoin = useCallback(() => {
    if (!invite) return;
    const id = invite.sessionId;
    dismiss();
    navigate(`/call/${id}`);
  }, [invite, dismiss, navigate]);

  useEffect(() => {
    const handler = (e) => {
      const { sessionId } = e.detail || {};
      if (!sessionId) return;

      // Don't re-show toast for same session
      if (lastSessionRef.current === sessionId) return;
      lastSessionRef.current = sessionId;

      setInvite({ sessionId });
      setCountdown(TOAST_TIMEOUT);

      // Play sound + browser notification
      notifyIncomingCall(sessionId);

      // Countdown
      clearInterval(countRef.current);
      countRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countRef.current);
            setInvite(null);
            lastSessionRef.current = null;
            return TOAST_TIMEOUT;
          }
          return prev - 1;
        });
      }, 1000);
    };

    window.addEventListener('call:invite', handler);
    return () => {
      window.removeEventListener('call:invite', handler);
      clearInterval(countRef.current);
    };
  }, []);

  return (
    <AnimatePresence>
      {invite && (
        <motion.div
          key="call-toast"
          initial={{ opacity: 0, y: -80, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: -80, x: '-50%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          style={{
            position: 'fixed',
            top: 20,
            left: '50%',
            zIndex: 99999,
            minWidth: 340,
            maxWidth: 400,
          }}
        >
          <div style={{
            background: 'linear-gradient(135deg, #0f1e0f, #0a1a0a)',
            border: '1px solid rgba(46,204,113,0.4)',
            borderRadius: 20,
            padding: '18px 20px',
            display: 'flex', alignItems: 'center', gap: 14,
            boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(46,204,113,0.2)',
          }}>
            {/* Pulsing icon */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: 'linear-gradient(135deg, #27ae60, #2ecc71)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22,
                boxShadow: '0 0 0 0 rgba(46,204,113,0.4)',
                animation: 'callPulse 1.2s ease-out infinite',
              }}>
                📞
              </div>
              <style>{`
                @keyframes callPulse {
                  0% { box-shadow: 0 0 0 0 rgba(46,204,113,0.6); }
                  70% { box-shadow: 0 0 0 14px rgba(46,204,113,0); }
                  100% { box-shadow: 0 0 0 0 rgba(46,204,113,0); }
                }
              `}</style>
            </div>

            {/* Text */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontFamily: "'DM Sans',system-ui,sans-serif",
                fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.95)',
                margin: 0, lineHeight: 1.2,
              }}>
                Your call is starting!
              </p>
              <p style={{
                fontFamily: "'DM Sans',system-ui,sans-serif",
                fontSize: 12, color: 'rgba(255,255,255,0.5)',
                margin: '3px 0 0',
              }}>
                Instructor is waiting · {countdown}s
              </p>
              {/* Countdown bar */}
              <div style={{ height: 2, background: 'rgba(255,255,255,0.08)', borderRadius: 1, marginTop: 8, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 1,
                  background: 'linear-gradient(90deg, #2ecc71, #27ae60)',
                  width: `${(countdown / TOAST_TIMEOUT) * 100}%`,
                  transition: 'width 1s linear',
                }} />
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
              <button
                onClick={handleJoin}
                style={{
                  background: 'linear-gradient(135deg,#27ae60,#2ecc71)',
                  color: 'white', border: 'none', borderRadius: 100,
                  padding: '8px 18px', cursor: 'pointer',
                  fontFamily: "'DM Sans',system-ui,sans-serif",
                  fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap',
                  boxShadow: '0 4px 14px rgba(46,204,113,0.4)',
                  transition: 'transform 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'none'}
              >
                Join Now
              </button>
              <button
                onClick={dismiss}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  color: 'rgba(255,255,255,0.45)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 100, padding: '6px 18px', cursor: 'pointer',
                  fontFamily: "'DM Sans',system-ui,sans-serif", fontSize: 12,
                  transition: 'color 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.75)'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.45)'}
              >
                Dismiss
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}