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
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const { localStream, remoteStream, status, error, startCall, endCall } = useWebRTC(sessionId, user?.id);

  useEffect(() => {
    async function init() {
      const { data } = await supabase.from('video_call_sessions').select('*').eq('id', sessionId).single();
      if (!data) { setLoading(false); return; }

      const isAdmin = profile?.role === 'admin';
      const isStudent = data.student_id === user?.id;
      if (!isAdmin && !isStudent && data.instructor_id !== user?.id) {
        setLoading(false);
        return;
      }

      setSession(data);

      if (isAdmin && !data.room_ready) {
        console.log('Setting room_ready = true');
        await supabase.from('video_call_sessions').update({ room_ready: true }).eq('id', sessionId);
      }
      // Record joined user
      const joined = data.joined_by || [];
      if (!joined.includes(user?.id)) {
        await supabase.from('video_call_sessions').update({
          joined_by: [...joined, user?.id],
          status: 'active',
          started_at: new Date().toISOString(),
        }).eq('id', sessionId);
      }
      setLoading(false);
    }
    if (user) init();
  }, [sessionId, user, profile]);

  const handleEndCall = useCallback(async () => {
    endCall();
    await supabase.from('video_call_sessions').update({ status: 'ended', ended_at: new Date().toISOString(), room_ready: false }).eq('id', sessionId);
    navigate('/dashboard');
  }, [endCall, sessionId, navigate]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-12 w-12 border-4 border-brand-rose-200 border-t-brand-rose-600 rounded-full" /></div>;
  if (!session) return <div className="min-h-screen flex items-center justify-center"><GlassCard className="p-8 text-center"><h2>Access Denied</h2><button onClick={() => navigate(-1)} className="btn-primary mt-4">Go Back</button></GlassCard></div>;

  return (
    <div className="min-h-screen bg-black relative">
      {status === 'idle' && (
        <div className="flex items-center justify-center h-screen">
          <GlassCard className="p-8 text-center">
            <h2 className="text-2xl font-display font-semibold mb-4">1‑on‑1 Call</h2>
            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
            <PrimaryButton onClick={startCall}>Join Call</PrimaryButton>
          </GlassCard>
        </div>
      )}
      {(localStream || remoteStream) && <VideoRoom localStream={localStream} remoteStream={remoteStream} status={status} onEnd={handleEndCall} />}
      {status === 'ended' && <div className="flex items-center justify-center h-screen"><GlassCard className="p-8 text-center"><h2>Call Ended</h2><button onClick={() => navigate('/dashboard')} className="btn-primary mt-4">Back to Dashboard</button></GlassCard></div>}
    </div>
  );
}