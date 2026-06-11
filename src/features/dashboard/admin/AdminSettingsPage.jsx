import { useState, useEffect } from 'react';
import { supabase } from '@/config/supabase';
import AdminLayout from './AdminLayout';
import GlassCard from '@/shared/components/GlassCard';
import PrimaryButton from '@/shared/components/PrimaryButton';

const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const [days, setDays] = useState([]);
  const [from, setFrom] = useState('09:00');
  const [to, setTo] = useState('17:00');
  const [duration, setDuration] = useState(60);
  const [maxSlots, setMaxSlots] = useState(1);

  useEffect(() => {
    async function fetchSettings() {
      const { data } = await supabase.from('admin_settings').select('*').single();
      if (data) {
        setSettings(data);
        setDays(data.available_days || [1,2,3,4,5]);
        setFrom(data.available_from.slice(0,5));
        setTo(data.available_to.slice(0,5));
        setDuration(data.slot_duration_minutes);
        setMaxSlots(data.max_concurrent_slots);
      }
      setLoading(false);
    }
    fetchSettings();
  }, []);

  const toggleDay = (dayIdx) => {
    setDays(prev =>
      prev.includes(dayIdx)
        ? prev.filter(d => d !== dayIdx)
        : [...prev, dayIdx].sort()
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');

    const { error } = await supabase
      .from('admin_settings')
      .update({
        available_days: days,
        available_from: from,
        available_to: to,
        slot_duration_minutes: duration,
        max_concurrent_slots: maxSlots,
      })
      .eq('id', settings.id);

    if (error) {
      setMessage('Failed to save: ' + error.message);
    } else {
      setMessage('✅ Settings saved.');
    }
    setSaving(false);
    setTimeout(() => setMessage(''), 3000);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-brand-rose-200 border-t-brand-rose-600" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <h2 className="text-3xl font-display font-semibold mb-6">Call Availability Settings</h2>
      <GlassCard className="p-6 max-w-lg">
        <div className="space-y-5">
          {/* Available days */}
          <div>
            <label className="block text-sm font-medium mb-2">Available Days</label>
            <div className="flex gap-2 flex-wrap">
              {DAYS.map((day, idx) => {
                const active = days.includes(idx);
                return (
                  <button
                    key={idx}
                    onClick={() => toggleDay(idx)}
                    className={`px-3 py-2 rounded-full text-xs font-semibold border transition ${
                      active
                        ? 'bg-brand-rose-600 text-white border-brand-rose-600'
                        : 'bg-white text-gray-500 border-brand-rose-200 hover:bg-brand-rose-50'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Available From</label>
              <input
                type="time"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full px-3 py-2 border border-brand-rose-200/40 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Available To</label>
              <input
                type="time"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full px-3 py-2 border border-brand-rose-200/40 rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Slot Duration (min)</label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value) || 60)}
                min={15}
                max={180}
                step={15}
                className="w-full px-3 py-2 border border-brand-rose-200/40 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Max Concurrent Calls</label>
              <input
                type="number"
                value={maxSlots}
                onChange={(e) => setMaxSlots(parseInt(e.target.value) || 1)}
                min={1}
                max={10}
                className="w-full px-3 py-2 border border-brand-rose-200/40 rounded-xl"
              />
            </div>
          </div>

          {message && (
            <p className={`text-sm ${message.startsWith('✅') ? 'text-green-600' : 'text-red-500'}`}>
              {message}
            </p>
          )}

          <PrimaryButton onClick={handleSave} loading={saving}>
            Save Settings
          </PrimaryButton>
        </div>
      </GlassCard>
    </AdminLayout>
  );
}