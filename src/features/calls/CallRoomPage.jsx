import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/config/supabase';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useWebRTC } from './useWebRTC';
import VideoRoom from './VideoRoom';
import GlassCard from '@/shared/components/GlassCard';
import PrimaryButton from '@/shared/components/PrimaryButton';
import { sendNotification } from '@/lib/notifications';

const F = {
  display: "'Cormorant Garamond','Playfair Display',Georgia,serif",
  body: "'DM Sans',system-ui,sans-serif",
};

// ─── Spinner ──────────────────────────────────────────────────────────────────
function Spinner({ size = 44, color = '#c84070' }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: `3px solid ${color}22`,
        borderTop: `3px solid ${color}`,
        animation: 'spin 0.7s linear infinite',
      }}
    />
  );
}

// ─── Pre‑call screen ──────────────────────────────────────────────────────────
function PreCallScreen({
  session,
  profile,
  isAdmin,
  onJoin,
  loading,
  error,
  permissionError,
}) {
  const peerName = isAdmin ? 'Student' : 'Your Instructor';
  const dt = session?.scheduled_at ? new Date(session.scheduled_at) : null;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #0f0a10 0%, #1a0818 60%, #0a0010 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes callRing { 0%{transform:scale(0.85);opacity:0.9} 100%{transform:scale(2);opacity:0} }`}</style>

      <div
        style={{
          background: 'rgba(255,255,255,0.05)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(232,112,144,0.2)',
          borderRadius: 28,
          padding: '48px 40px',
          maxWidth: 440,
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
        }}
      >
        {/* Animated avatar ring */}
        <div style={{ position: 'relative', width: 100, height: 100, margin: '0 auto 28px' }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                border: '1.5px solid rgba(200,64,112,0.4)',
                animation: `callRing 2.4s ease-out ${i * 0.8}s infinite`,
              }}
            />
          ))}
          <div
            style={{
              position: 'absolute',
              inset: 12,
              borderRadius: '50%',
              background: 'linear-gradient(135deg,#c84070,#f07090)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 30,
            }}
          >
            📞
          </div>
        </div>

        <h1
          style={{
            fontFamily: F.display,
            fontSize: 30,
            fontWeight: 600,
            color: 'rgba(255,240,245,0.95)',
            margin: '0 0 8px',
            lineHeight: 1.2,
          }}
        >
          1‑on‑1 Session
        </h1>

        <p style={{ fontFamily: F.body, fontSize: 14, color: 'rgba(255,180,210,0.6)', margin: '0 0 6px' }}>
          with {peerName}
        </p>

        {dt && (
          <p
            style={{
              fontFamily: F.body,
              fontSize: 13,
              color: 'rgba(255,160,190,0.4)',
              margin: '0 0 28px',
            }}
          >
            {dt.toLocaleString([], {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        )}

        {/* Permission note */}
        <div
          style={{
            background: 'rgba(200,64,112,0.08)',
            border: '1px solid rgba(200,64,112,0.2)',
            borderRadius: 12,
            padding: '12px 16px',
            marginBottom: 24,
            textAlign: 'left',
          }}
        >
          <p
            style={{
              fontFamily: F.body,
              fontSize: 12.5,
              color: 'rgba(255,200,215,0.75)',
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            🎥 Your browser will ask for camera & microphone access. Allow both to join the session.
          </p>
        </div>

        {(error || permissionError) && (
          <div
            style={{
              background: 'rgba(231,76,60,0.1)',
              border: '1px solid rgba(231,76,60,0.3)',
              borderRadius: 12,
              padding: '10px 16px',
              marginBottom: 20,
            }}
          >
            <p style={{ fontFamily: F.body, fontSize: 13, color: '#fc8181', margin: 0 }}>
              ⚠️ {error || permissionError}
            </p>
          </div>
        )}

        <button
          onClick={onJoin}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            width: '100%',
            padding: '15px 28px',
            background: loading
              ? 'rgba(200,64,112,0.3)'
              : 'linear-gradient(135deg,#c84070,#f07090)',
            color: 'white',
            border: 'none',
            borderRadius: 100,
            cursor: loading ? 'not-allowed' : 'pointer',
            fontFamily: F.body,
            fontSize: 16,
            fontWeight: 600,
            boxShadow: loading ? 'none' : '0 6px 24px rgba(200,64,112,0.45)',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            if (!loading) e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'none';
          }}
        >
          {loading ? (
            <>
              <Spinner size={20} color="rgba(255,255,255,0.8)" />
              Connecting…
            </>
          ) : (
            <>
              <span>📞</span>
              Allow & Join Call
            </>
          )}
        </button>

        <p
          style={{
            fontFamily: F.body,
            fontSize: 11,
            color: 'rgba(255,160,190,0.35)',
            marginTop: 14,
          }}
        >
          Your camera and microphone will activate after you click
        </p>
      </div>
    </div>
  );
}

// ─── Access denied ────────────────────────────────────────────────────────────
function AccessDenied({ navigate }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0f0a10',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(231,76,60,0.3)',
          borderRadius: 24,
          padding: '48px 40px',
          textAlign: 'center',
          maxWidth: 400,
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔐</div>
        <h2
          style={{
            fontFamily: F.display,
            fontSize: 28,
            color: 'rgba(255,240,245,0.9)',
            margin: '0 0 10px',
          }}
        >
          Access Denied
        </h2>
        <p
          style={{
            fontFamily: F.body,
            fontSize: 14,
            color: 'rgba(255,180,210,0.5)',
            margin: '0 0 24px',
          }}
        >
          You're not authorised to join this session.
        </p>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'linear-gradient(135deg,#c84070,#f07090)',
            color: 'white',
            border: 'none',
            borderRadius: 100,
            padding: '11px 28px',
            cursor: 'pointer',
            fontFamily: F.body,
            fontSize: 14,
          }}
        >
          Go Back
        </button>
      </div>
    </div>
  );
}

