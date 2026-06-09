import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/config/supabase';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useWebRTC } from './useWebRTC';
import VideoRoom from './VideoRoom';
import GlassCard from '@/shared/components/GlassCard';
import PrimaryButton from '@/shared/components/PrimaryButton';

export default function CallRoomPage() {
  const { sessionId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const { localStream, remoteStream, status, startCall, endCall } = useWebRTC(sessionId, user?.id);

  // Verify user access & set room as ready when admin joins
  useEffect(() => {
    async function loadSession() {
      const { data } = await supabase
        .from('video_call_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (data) {
        // Check authorization
        const isAuthorized =
          data.student_id === user?.id ||
          data.instructor_id === user?.id ||
          user?.role === 'admin';

        if (!isAuthorized) {
          setSession(null);
          setLoading(false);
          return;
        }

        setSession(data);

        // If this is the admin (or instructor) joining, mark room as ready
        if (user?.role === 'admin' || data.instructor_id === user?.id) {
          await supabase
            .from('video_call_sessions')
            .update({ room_ready: true })
            .eq('id', sessionId);
        }

        // Track who joined (add current user to joined_by)
        const currentJoined = data.joined_by || [];
        if (!currentJoined.includes(user?.id)) {
          await supabase
            .from('video_call_sessions')
            .update({
              joined_by: [...currentJoined, user?.id],
              status: 'active',
              started_at: new Date().toISOString(),
            })
            .eq('id', sessionId);
        }
      }
      setLoading(false);
    }
    if (user) loadSession();
  }, [sessionId, user]);

  // Properly end the call
  const handleEndCall = useCallback(async () => {
    // Stop media tracks
    endCall();

    // Update session status
    await supabase
      .from('video_call_sessions')
      .update({
        status: 'ended',
        ended_at: new Date().toISOString(),
        room_ready: false,
      })
      .eq('id', sessionId);

    navigate('/dashboard', { replace: true });
  }, [endCall, sessionId, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand-rose-200 border-t-brand-rose-600" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <GlassCard className="p-8 text-center">
          <h2 className="text-xl font-display font-semibold">Access Denied</h2>
          <p className="text-gray-500 mt-2">You're not authorized to join this call.</p>
          <button onClick={() => navigate(-1)} className="btn-primary mt-4">Go Back</button>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative">
      {/* Waiting / Start screen */}
      {status === 'idle' && (
        <div className="flex items-center justify-center h-screen">
          <GlassCard className="p-8 text-center">
            <h2 className="text-2xl font-display font-semibold mb-4">1‑on‑1 Call</h2>
            <p className="text-gray-500 mb-6">
              {new Date(session.scheduled_at).toLocaleString()}
            </p>
            <PrimaryButton onClick={startCall}>
              Join Call
            </PrimaryButton>
          </GlassCard>
        </div>
      )}

      {/* Active call screen */}
      {(localStream || remoteStream) && (
        <VideoRoom
          localStream={localStream}
          remoteStream={remoteStream}
          status={status}
          onEnd={handleEndCall}
        />
      )}

      {/* Call ended */}
      {status === 'ended' && (
        <div className="flex items-center justify-center h-screen">
          <GlassCard className="p-8 text-center">
            <h2 className="text-2xl font-display font-semibold">Call Ended</h2>
            <button onClick={() => navigate('/dashboard')} className="btn-primary mt-4">Back to Dashboard</button>
          </GlassCard>
        </div>
      )}
    </div>
  );
}