import { useState, useEffect } from 'react';
import { supabase } from '@/config/supabase';
import { useAuth } from '@/features/auth/hooks/useAuth';
import GlassCard from '@/shared/components/GlassCard';
import PrimaryButton from '@/shared/components/PrimaryButton';
import PageTransition from '@/shared/components/PageTransition';

export default function SettingsPage() {
  const { user, profile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
    }
  }, [profile]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from('profiles').update({ full_name: fullName, phone }).eq('id', user.id);
    if (error) {
      setMessage('Failed to save: ' + error.message);
    } else {
      setMessage('✅ Profile updated successfully.');
    }
    setSaving(false);
  };

  return (
    <PageTransition>
      <div className="max-w-xl mx-auto">
        <h2 className="text-2xl font-display font-semibold mb-6">Account Settings</h2>
        <GlassCard className="p-6">
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input value={user?.email || ''} disabled className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed" />
              <p className="text-xs text-gray-400 mt-1">Email cannot be changed.</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Full Name</label>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full px-3 py-2 border border-brand-rose-200/40 rounded-xl" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone (optional)</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-3 py-2 border border-brand-rose-200/40 rounded-xl" />
            </div>
            {message && <p className={`text-sm ${message.startsWith('✅') ? 'text-green-600' : 'text-red-500'}`}>{message}</p>}
            <PrimaryButton type="submit" loading={saving}>Save Changes</PrimaryButton>
          </form>
        </GlassCard>
      </div>
    </PageTransition>
  );
}