// ─── Post‑call screen ─────────────────────────────────────────────────────────
function PostCallScreen({ navigate, isAdmin }) {
  const [count, setCount] = useState(5);
  useEffect(() => {
    if (count <= 0) {
      navigate(isAdmin ? '/admin/calls' : '/dashboard/calls');
      return;
    }
    const id = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [count, navigate, isAdmin]);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0f0a10',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 24,
          padding: '48px 40px',
          textAlign: 'center',
          maxWidth: 380,
        }}
      >
        <div style={{ fontSize: 56, marginBottom: 16 }}>👋</div>
        <h2
          style={{
            fontFamily: F.display,
            fontSize: 28,
            color: 'rgba(255,240,245,0.92)',
            margin: '0 0 10px',
          }}
        >
          Call Ended
        </h2>
        <p
          style={{
            fontFamily: F.body,
            fontSize: 14,
            color: 'rgba(255,180,210,0.55)',
            margin: '0 0 24px',
          }}
        >
          Redirecting in {count}s…
        </p>
        <button
          onClick={() => navigate(isAdmin ? '/admin/calls' : '/dashboard/calls')}
          style={{
            background: 'linear-gradient(135deg,#c84070,#f07090)',
            color: 'white',
            border: 'none',
            borderRadius: 100,
            padding: '11px 28px',
            cursor: 'pointer',
            fontFamily: F.body,
            fontSize: 14,
          }}
        >
          Back to Calls
        </button>
      </div>
    </div>
  );
}

