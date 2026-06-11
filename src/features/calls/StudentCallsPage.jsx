import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/config/supabase';
import GlassCard from '@/shared/components/GlassCard';
import PageTransition from '@/shared/components/PageTransition';
import { useAuth } from '@/features/auth/hooks/useAuth';

const GRACE_PERIOD_HOURS = 2; // How long after scheduled time the call remains joinable

export default function StudentCallsPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    async function fetchSessions() {
      const { data } = await supabase
        .from('video_call_sessions')
        .select('*')
        .eq('student_id', user.id)
        .order('scheduled_at', { ascending: false })
        .limit(20);

      if (data) {
        const now = new Date();
        // Keep sessions that are not ended and not too old
        const filtered = data.filter((s) => {
          if (s.status === 'ended') return false;
          const scheduled = new Date(s.scheduled_at);
          const deadline = new Date(scheduled.getTime() + GRACE_PERIOD_HOURS * 60 * 60 * 1000);
          // Show if the session is still within the grace period (or in the future)
          return now < deadline;
        });
        setSessions(filtered.slice(0, 5));
      }
      setLoading(false);
    }
    fetchSessions();
  }, [user]);

  const getCallStatus = (s) => {
    const now = new Date();
    const scheduled = new Date(s.scheduled_at);
    const deadline = new Date(scheduled.getTime() + GRACE_PERIOD_HOURS * 60 * 60 * 1000);

    if (s.status === 'ended') return { label: 'Ended', color: 'text-gray-400', joinable: false };
    if (s.room_ready) return { label: 'Instructor is waiting – join now!', color: 'text-green-600 font-semibold', joinable: true };
    if (now < scheduled) return { label: 'Scheduled', color: 'text-blue-500', joinable: false };
    if (now > deadline) return { label: 'Expired', color: 'text-gray-400', joinable: false };
    // Within grace period, not room_ready yet
    return { label: 'Ready to join', color: 'text-yellow-600', joinable: true };
  };

  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-display font-semibold">My Calls</h2>
          <Link to="/dashboard/book-call" className="btn-primary text-sm">
            + Book a Call
          </Link>
        </div>
        {loading ? (
          <div className="animate-spin h-10 w-10 border-4 border-brand-rose-200 border-t-brand-rose-600 rounded-full" />
        ) : sessions.length === 0 ? (
          <GlassCard className="p-8 text-center">
            <p className="text-gray-500">No upcoming calls.</p>
            <Link to="/dashboard/book-call" className="btn-primary mt-4 inline-block">
              Schedule your first session
            </Link>
          </GlassCard>
        ) : (
          <div className="space-y-4">
            {sessions.map((s) => {
              const { label, color, joinable } = getCallStatus(s);
              return (
                <GlassCard key={s.id} className="flex justify-between items-center p-4">
                  <div>
                    <p className="font-medium">
                      {new Date(s.scheduled_at).toLocaleString([], {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    <p className={`text-sm ${color}`}>{label}</p>
                  </div>
                  {joinable && (
                    <button
                      onClick={() => navigate(`/call/${s.id}`)}
                      className="btn-primary text-sm"
                    >
                      {s.room_ready ? 'Join Now' : 'Join Call'}
                    </button>
                  )}
                </GlassCard>
              );
            })}
          </div>
        )}
      </div>
    </PageTransition>
  );
}