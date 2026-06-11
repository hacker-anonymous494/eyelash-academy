import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/config/supabase';
import AdminLayout from '@/features/dashboard/admin/AdminLayout';
import GlassCard from '@/shared/components/GlassCard';

export default function AdminCallsPage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchSessions() {
      const { data, error } = await supabase
        .from('video_call_sessions')
        .select('*, student:profiles!video_call_sessions_student_id_fkey(full_name)')
        .order('scheduled_at', { ascending: false })
        .limit(20); // fetch more to filter locally

      if (error) {
        console.error('Error fetching sessions:', error);
        setSessions([]);
      } else {
        const now = new Date();
        // Filter out ended sessions and those older than 1 hour past scheduled time
        const filtered = (data || []).filter(s => {
          if (s.status === 'ended') return false;
          const scheduled = new Date(s.scheduled_at);
          // Allow sessions up to 2 hours after scheduled time (grace period)
          return scheduled > new Date(now.getTime() - 2 * 60 * 60 * 1000);
        });
        // Only keep the 10 most recent
        setSessions(filtered.slice(0, 10));
      }
      setLoading(false);
    }
    fetchSessions();
  }, []);

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
            const isActive = session.status === 'active' || session.room_ready;
            const canJoin = isActive || new Date(session.scheduled_at) <= new Date();
            return (
              <GlassCard key={session.id} className="flex justify-between items-center p-4">
                <div>
                  <p className="font-medium">{session.student?.full_name || 'Unknown Student'}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(session.scheduled_at).toLocaleString()}
                  </p>
                  <p className={`text-xs ${isActive ? 'text-green-600' : 'text-gray-400'}`}>
                    {session.status}
                  </p>
                </div>
                {canJoin && session.status !== 'ended' ? (
                  <button
                    onClick={() => navigate(`/call/${session.id}`)}
                    className="btn-primary text-sm"
                  >
                    Join Call
                  </button>
                ) : (
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