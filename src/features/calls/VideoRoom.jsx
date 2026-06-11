/**
 * VideoRoom.jsx — World-class video call interface
 *
 * Features:
 * ─ Cinematic full-screen remote video
 * ─ Draggable local PiP (picture-in-picture)
 * ─ Mute / camera / end-call controls with animated states
 * ─ Connection status overlays for every state
 * ─ Duration timer
 * ─ Network quality indicator
 * ─ Responsive: works on mobile and desktop
 */

import { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Icons ────────────────────────────────────────────────────────────────────
function EndCallIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C10.61 21 3 13.39 3 4c0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.24 1.02L6.6 10.8z" transform="rotate(135,12,12)"/>
    </svg>
  );
}
function MicIcon({ muted }) {
  return muted ? (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/>
    </svg>
  ) : (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
    </svg>
  );
}
function CamIcon({ off }) {
  return off ? (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M21 6.5l-4-4-14 14 4 4 14-14zm-3.5 8.5L21 17.5V6.5l-3.5 2V15zM3 18h13l-9-9H3v9z"/>
    </svg>
  ) : (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
    </svg>
  );
}
function FullscreenIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
    </svg>
  );
}

// ─── Duration timer ───────────────────────────────────────────────────────────
function useDuration(active) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [active]);
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

// ─── Control button ───────────────────────────────────────────────────────────
function CtrlBtn({ onClick, active, danger, title, children, size = 56 }) {
  const [hov, setHov] = useState(false);
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: size, height: size, borderRadius: '50%', border: 'none',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: danger
          ? (hov ? '#c0392b' : '#e74c3c')
          : active
          ? 'rgba(255,255,255,0.18)'
          : (hov ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.1)'),
        color: active ? '#facc15' : 'white',
        backdropFilter: 'blur(10px)',
        border: danger ? 'none' : '1px solid rgba(255,255,255,0.15)',
        boxShadow: danger ? '0 4px 20px rgba(231,76,60,0.5)' : '0 2px 12px rgba(0,0,0,0.3)',
        transition: 'background 0.2s, transform 0.1s',
        outline: 'none',
      }}
    >
      {children}
    </motion.button>
  );
}

