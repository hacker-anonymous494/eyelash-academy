import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/config/supabase';
import AdminLayout from '@/features/dashboard/admin/AdminLayout';
import GlassCard from '@/shared/components/GlassCard';

const GRACE_PERIOD_HOURS = 2;

export default function AdminCallsPage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchSessions() {
      const { data } = await supabase
        .from('video_call_sessions')
        .select('*, student:profiles!video_call_sessions_student_id_fkey(full_name)')
        .order('scheduled_at', { ascending: false })
        .limit(20);

      if (data) {
        const now = new Date();
        const filtered = data.filter((s) => {
          if (s.status === 'ended') return false;
          const scheduled = new Date(s.scheduled_at);
          const deadline = new Date(scheduled.getTime() + GRACE_PERIOD_HOURS * 60 * 60 * 1000);
          return now < deadline;
        });
        setSessions(filtered.slice(0, 10));
      }
      setLoading(false);
    }
    fetchSessions();
  }, []);

  const getCallStatus = (s) => {
    const now = new Date();
    const scheduled = new Date(s.scheduled_at);
    if (s.status === 'ended') return 'ended';
    if (now > new Date(scheduled.getTime() + GRACE_PERIOD_HOURS * 60 * 60 * 1000)) return 'expired';
    if (s.room_ready) return 'in-progress';
    if (now >= scheduled) return 'ready';
    return 'scheduled';
  };

  return (
    <AdminLayout>
      <h2 className="text-3xl font-display font-semibold mb-6">Video Call Sessions</h2>
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand-rose-200 border-t-brand-rose-600" />
        </div>
      ) : sessions.length === 0 ? (
        <GlassCard className="p-8 text-center">
          <p className="text-gray-500">No upcoming sessions.</p>
        </GlassCard>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => {
            const callStatus = getCallStatus(session);
            const canJoin = callStatus === 'ready' || callStatus === 'in-progress';
            return (
              <GlassCard key={session.id} className="flex justify-between items-center p-4">
                <div>
                  <p className="font-medium">{session.student?.full_name || 'Unknown Student'}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(session.scheduled_at).toLocaleString()}
                  </p>
                  <p className={`text-xs ${
                    callStatus === 'in-progress' ? 'text-green-600' :
                    callStatus === 'ready' ? 'text-yellow-600' :
                    'text-gray-400'
                  }`}>
                    {callStatus === 'in-progress' ? 'In progress' :
                     callStatus === 'ready' ? 'Waiting for instructor' :
                     callStatus === 'scheduled' ? 'Scheduled' : 'Expired'}
                  </p>
                </div>
                {canJoin && (
                  <button onClick={() => navigate(`/call/${session.id}`)} className="btn-primary text-sm">
                    Join Call
                  </button>
                )}
                {callStatus === 'scheduled' && (
                  <span className="text-gray-400 text-sm">Upcoming</span>
                )}
                {callStatus === 'expired' && (
                  <span className="text-gray-400 text-sm">Expired</span>
                )}
              </GlassCard>
            );
          })}
        </div>
      )}
    </AdminLayout>
  );
}