// ─── CallRoomPage ─────────────────────────────────────────────────────────────
export default function CallRoomPage() {
  const { sessionId } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [pageState, setPageState] = useState('loading'); // loading | pre-call | in-call | denied | post-call
  const [session, setSession] = useState(null);
  const [permissionError, setPermissionError] = useState(null);
  const [joining, setJoining] = useState(false);
  const isAdminRef = useRef(false);

  const {
    localStream,
    remoteStream,
    status,
    error,
    isMuted,
    isCamOff,
    startCall,
    endCall,
    toggleMute,
    toggleCamera,
  } = useWebRTC(sessionId, user?.id);

  // ── Initialise room ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user || !profile) return;

    async function init() {
      console.log('[CallRoom] Fetching session...', sessionId);
      const { data, error: fetchErr } = await supabase
        .from('video_call_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (fetchErr || !data) {
        console.log('[CallRoom] Session not found');
        setPageState('denied');
        return;
      }

      const isAdmin = profile?.role === 'admin';
      const isStudent = data.student_id === user.id;
      const isInstructor = data.instructor_id === user.id;

      if (!isAdmin && !isStudent && !isInstructor) {
        console.log('[CallRoom] Access denied for user', user.id);
        setPageState('denied');
        return;
      }

      isAdminRef.current = isAdmin;
      setSession(data);
      console.log('[CallRoom] Session loaded, isAdmin:', isAdmin, 'session:', data);

      // Admin/instructor: mark room_ready so student gets notified
      if (isAdmin && !data.room_ready) {
        console.log('[CallRoom] Setting room_ready = true');
        await supabase
          .from('video_call_sessions')
          .update({
            room_ready: true,
            status: 'active',
            started_at: new Date().toISOString(),
          })
          .eq('id', sessionId);
      }

      // Update joined_by
      const joined = Array.isArray(data.joined_by) ? data.joined_by : [];
      if (!joined.includes(user.id)) {
        await supabase
          .from('video_call_sessions')
          .update({ joined_by: [...joined, user.id] })
          .eq('id', sessionId);
      }

      setPageState('pre-call');
      console.log('[CallRoom] State -> pre-call');
    }

    init();
  }, [user, profile, sessionId]);

  // ── When user clicks "Allow & Join" ───────────────────────────────────────
  const handleJoin = useCallback(async () => {
    if (joining) return;
    console.log('[CallRoom] handleJoin clicked');
    setJoining(true);
    setPermissionError(null);

    try {
      await startCall();
      console.log('[CallRoom] startCall succeeded');
      setPageState('in-call');
    } catch (e) {
      console.error('[CallRoom] startCall failed:', e);
      setPermissionError(e?.message || 'Failed to start call.');
    } finally {
      setJoining(false);
    }
  }, [joining, startCall]);

  // Transition to in-call once localStream is available and page is pre-call
  useEffect(() => {
    if (localStream && pageState === 'pre-call') {
      console.log('[CallRoom] localStream received, moving to in-call');
      setPageState('in-call');
    }
  }, [localStream, pageState]);

  // ── End call ───────────────────────────────────────────────────────────────
  const handleEnd = useCallback(async () => {
    console.log('[CallRoom] Ending call');
    endCall();
    await supabase
      .from('video_call_sessions')
      .update({
        status: 'ended',
        ended_at: new Date().toISOString(),
        room_ready: false,
      })
      .eq('id', sessionId);
    setPageState('post-call');
  }, [endCall, sessionId]);

  // Detect remote end-of-call
  useEffect(() => {
    if (status === 'ended' && pageState === 'in-call') {
      console.log('[CallRoom] Remote ended call');
      handleEnd();
    }
  }, [status, pageState, handleEnd]);

  // ── Render ─────────────────────────────────────────────────────────────────
  console.log('[CallRoom] Render state:', {
    pageState,
    hasLocalStream: !!localStream,
    hasRemoteStream: !!remoteStream,
    webrtcStatus: status,
  });

  if (pageState === 'loading') {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#0f0a10',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <Spinner size={48} />
          <p
            style={{
              fontFamily: F.body,
              fontSize: 14,
              color: 'rgba(255,180,210,0.5)',
              marginTop: 16,
            }}
          >
            Setting up your session…
          </p>
        </div>
      </div>
    );
  }

  if (pageState === 'denied') return <AccessDenied navigate={navigate} />;
  if (pageState === 'post-call') return <PostCallScreen navigate={navigate} isAdmin={isAdminRef.current} />;

  if (pageState === 'pre-call') {
    return (
      <PreCallScreen
        session={session}
        profile={profile}
        isAdmin={isAdminRef.current}
        onJoin={handleJoin}
        loading={joining}
        error={error}
        permissionError={permissionError}
      />
    );
  }

  // in-call
  return (
    <VideoRoom
      localStream={localStream}
      remoteStream={remoteStream}
      status={status}
      error={error}
      isMuted={isMuted}
      isCamOff={isCamOff}
      onEnd={handleEnd}
      onToggleMute={toggleMute}
      onToggleCamera={toggleCamera}
      peerName={isAdminRef.current ? 'Student' : 'Your Instructor'}
    />
  );
}