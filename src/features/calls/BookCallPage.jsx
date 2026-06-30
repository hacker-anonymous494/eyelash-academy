import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/config/supabase';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { requestNotificationPermission } from '@/lib/notifications';
import { S, PageShell } from '@/features/dashboard/student/dashboardShared';

function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(m) {
  const h = Math.floor(m / 60).toString().padStart(2, '0');
  const min = (m % 60).toString().padStart(2, '0');
  return `${h}:${min}`;
}

export default function BookCallPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [settings, setSettings] = useState(null);
  const [existingSessions, setExistingSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [note, setNote] = useState('');
  const [booking, setBooking] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [bookedTime, setBookedTime] = useState(null);

  useEffect(() => {
    async function fetchData() {
      const { data: settingsData } = await supabase.from('admin_settings').select('*').single();
      setSettings(settingsData);

      const { data: sessions } = await supabase
        .from('video_call_sessions')
        .select('scheduled_at, duration_minutes')
        .not('status', 'eq', 'ended')
        .order('scheduled_at');

      setExistingSessions(sessions || []);
      setLoading(false);
    }
    fetchData();
  }, []);

  const getAvailableSlots = () => {
    if (!settings || !selectedDate) return [];

    const dateObj = new Date(selectedDate + 'T00:00:00');
    const dayOfWeek = dateObj.getDay();

    if (!settings.available_days.includes(dayOfWeek)) return [];

    const fromMin = timeToMinutes(settings.available_from);
    const toMin = timeToMinutes(settings.available_to);
    const duration = settings.slot_duration_minutes;

    const busyIntervals = existingSessions.map(s => {
      const start = new Date(s.scheduled_at);
      const end = new Date(start.getTime() + (s.duration_minutes || 60) * 60000);
      return { start, end };
    });

    const slots = [];
    for (let start = fromMin; start + duration <= toMin; start += duration) {
      const slotStart = new Date(`${selectedDate}T${minutesToTime(start)}:00`);
      const slotEnd = new Date(slotStart.getTime() + duration * 60000);

      const overlaps = busyIntervals.some(
        iv => slotStart < iv.end && slotEnd > iv.start
      );

      if (!overlaps && slotStart > new Date()) {
        slots.push(minutesToTime(start));
      }
    }
    return slots;
  };

  const availableSlots = getAvailableSlots();

  const handleBook = async () => {
    if (!selectedDate || !selectedTime) {
      setError('Please select a date and time.');
      return;
    }
    setBooking(true);
    setError('');

    if ('Notification' in window && Notification.permission === 'default') {
      await requestNotificationPermission();
    }

    const scheduledAt = new Date(`${selectedDate}T${selectedTime}:00`).toISOString();

    // Insert and get the new session's ID
    const { data: newSession, error: insertErr } = await supabase
      .from('video_call_sessions')
      .insert({
        student_id: user.id,
        scheduled_at: scheduledAt,
        status: 'scheduled',
        duration_minutes: settings.slot_duration_minutes || 60,
      })
      .select('id')
      .single();

    if (insertErr) {
      setError('Failed to book: ' + insertErr.message);
      setBooking(false);
      return;
    }

    // Call Netlify function to send email notification
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      await fetch('/.netlify/functions/notify-call-booking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authSession.access_token}`,
        },
        body: JSON.stringify({ sessionId: newSession.id }),
      });
    } catch (e) {
      // email notification failure is non-critical
      console.warn('Failed to trigger booking email:', e);
    }

    setBookedTime(new Date(scheduledAt));
    setSuccess(true);
    setBooking(false);
  };

  if (success) {
    return (
      <PageShell maxWidth={560}>
        <div style={{ background: S.cardBg, border: `1px solid ${S.cardBorder}`, borderRadius: S.cardRadius, padding: '52px 40px', textAlign: 'center', boxShadow: S.cardShadow }}>
          <div style={{ fontSize: 52, marginBottom: 20 }}>✅</div>
          <h2 style={{ fontFamily: S.fontDisplay, fontSize: 28, fontWeight: 600, color: S.textPrimary, margin: '0 0 10px' }}>
            Session Booked!
          </h2>
          <p style={{ fontFamily: S.fontBody, fontSize: 14, color: S.textMuted, margin: '0 0 8px', lineHeight: 1.6 }}>
            Your 1‑on‑1 session has been scheduled for
          </p>
          <p style={{ fontFamily: S.fontDisplay, fontSize: 20, fontWeight: 600, color: S.rose, margin: '0 0 28px' }}>
            {bookedTime?.toLocaleString([], { weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/dashboard/calls')} style={{ background: S.roseGrad, color: 'white', border: 'none', borderRadius: 100, padding: '11px 28px', cursor: 'pointer', fontFamily: S.fontBody, fontSize: 14, fontWeight: 500, boxShadow: '0 4px 16px rgba(200,64,112,0.3)' }}>
              View My Calls
            </button>
            <button onClick={() => { setSuccess(false); setSelectedDate(''); setSelectedTime(''); setNote(''); }} style={{ background: 'transparent', color: S.rose, border: `1px solid ${S.roseBorder}`, borderRadius: 100, padding: '11px 24px', cursor: 'pointer', fontFamily: S.fontBody, fontSize: 14 }}>
              Book Another
            </button>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell maxWidth={560}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: S.fontDisplay, fontSize: 'clamp(24px,4vw,36px)', fontWeight: 600, color: S.textPrimary, margin: 0 }}>
          Book a 1‑on‑1 Session
        </h1>
        <p style={{ fontFamily: S.fontBody, fontSize: 13, color: S.textMuted, margin: '6px 0 0' }}>
          Choose a date and an available time slot. Sessions are {settings?.slot_duration_minutes || 60} minutes.
        </p>
      </div>

      <div style={{ background: S.cardBg, border: `1px solid ${S.cardBorder}`, borderRadius: S.cardRadius, padding: '28px', boxShadow: S.cardShadow }}>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-brand-rose-200 border-t-brand-rose-600" />
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => { setSelectedDate(e.target.value); setSelectedTime(''); }}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-brand-rose-200/40 rounded-xl"
              />
            </div>

            {selectedDate && (
              <div>
                <label className="block text-sm font-medium mb-1">Available Times</label>
                {availableSlots.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    {settings.available_days.includes(new Date(selectedDate + 'T00:00:00').getDay())
                      ? 'No slots available on this date. All times are fully booked.'
                      : 'The admin is not available on this day.'}
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {availableSlots.map(time => (
                      <button
                        key={time}
                        onClick={() => setSelectedTime(time)}
                        className={`px-3 py-2 rounded-xl text-sm font-semibold border transition ${
                          selectedTime === time
                            ? 'bg-brand-rose-600 text-white border-brand-rose-600'
                            : 'bg-white text-gray-600 border-brand-rose-200 hover:bg-brand-rose-50'
                        }`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">What do you want to cover? (optional)</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. I need feedback on my volume fan technique…"
                rows={3}
                maxLength={300}
                className="w-full px-3 py-2 border border-brand-rose-200/40 rounded-xl resize-y"
                style={{ fontFamily: S.fontBody, fontSize: 14, color: S.textPrimary }}
              />
            </div>

            {error && (
              <p className="text-sm text-red-500">⚠️ {error}</p>
            )}

            <button
              onClick={handleBook}
              disabled={booking || !selectedDate || !selectedTime}
              className="w-full py-3 rounded-full text-white font-semibold transition disabled:opacity-50"
              style={{
                background: booking || !selectedDate || !selectedTime
                  ? '#f0e0e8'
                  : 'linear-gradient(135deg,#c84070,#f07090)',
                cursor: booking || !selectedDate || !selectedTime ? 'not-allowed' : 'pointer',
              }}
            >
              {booking ? 'Booking…' : 'Confirm Booking'}
            </button>
          </div>
        )}
      </div>
    </PageShell>
  );
}