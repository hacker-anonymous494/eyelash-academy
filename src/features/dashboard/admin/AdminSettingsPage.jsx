/**
 * AdminSettingsPage.jsx — Call Availability & Platform Settings
 * Fully redesigned with the admin design system (adminShared.js).
 * Responsive, modern, complete.
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/config/supabase';
import AdminLayout from './AdminLayout';
import { A, Card, Btn, Field, Input, Select, Toast, PageHeader, Spinner } from './adminShared.jsx';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ title, subtitle, children }) {
  return (
    <Card style={{ overflow: 'hidden', marginBottom: 20 }}>
      <div style={{
        padding: '16px 22px',
        borderBottom: `1px solid ${A.cardBorder}`,
        background: 'rgba(200,64,112,0.025)',
      }}>
        <h3 style={{ fontFamily: A.fontDisplay, fontSize: 20, fontWeight: 600, color: A.textPrimary, margin: 0 }}>{title}</h3>
        {subtitle && <p style={{ fontFamily: A.fontBody, fontSize: 12.5, color: A.textMuted, margin: '3px 0 0' }}>{subtitle}</p>}
      </div>
      <div style={{ padding: '22px' }}>{children}</div>
    </Card>
  );
}

// ─── Day toggle button ────────────────────────────────────────────────────────
function DayBtn({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 48, height: 48, borderRadius: 12,
        background: active ? A.roseGrad : 'white',
        color: active ? 'white' : A.textMuted,
        border: active ? 'none' : `1px solid ${A.cardBorder}`,
        cursor: 'pointer', fontFamily: A.fontBody, fontSize: 12, fontWeight: 600,
        boxShadow: active ? '0 3px 12px rgba(200,64,112,0.32)' : 'none',
        transition: 'all 0.2s',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = A.roseBg; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'white'; }}
    >
      {label}
    </button>
  );
}

// ─── Time input ───────────────────────────────────────────────────────────────
function TimeInput({ label, value, onChange, hint }) {
  return (
    <Field label={label} hint={hint}>
      <input
        type="time"
        value={value}
        onChange={onChange}
        style={{
          width: '100%', fontFamily: A.fontBody, fontSize: 14, color: A.textPrimary,
          background: 'white', border: `1px solid ${A.cardBorder}`,
          borderRadius: 9, padding: '9px 13px', outline: 'none',
          boxSizing: 'border-box', transition: 'border-color 0.2s',
          cursor: 'pointer',
        }}
        onFocus={e => { e.target.style.borderColor = 'rgba(200,64,112,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(200,64,112,0.08)'; }}
        onBlur={e => { e.target.style.borderColor = A.cardBorder; e.target.style.boxShadow = 'none'; }}
      />
    </Field>
  );
}

// ─── Number stepper ───────────────────────────────────────────────────────────
function NumberStepper({ label, value, onChange, min = 1, max = 999, step = 1, hint }) {
  return (
    <Field label={label} hint={hint}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
        <button
          onClick={() => onChange(Math.max(min, value - step))}
          style={{
            width: 38, height: 38, border: `1px solid ${A.cardBorder}`, borderRight: 'none',
            borderRadius: '9px 0 0 9px', background: 'white', cursor: 'pointer',
            fontFamily: A.fontBody, fontSize: 18, color: A.textMuted, display: 'flex',
            alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}
        >−</button>
        <input
          type="number"
          value={value}
          min={min} max={max} step={step}
          onChange={e => onChange(parseInt(e.target.value) || min)}
          style={{
            flex: 1, textAlign: 'center', fontFamily: A.fontBody, fontSize: 14, fontWeight: 600,
            color: A.textPrimary, background: 'white',
            border: `1px solid ${A.cardBorder}`, padding: '9px 4px', outline: 'none',
            MozAppearance: 'textfield',
          }}
        />
        <button
          onClick={() => onChange(Math.min(max, value + step))}
          style={{
            width: 38, height: 38, border: `1px solid ${A.cardBorder}`, borderLeft: 'none',
            borderRadius: '0 9px 9px 0', background: 'white', cursor: 'pointer',
            fontFamily: A.fontBody, fontSize: 18, color: A.textMuted, display: 'flex',
            alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}
        >+</button>
      </div>
    </Field>
  );
}

// ─── AdminSettingsPage ────────────────────────────────────────────────────────
export default function AdminSettingsPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  // Availability state
  const [days, setDays] = useState([1, 2, 3, 4, 5]);
  const [from, setFrom] = useState('09:00');
  const [to, setTo] = useState('17:00');
  const [duration, setDuration] = useState(60);
  const [maxSlots, setMaxSlots] = useState(1);

  // Buffer (break between sessions)
  const [buffer, setBuffer] = useState(15);

  useEffect(() => {
    async function fetchSettings() {
      const { data, error } = await supabase.from('admin_settings').select('*').single();
      if (data) {
        setSettings(data);
        setDays(data.available_days || [1, 2, 3, 4, 5]);
        setFrom((data.available_from || '09:00').slice(0, 5));
        setTo((data.available_to || '17:00').slice(0, 5));
        setDuration(data.slot_duration_minutes || 60);
        setMaxSlots(data.max_concurrent_slots || 1);
        setBuffer(data.buffer_minutes || 15);
      } else if (!error || error.code === 'PGRST116') {
        // No settings row yet — use defaults, will upsert on save
      }
      setLoading(false);
    }
    fetchSettings();
  }, []);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      available_days: days,
      available_from: from,
      available_to: to,
      slot_duration_minutes: duration,
      max_concurrent_slots: maxSlots,
      buffer_minutes: buffer,
    };

    let error;
    if (settings?.id) {
      ({ error } = await supabase.from('admin_settings').update(payload).eq('id', settings.id));
    } else {
      const { data: inserted, error: insertErr } = await supabase.from('admin_settings').insert(payload).select().single();
      error = insertErr;
      if (inserted) setSettings(inserted);
    }

    if (error) {
      showToast('Failed to save: ' + error.message, 'error');
    } else {
      showToast('Settings saved successfully! ✓');
    }
    setSaving(false);
  };

  const toggleDay = (idx) => {
    setDays(prev =>
      prev.includes(idx) ? prev.filter(d => d !== idx) : [...prev, idx].sort()
    );
  };

  // Compute total bookable hours per week
  const dailyHours = (() => {
    const [fh, fm] = from.split(':').map(Number);
    const [th, tm] = to.split(':').map(Number);
    const totalMins = (th * 60 + tm) - (fh * 60 + fm);
    if (totalMins <= 0) return 0;
    const slotsPerDay = Math.floor(totalMins / (duration + buffer));
    return (slotsPerDay * duration / 60).toFixed(1);
  })();
  const slotsPerDay = (() => {
    const [fh, fm] = from.split(':').map(Number);
    const [th, tm] = to.split(':').map(Number);
    const totalMins = (th * 60 + tm) - (fh * 60 + fm);
    if (totalMins <= 0) return 0;
    return Math.floor(totalMins / (duration + buffer));
  })();

  return (
    <AdminLayout>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <PageHeader
          title="Settings"
          subtitle="Configure call availability, session duration, and scheduling preferences."
          action={
            <Btn variant="primary" onClick={handleSave} loading={saving}>
              {saving ? 'Saving…' : '✓ Save Settings'}
            </Btn>
          }
        />

        {toast && <Toast msg={toast.msg} type={toast.type} onDismiss={() => setToast(null)} />}

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}>
            <Spinner size={40} />
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>

            {/* Availability days */}
            <Section
              title="Available Days"
              subtitle="Days of the week when students can book a session"
            >
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {DAYS.map((day, idx) => (
                  <DayBtn key={idx} label={day} active={days.includes(idx)} onClick={() => toggleDay(idx)} />
                ))}
              </div>
              {days.length === 0 && (
                <p style={{ fontFamily: A.fontBody, fontSize: 12.5, color: '#e74c3c', marginTop: 10 }}>
                  ⚠️ Select at least one available day.
                </p>
              )}
            </Section>

            {/* Time range */}
            <Section
              title="Working Hours"
              subtitle="Set the daily time window during which sessions can be booked"
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <TimeInput
                  label="Available from"
                  value={from}
                  onChange={e => setFrom(e.target.value)}
                  hint="Start of bookable window"
                />
                <TimeInput
                  label="Available until"
                  value={to}
                  onChange={e => setTo(e.target.value)}
                  hint="End of bookable window"
                />
              </div>
            </Section>

            {/* Session settings */}
            <Section
              title="Session Settings"
              subtitle="Duration, buffer time between sessions, and max concurrent calls"
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 20 }}>
                <NumberStepper
                  label="Session duration (min)"
                  value={duration}
                  onChange={setDuration}
                  min={15} max={180} step={15}
                  hint="e.g. 30, 45, 60, 90 minutes"
                />
                <NumberStepper
                  label="Buffer between sessions (min)"
                  value={buffer}
                  onChange={setBuffer}
                  min={0} max={60} step={5}
                  hint="Cool-down time between calls"
                />
                <NumberStepper
                  label="Max concurrent calls"
                  value={maxSlots}
                  onChange={setMaxSlots}
                  min={1} max={10} step={1}
                  hint="Simultaneous sessions allowed"
                />
              </div>

              {/* Capacity preview */}
              <div style={{
                marginTop: 22, padding: '14px 18px',
                background: 'linear-gradient(135deg, rgba(200,64,112,0.05), rgba(248,112,150,0.03))',
                border: `1px solid ${A.roseBorder}`, borderRadius: 10,
                display: 'flex', gap: 28, flexWrap: 'wrap',
              }}>
                {[
                  { label: 'Slots per day', value: slotsPerDay },
                  { label: 'Teaching hours / day', value: `${dailyHours}h` },
                  { label: 'Slots per week', value: slotsPerDay * days.length },
                  { label: 'Active days / week', value: days.length },
                ].map(s => (
                  <div key={s.label}>
                    <p style={{ fontFamily: A.fontDisplay, fontSize: 24, fontWeight: 600, color: A.rose, margin: 0, lineHeight: 1 }}>{s.value}</p>
                    <p style={{ fontFamily: A.fontBody, fontSize: 11, color: A.textMuted, margin: '3px 0 0' }}>{s.label}</p>
                  </div>
                ))}
              </div>
            </Section>

            {/* Notification settings (informational) */}
            <Section
              title="Notifications"
              subtitle="How and when you'll be alerted about student activity"
            >
              {[
                { emoji: '📅', title: 'New booking', desc: 'Browser notification + sound plays when a student books a session.' },
                { emoji: '📞', title: 'Call room ready', desc: 'Students receive a notification + toast when you join the call room.' },
                { emoji: '💬', title: 'New chat message', desc: 'Browser notification fires when a student sends a message and the tab is not in focus.' },
              ].map((item, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 14,
                  padding: '12px 0',
                  borderBottom: i < 2 ? `1px solid ${A.cardBorder}` : 'none',
                }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                    background: A.roseBg, border: `1px solid ${A.roseBorder}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17,
                  }}>{item.emoji}</div>
                  <div>
                    <p style={{ fontFamily: A.fontBody, fontSize: 13, fontWeight: 600, color: A.textPrimary, margin: 0 }}>{item.title}</p>
                    <p style={{ fontFamily: A.fontBody, fontSize: 12.5, color: A.textMuted, margin: '2px 0 0', lineHeight: 1.5 }}>{item.desc}</p>
                  </div>
                  <div style={{
                    marginLeft: 'auto', flexShrink: 0,
                    display: 'flex', alignItems: 'center', gap: 6,
                    fontFamily: A.fontBody, fontSize: 11,
                    color: A.green, background: A.greenBg, border: `1px solid ${A.greenBorder}`,
                    borderRadius: 100, padding: '3px 10px',
                  }}>
                    ✓ Active
                  </div>
                </div>
              ))}
              <p style={{ fontFamily: A.fontBody, fontSize: 12, color: A.textMuted, marginTop: 14, lineHeight: 1.5 }}>
                💡 Browser notifications require the user to grant permission. A prompt appears automatically on the Calls and Chat pages.
              </p>
            </Section>

            {/* Save button bottom */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingBottom: 40 }}>
              <Btn variant="primary" size="lg" onClick={handleSave} loading={saving}>
                {saving ? 'Saving…' : '✓ Save All Settings'}
              </Btn>
            </div>

          </motion.div>
        )}
      </div>
    </AdminLayout>
  );
}