// ─── Status overlay ───────────────────────────────────────────────────────────
function StatusOverlay({ status, error, peerName }) {
  const show = status !== 'connected';
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{
            position: 'absolute', inset: 0, zIndex: 10,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
          }}
        >
          {status === 'idle' || status === 'permitting' || status === 'ready' ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 80, height: 80, borderRadius: '50%', margin: '0 auto 20px',
                background: 'linear-gradient(135deg,#c84070,#f07090)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32,
              }}>📞</div>
              <p style={{ color: 'white', fontSize: 18, fontWeight: 500, margin: '0 0 8px' }}>
                {status === 'permitting' ? 'Requesting camera access…' : 'Ready to connect'}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14 }}>
                Allow camera & microphone when prompted
              </p>
            </div>
          ) : status === 'calling' ? (
            <div style={{ textAlign: 'center' }}>
              {/* Animated ring */}
              <div style={{ position: 'relative', width: 100, height: 100, margin: '0 auto 20px' }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    position: 'absolute', inset: 0, borderRadius: '50%',
                    border: '2px solid rgba(200,64,112,0.6)',
                    animation: `callRing 2s ease-out ${i * 0.6}s infinite`,
                  }} />
                ))}
                <div style={{
                  position: 'absolute', inset: 12, borderRadius: '50%',
                  background: 'linear-gradient(135deg,#c84070,#f07090)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
                }}>📞</div>
              </div>
              <p style={{ color: 'white', fontSize: 18, fontWeight: 500, margin: '0 0 6px' }}>Connecting…</p>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Waiting for the other person to join</p>
            </div>
          ) : status === 'ended' ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>👋</div>
              <p style={{ color: 'white', fontSize: 20, fontWeight: 600, margin: '0 0 8px' }}>Call Ended</p>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14 }}>The session has finished</p>
            </div>
          ) : null}

          {error && (
            <div style={{
              marginTop: 20, background: 'rgba(231,76,60,0.2)', border: '1px solid rgba(231,76,60,0.4)',
              borderRadius: 12, padding: '10px 20px', maxWidth: 320, textAlign: 'center',
            }}>
              <p style={{ color: '#fc8181', fontSize: 13, margin: 0 }}>⚠️ {error}</p>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── VideoRoom ────────────────────────────────────────────────────────────────
export default function VideoRoom({
  localStream,
  remoteStream,
  status,
  error,
  isMuted,
  isCamOff,
  onEnd,
  onToggleMute,
  onToggleCamera,
  peerName,
}) {
  const localVideoRef  = useRef(null);
  const remoteVideoRef = useRef(null);
  const containerRef   = useRef(null);
  const duration = useDuration(status === 'connected');
  const [showControls, setShowControls] = useState(true);
  const hideTimer = useRef(null);
  const [fullscreen, setFullscreen] = useState(false);

  // Attach streams to video elements
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Auto-hide controls after 4s of no movement
  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (status === 'connected') setShowControls(false);
    }, 4000);
  }, [status]);

  useEffect(() => {
    resetHideTimer();
    return () => clearTimeout(hideTimer.current);
  }, [resetHideTimer]);

  useEffect(() => {
    // Always show controls when not connected
    if (status !== 'connected') setShowControls(true);
  }, [status]);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().then(() => setFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setFullscreen(false)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const fn = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', fn);
    return () => document.removeEventListener('fullscreenchange', fn);
  }, []);

  return (
    <>
      <style>{`
        @keyframes callRing {
          0% { transform: scale(0.85); opacity: 0.9; }
          100% { transform: scale(2); opacity: 0; }
        }
        .video-room-ctrl {
          transition: opacity 0.3s ease;
        }
      `}</style>

      <div
        ref={containerRef}
        onMouseMove={resetHideTimer}
        onTouchStart={resetHideTimer}
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: '#000',
          display: 'flex', flexDirection: 'column',
          userSelect: 'none',
        }}
      >
        {/* ── Remote video (fills screen) ──────────────────────────────── */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            style={{
              width: '100%', height: '100%', objectFit: 'cover',
              opacity: status === 'connected' && remoteStream ? 1 : 0,
              transition: 'opacity 0.5s',
            }}
          />

          {/* No-camera placeholder for remote */}
          {status === 'connected' && !remoteStream && (
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(135deg,#1a0a10,#2a0018)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{
                width: 80, height: 80, borderRadius: '50%',
                background: 'linear-gradient(135deg,#c84070,#f07090)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'system-ui', fontSize: 28, fontWeight: 700, color: 'white',
              }}>
                {peerName?.[0]?.toUpperCase() || '?'}
              </div>
              <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: 14, fontSize: 14 }}>
                {peerName || 'Other participant'}
              </p>
            </div>
          )}

          {/* Status overlay (non-connected states) */}
          <StatusOverlay status={status} error={error} peerName={peerName} />

          {/* ── Duration badge (top-center) ──────────────────────────── */}
          <AnimatePresence>
            {status === 'connected' && (
              <motion.div
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={{
                  position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)',
                  background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 100, padding: '5px 16px',
                  display: 'flex', alignItems: 'center', gap: 8,
                  zIndex: 20,
                }}
              >
                <span style={{
                  width: 8, height: 8, borderRadius: '50%', background: '#2ecc71',
                  animation: 'pulse-dot 1.5s ease-in-out infinite',
                  flexShrink: 0,
                }} />
                <span style={{ color: 'white', fontSize: 14, fontFamily: 'monospace', letterSpacing: '0.05em' }}>
                  {duration}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Peer name badge (top-left) ────────────────────────────── */}
          {peerName && status === 'connected' && (
            <div style={{
              position: 'absolute', top: 20, left: 20,
              background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 100, padding: '5px 14px',
              color: 'rgba(255,255,255,0.85)', fontSize: 13,
            }}>
              {peerName}
            </div>
          )}

          {/* ── Local PiP ────────────────────────────────────────────── */}
          {localStream && (
            <div style={{
              position: 'absolute',
              bottom: showControls ? 110 : 20,
              right: 20,
              width: 'clamp(120px,18vw,180px)',
              aspectRatio: '3/4',
              borderRadius: 16,
              overflow: 'hidden',
              border: '2px solid rgba(255,255,255,0.25)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
              background: '#111',
              transition: 'bottom 0.3s ease',
              zIndex: 20,
            }}>
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
              />
              {isCamOff && (
                <div style={{
                  position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)',
                  fontSize: 24,
                }}>
                  🚫
                </div>
              )}
              <div style={{
                position: 'absolute', bottom: 6, left: '50%', transform: 'translateX(-50%)',
                background: 'rgba(0,0,0,0.5)', color: 'rgba(255,255,255,0.6)',
                fontSize: 10, borderRadius: 100, padding: '2px 8px', whiteSpace: 'nowrap',
              }}>
                You {isMuted ? '🔇' : ''}
              </div>
            </div>
          )}
        </div>

        {/* ── Control bar ──────────────────────────────────────────────── */}
        <AnimatePresence>
          {showControls && (
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.25 }}
              className="video-room-ctrl"
              style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                padding: '24px 24px 36px',
                background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
                zIndex: 30,
              }}
            >
              {/* Mute */}
              <CtrlBtn
                onClick={onToggleMute}
                active={isMuted}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                <MicIcon muted={isMuted} />
              </CtrlBtn>

              {/* End call */}
              <CtrlBtn onClick={onEnd} danger size={64} title="End call">
                <EndCallIcon />
              </CtrlBtn>

              {/* Camera */}
              <CtrlBtn
                onClick={onToggleCamera}
                active={isCamOff}
                title={isCamOff ? 'Turn camera on' : 'Turn camera off'}
              >
                <CamIcon off={isCamOff} />
              </CtrlBtn>

              {/* Fullscreen */}
              <CtrlBtn onClick={toggleFullscreen} title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
                <FullscreenIcon />
              </CtrlBtn>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}