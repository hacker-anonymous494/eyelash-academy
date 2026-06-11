/**
 * BookCallPage.jsx — Redesigned with proper validation and beautiful UI
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/config/supabase';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { requestNotificationPermission } from '@/lib/notifications';
import { S, PageShell } from '@/features/dashboard/student/dashboardShared';

function Field({ label, hint, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={{ display: 'block', fontFamily: S.fontBody, fontSize: 13, fontWeight: 500, color: S.textSecondary, marginBottom: 6 }}>{label}</label>
      {children}
      {hint && <p style={{ fontFamily: S.fontBody, fontSize: 11, color: S.textMuted, margin: '4px 0 0' }}>{hint}</p>}
    </div>
  );
}

export default function BookCallPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Minimum booking time: 30 minutes from now
  const minDate = new Date(Date.now() + 30 * 60 * 1000).toISOString().slice(0, 16);

  const handleBook = async () => {
    if (!date) { setError('Please select a date and time.'); return; }
    if (new Date(date) < new Date(minDate)) { setError('Please select a time at least 30 minutes from now.'); return; }

    setLoading(true);
    setError('');

    // Request notification permission on this user gesture
    if ('Notification' in window && Notification.permission === 'default') {
      await requestNotificationPermission();
    }

    const { error: insertErr } = await supabase.from('video_call_sessions').insert({
      student_id: user.id,
      scheduled_at: new Date(date).toISOString(),
      status: 'scheduled',
      joined_by: [],
      room_ready: false,
    });

    if (insertErr) {
      setError('Failed to book: ' + insertErr.message);
    } else {
      setSuccess(true);
    }
    setLoading(false);
  };

  if (success) {
    return (
      <PageShell maxWidth={560}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{ background: S.cardBg, border: `1px solid ${S.cardBorder}`, borderRadius: S.cardRadius, padding: '52px 40px', textAlign: 'center', boxShadow: S.cardShadow }}
        >
          <div style={{ fontSize: 52, marginBottom: 20 }}>✅</div>
          <h2 style={{ fontFamily: S.fontDisplay, fontSize: 28, fontWeight: 600, color: S.textPrimary, margin: '0 0 10px' }}>
            Session Booked!
          </h2>
          <p style={{ fontFamily: S.fontBody, fontSize: 14, color: S.textMuted, margin: '0 0 8px', lineHeight: 1.6 }}>
            Your 1-on-1 session has been scheduled for
          </p>
          <p style={{ fontFamily: S.fontDisplay, fontSize: 20, fontWeight: 600, color: S.rose, margin: '0 0 28px' }}>
            {new Date(date).toLocaleString([], { weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
          <p style={{ fontFamily: S.fontBody, fontSize: 13, color: S.textMuted, margin: '0 0 28px', lineHeight: 1.6 }}>
            Your instructor will start the session and you'll receive a notification when they're ready.
            Make sure your browser notifications are enabled.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/dashboard/calls')} style={{ background: S.roseGrad, color: 'white', border: 'none', borderRadius: 100, padding: '11px 28px', cursor: 'pointer', fontFamily: S.fontBody, fontSize: 14, fontWeight: 500, boxShadow: '0 4px 16px rgba(200,64,112,0.3)' }}>
              View My Calls
            </button>
            <button onClick={() => { setSuccess(false); setDate(''); setNote(''); }} style={{ background: 'transparent', color: S.rose, border: `1px solid ${S.roseBorder}`, borderRadius: 100, padding: '11px 24px', cursor: 'pointer', fontFamily: S.fontBody, fontSize: 14 }}>
              Book Another
            </button>
          </div>
        </motion.div>
      </PageShell>
    );
  }

  return (
    <PageShell maxWidth={560}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: S.fontDisplay, fontSize: 'clamp(24px,4vw,36px)', fontWeight: 600, color: S.textPrimary, margin: 0 }}>
            Book a 1-on-1 Session
          </h1>
          <p style={{ fontFamily: S.fontBody, fontSize: 13, color: S.textMuted, margin: '6px 0 0' }}>
            Schedule a private video call with your instructor for personalised feedback.
          </p>
        </div>

        <div style={{ background: S.cardBg, border: `1px solid ${S.cardBorder}`, borderRadius: S.cardRadius, padding: '28px 28px', boxShadow: S.cardShadow }}>
          {/* Info banner */}
          <div style={{ background: 'rgba(200,64,112,0.05)', border: `1px solid ${S.roseBorder}`, borderRadius: 10, padding: '12px 16px', marginBottom: 24, display: 'flex', gap: 10 }}>
            <span style={{ flexShrink: 0, marginTop: 1 }}>💡</span>
            <p style={{ fontFamily: S.fontBody, fontSize: 12.5, color: S.textSecondary, margin: 0, lineHeight: 1.55 }}>
              Sessions last 30–60 minutes. Your instructor will join within a few minutes of the scheduled time.
              You'll receive a browser notification when they're ready.
            </p>
          </div>

          <Field label="Date & Time" hint={`Your timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`}>
            <input
              type="datetime-local"
              value={date}
              min={minDate}
              onChange={e => setDate(e.target.value)}
              style={{
                width: '100%', fontFamily: S.fontBody, fontSize: 14, color: S.textPrimary,
                background: 'rgba(255,255,255,0.9)', border: `1px solid ${S.cardBorder}`,
                borderRadius: 10, padding: '10px 14px', outline: 'none',
                boxSizing: 'border-box', transition: 'border-color 0.2s',
              }}
              onFocus={e => e.target.style.borderColor = 'rgba(200,64,112,0.5)'}
              onBlur={e => e.target.style.borderColor = S.cardBorder}
            />
          </Field>

          <Field label="What do you want to cover? (optional)" hint="This helps your instructor prepare for the session.">
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="e.g. I want feedback on my volume fan technique…"
              rows={3}
              maxLength={300}
              style={{
                width: '100%', fontFamily: S.fontBody, fontSize: 14, color: S.textPrimary,
                background: 'rgba(255,255,255,0.9)', border: `1px solid ${S.cardBorder}`,
                borderRadius: 10, padding: '10px 14px', outline: 'none', resize: 'vertical',
                boxSizing: 'border-box', lineHeight: 1.5, transition: 'border-color 0.2s',
              }}
              onFocus={e => e.target.style.borderColor = 'rgba(200,64,112,0.5)'}
              onBlur={e => e.target.style.borderColor = S.cardBorder}
            />
            <div style={{ textAlign: 'right', fontFamily: S.fontBody, fontSize: 10, color: S.textMuted, marginTop: 2 }}>{note.length}/300</div>
          </Field>

          {error && (
            <div style={{ background: 'rgba(231,76,60,0.07)', border: '1px solid rgba(231,76,60,0.25)', borderRadius: 10, padding: '10px 14px', marginBottom: 18 }}>
              <p style={{ fontFamily: S.fontBody, fontSize: 13, color: '#c0392b', margin: 0 }}>⚠️ {error}</p>
            </div>
          )}

          <button
            onClick={handleBook}
            disabled={loading || !date}
            style={{
              width: '100%', background: loading || !date ? '#f0e0e8' : S.roseGrad,
              color: loading || !date ? S.textMuted : 'white',
              border: 'none', borderRadius: 100, padding: '13px 28px', cursor: loading || !date ? 'not-allowed' : 'pointer',
              fontFamily: S.fontBody, fontSize: 15, fontWeight: 600,
              boxShadow: loading || !date ? 'none' : '0 4px 18px rgba(200,64,112,0.35)',
              transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {loading ? (
              <>
                <div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                Booking…
              </>
            ) : '📅 Confirm Booking'}
          </button>
        </div>
      </motion.div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </PageShell>
  );
}