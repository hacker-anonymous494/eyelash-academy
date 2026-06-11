/**
 * AdminCallsPage.jsx
 *
 * FIXES:
 * 1. Admin gets browser notification when a student books a new call.
 *    Uses a Supabase INSERT listener on video_call_sessions (no filter = all rows).
 *    Requests notification permission proactively via a banner.
 * 2. Shows ALL sessions (scheduled + active + recent ended), not just future ones.
 *    Admin needs to see past scheduled calls that may still be joinable.
 * 3. Real-time updates via Supabase subscription — page auto-refreshes when
 *    sessions change (new bookings, status changes).
 * 4. "Join Call" available for any non-ended session regardless of scheduled_at.
 *    Admin should always be able to join a session the student booked.
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/config/supabase';
import AdminLayout from '@/features/dashboard/admin/AdminLayout';
import { requestNotificationPermission, sendNotification, playCallSound } from '@/lib/notifications';

const F = {
  display: "'Cormorant Garamond','Playfair Display',Georgia,serif",
  body: "'DM Sans',system-ui,sans-serif",
};

function statusLabel(s) {
  if (s.status === 'ended') return { text: 'Ended', color: '#9a9a9a', bg: 'rgba(150,150,150,0.08)' };
  if (s.room_ready) return { text: '🔴 Live — in progress', color: '#2ecc71', bg: 'rgba(46,204,113,0.1)' };
  const now = new Date();
  const scheduled = new Date(s.scheduled_at);
  if (now >= scheduled) return { text: 'Ready to start', color: '#f0c030', bg: 'rgba(240,192,48,0.1)' };
  return { text: 'Upcoming', color: '#5dade2', bg: 'rgba(93,173,226,0.1)' };
}

function canJoin(s) {
  return s.status !== 'ended';
}

function SessionCard({ session, onJoin, index }) {
  const { text, color, bg } = statusLabel(session);
  const dt = new Date(session.scheduled_at);
  const isLive = session.room_ready;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      style={{
        background: isLive ? 'rgba(46,204,113,0.05)' : 'rgba(255,255,255,0.96)',
        border: isLive ? '1.5px solid rgba(46,204,113,0.3)' : '1px solid rgba(200,64,112,0.12)',
        borderRadius: 16, padding: '18px 22px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
        boxShadow: isLive ? '0 4px 20px rgba(46,204,113,0.12)' : '0 2px 12px rgba(180,60,90,0.06)',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
        {/* Avatar */}
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: 'linear-gradient(135deg,#c84070,#f07090)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: F.display, fontSize: 18, fontWeight: 600, color: 'white',
        }}>
          {(session.student?.full_name || '?')[0].toUpperCase()}
        </div>

        <div style={{ minWidth: 0 }}>
          <p style={{ fontFamily: F.body, fontSize: 14, fontWeight: 600, color: '#1a0810', margin: 0 }}>
            {session.student?.full_name || 'Unknown Student'}
          </p>
          <p style={{ fontFamily: F.body, fontSize: 12, color: '#9a6878', margin: '2px 0 0' }}>
            {dt.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <span style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color, background: bg, borderRadius: 100, padding: '3px 10px' }}>
              {text}
            </span>
            {session.joined_by?.length > 0 && (
              <span style={{ fontFamily: F.body, fontSize: 11, color: '#9a6878' }}>
                {session.joined_by.length} joined
              </span>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
        {canJoin(session) && (
          <button
            onClick={() => onJoin(session.id)}
            style={{
              background: isLive ? 'linear-gradient(135deg,#27ae60,#2ecc71)' : 'linear-gradient(135deg,#c84070,#f07090)',
              color: 'white', border: 'none', borderRadius: 100,
              padding: '10px 22px', cursor: 'pointer',
              fontFamily: F.body, fontSize: 13, fontWeight: 600,
              boxShadow: isLive ? '0 3px 12px rgba(46,204,113,0.4)' : '0 3px 12px rgba(200,64,112,0.35)',
              transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 6,
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}
          >
            {isLive ? '🔴' : '📞'} {isLive ? 'Join Now' : 'Start Call'}
          </button>
        )}
        {session.status === 'ended' && (
          <span style={{ fontFamily: F.body, fontSize: 12, color: '#9a9a9a' }}>Ended</span>
        )}
      </div>
    </motion.div>
  );
}

export default function AdminCallsPage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNotifBanner, setShowNotifBanner] = useState(false);
  const [filter, setFilter] = useState('active'); // active | all
  const navigate = useNavigate();
  const notifBannerShownRef = useRef(false);

  // Show notification permission banner if not granted
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default' && !notifBannerShownRef.current) {
      notifBannerShownRef.current = true;
      setShowNotifBanner(true);
    }
  }, []);

  // Fetch sessions
  const fetchSessions = async () => {
    const { data } = await supabase
      .from('video_call_sessions')
      .select('*, student:profiles!video_call_sessions_student_id_fkey(full_name, avatar_url)')
      .order('scheduled_at', { ascending: false })
      .limit(50);
    setSessions(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  // Real-time updates: new bookings + status changes
  useEffect(() => {
    const channel = supabase
      .channel('admin_calls_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'video_call_sessions' }, (payload) => {
        // A student just booked a call → notify admin
        const s = payload.new;
        setSessions(prev => [{ ...s, student: null }, ...prev]);

        // Fetch student name for the new session
        supabase.from('profiles').select('full_name').eq('id', s.student_id).single()
          .then(({ data }) => {
            setSessions(prev => prev.map(sess =>
              sess.id === s.id ? { ...sess, student: data } : sess
            ));
          });

        // Notify admin
        playCallSound();
        sendNotification('📅 New Call Booked!', {
          body: `A student has scheduled a 1-on-1 session for ${new Date(s.scheduled_at).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
          tag: `booking-${s.id}`,
          requireInteraction: true,
        });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'video_call_sessions' }, (payload) => {
        setSessions(prev => prev.map(s => s.id === payload.new.id ? { ...s, ...payload.new } : s));
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const handleJoin = (sessionId) => {
    navigate(`/call/${sessionId}`);
  };

  const displayed = filter === 'active'
    ? sessions.filter(s => s.status !== 'ended')
    : sessions;

  return (
    <AdminLayout>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Notification permission banner */}
      {showNotifBanner && (
        <div style={{
          background: 'rgba(200,64,112,0.07)', border: '1px solid rgba(200,64,112,0.2)',
          borderRadius: 12, padding: '12px 18px', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 18 }}>🔔</span>
          <p style={{ fontFamily: F.body, fontSize: 13, color: '#4a2028', margin: 0, flex: 1, minWidth: 200 }}>
            Enable browser notifications to be alerted when a student books a new call.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={async () => {
                const granted = await requestNotificationPermission();
                setShowNotifBanner(false);
              }}
              style={{ background: 'linear-gradient(135deg,#c84070,#f07090)', color: 'white', border: 'none', borderRadius: 100, padding: '7px 18px', cursor: 'pointer', fontFamily: F.body, fontSize: 12, fontWeight: 500 }}>
              Enable
            </button>
            <button onClick={() => setShowNotifBanner(false)}
              style={{ background: 'transparent', color: '#9a6878', border: '1px solid rgba(200,64,112,0.2)', borderRadius: 100, padding: '7px 14px', cursor: 'pointer', fontFamily: F.body, fontSize: 12 }}>
              Later
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h2 style={{ fontFamily: F.display, fontSize: 32, fontWeight: 600, color: '#1a0810', margin: 0 }}>Video Call Sessions</h2>
          <p style={{ fontFamily: F.body, fontSize: 13, color: '#9a6878', margin: '4px 0 0' }}>
            {sessions.filter(s => s.status !== 'ended').length} active · {sessions.filter(s => s.room_ready).length} live now
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['active', 'all'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              fontFamily: F.body, fontSize: 12, fontWeight: 500,
              background: filter === f ? 'linear-gradient(135deg,#c84070,#f07090)' : 'transparent',
              color: filter === f ? 'white' : '#9a6878',
              border: filter === f ? 'none' : '1px solid rgba(200,64,112,0.2)',
              borderRadius: 100, padding: '7px 18px', cursor: 'pointer',
              boxShadow: filter === f ? '0 2px 10px rgba(200,64,112,0.3)' : 'none',
            }}>
              {f === 'active' ? 'Active' : 'All History'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid rgba(200,64,112,0.15)', borderTop: '3px solid #c84070', animation: 'spin 0.7s linear infinite' }} />
        </div>
      ) : displayed.length === 0 ? (
        <div style={{
          background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(200,64,112,0.12)',
          borderRadius: 16, padding: '48px 32px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 40, marginBottom: 14 }}>📅</div>
          <h3 style={{ fontFamily: F.display, fontSize: 22, color: '#1a0810', margin: '0 0 8px' }}>No sessions found</h3>
          <p style={{ fontFamily: F.body, fontSize: 13, color: '#9a6878', margin: 0 }}>
            {filter === 'active' ? 'No active or upcoming sessions.' : 'No sessions in history.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {displayed.map((session, i) => (
            <SessionCard key={session.id} session={session} onJoin={handleJoin} index={i} />
          ))}
        </div>
      )}
    </AdminLayout>
  );
}