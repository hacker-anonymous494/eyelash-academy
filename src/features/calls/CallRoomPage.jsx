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
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const { localStream, remoteStream, status, startCall, endCall } = useWebRTC(sessionId, user?.id);

  // Determine if user is admin
  useEffect(() => {
    if (user) {
      const checkAdmin = async () => {
        if (profile?.role === 'admin') {
          setIsAdmin(true);
          return;
        }
        const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        if (data?.role === 'admin') setIsAdmin(true);
      };
      checkAdmin();
    }
  }, [user, profile]);

  useEffect(() => {
    async function loadSession() {
      const { data } = await supabase
        .from('video_call_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (!data) { setLoading(false); return; }

      const isAuthorized =
        data.student_id === user?.id ||
        isAdmin ||
        data.instructor_id === user?.id;

      if (!isAuthorized) { setLoading(false); return; }

      setSession(data);

      // Admin/instructor joining → mark room ready
      if ((isAdmin || data.instructor_id === user?.id) && !data.room_ready) {
        await supabase
          .from('video_call_sessions')
          .update({ room_ready: true })
          .eq('id', sessionId);
      }

      // Track joined participants
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

      setLoading(false);
    }
    if (user && !authLoading) loadSession();
  }, [sessionId, user, isAdmin, authLoading]);

  const handleEndCall = useCallback(async () => {
    endCall();
    await supabase
      .from('video_call_sessions')
      .update({ status: 'ended', ended_at: new Date().toISOString(), room_ready: false })
      .eq('id', sessionId);
    navigate('/dashboard', { replace: true });
  }, [endCall, sessionId, navigate]);

  if (loading || authLoading) {
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
      {status === 'idle' && (
        <div className="flex items-center justify-center h-screen">
          <GlassCard className="p-8 text-center">
            <h2 className="text-2xl font-display font-semibold mb-4">1‑on‑1 Call</h2>
            <p className="text-gray-500 mb-6">{new Date(session.scheduled_at).toLocaleString()}</p>
            <PrimaryButton onClick={startCall}>Join Call</PrimaryButton>
          </GlassCard>
        </div>
      )}

      {(localStream || remoteStream) && (
        <VideoRoom localStream={localStream} remoteStream={remoteStream} status={status} onEnd={handleEndCall} />
      )}

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