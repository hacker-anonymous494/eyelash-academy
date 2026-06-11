import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/config/supabase';
import GlassCard from '@/shared/components/GlassCard';
import PageTransition from '@/shared/components/PageTransition';
import { useAuth } from '@/features/auth/hooks/useAuth';

export default function StudentCallsPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchSessions() {
      const { data } = await supabase
        .from('video_call_sessions')
        .select('*')
        .eq('student_id', user.id)
        .order('scheduled_at', { ascending: false });
      setSessions(data || []);
      setLoading(false);
    }
    if (user) fetchSessions();
  }, [user]);

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
            <p className="text-gray-500">No scheduled calls.</p>
            <Link to="/dashboard/book-call" className="btn-primary mt-4 inline-block">
              Schedule your first session
            </Link>
          </GlassCard>
        ) : (
          <div className="space-y-4">
            {sessions.map((s) => (
              <GlassCard key={s.id} className="flex justify-between items-center p-4">
                <div>
                  <p className="font-medium">{new Date(s.scheduled_at).toLocaleString()}</p>
                  <p className={`text-sm ${s.status === 'active' || s.room_ready ? 'text-green-600 font-semibold' : 'text-gray-500'}`}>
                    {s.room_ready ? 'Instructor is waiting – join now!' : s.status}
                  </p>
                </div>
                {(s.status === 'scheduled' || s.room_ready || s.status === 'active') && (
                  <button onClick={() => navigate(`/call/${s.id}`)} className="btn-primary text-sm">
                    {s.room_ready ? 'Join Now' : 'Join Call'}
                  </button>
                )}
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}