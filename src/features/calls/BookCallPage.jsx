import { useState } from 'react';
import { supabase } from '@/config/supabase';
import GlassCard from '@/shared/components/GlassCard';
import PrimaryButton from '@/shared/components/PrimaryButton';
import { useAuth } from '@/features/auth/hooks/useAuth';

export default function BookCallPage() {
  const { user } = useAuth();
  const [date, setDate] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleBook = async () => {
    if (!date) return;
    setLoading(true);
    setMessage('');

    const { error } = await supabase.from('video_call_sessions').insert({
      student_id: user.id,          // ← This must be set
      scheduled_at: new Date(date).toISOString(),
      status: 'scheduled',
    });

    if (error) {
      setMessage('Failed to book: ' + error.message);
    } else {
      setMessage('✅ Session booked! Go to My Calls to view it.');
      setDate('');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <GlassCard className="p-6">
        <h2 className="text-2xl font-display font-semibold mb-4">Book a 1‑on‑1 Call</h2>
        <div className="space-y-4">
          <input
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2 border border-brand-rose-200/40 rounded-xl"
          />
          {message && (
            <p className={`text-sm ${message.includes('✅') ? 'text-green-600' : 'text-red-600'}`}>
              {message}
            </p>
          )}
          <PrimaryButton onClick={handleBook} loading={loading}>
            Schedule Call
          </PrimaryButton>
        </div>
      </GlassCard>
    </div>
  );
}