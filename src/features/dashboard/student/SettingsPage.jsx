import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/config/supabase';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { S, PageShell, Skeleton, stagger } from './dashboardShared';

// ─── Section card ─────────────────────────────────────────────────────────────
function Section({ title, subtitle, children }) {
  return (
    <div style={{
      background: S.cardBg, border: `1px solid ${S.cardBorder}`,
      borderRadius: S.cardRadius, boxShadow: S.cardShadow, overflow: 'hidden',
    }}>
      <div style={{
        padding: '18px 24px', borderBottom: `1px solid ${S.cardBorder}`,
        background: 'rgba(200,64,112,0.02)',
      }}>
        <h3 style={{ fontFamily: S.fontDisplay, fontSize: 20, fontWeight: 600, color: S.textPrimary, margin: 0 }}>{title}</h3>
        {subtitle && <p style={{ fontFamily: S.fontBody, fontSize: 12.5, color: S.textMuted, margin: '3px 0 0' }}>{subtitle}</p>}
      </div>
      <div style={{ padding: '22px 24px' }}>
        {children}
      </div>
    </div>
  );
}

// ─── Form field ───────────────────────────────────────────────────────────────
function Field({ label, hint, children, required }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{
        display: 'flex', alignItems: 'center', gap: 4,
        fontFamily: S.fontBody, fontSize: 13, fontWeight: 500,
        color: S.textSecondary, marginBottom: 6,
      }}>
        {label}
        {required && <span style={{ color: S.rose, fontSize: 12 }}>*</span>}
      </label>
      {children}
      {hint && <p style={{ fontFamily: S.fontBody, fontSize: 11, color: S.textMuted, margin: '4px 0 0' }}>{hint}</p>}
    </div>
  );
}

// ─── Input ────────────────────────────────────────────────────────────────────
function Input({ value, onChange, type = 'text', placeholder, disabled, maxLength, required }) {
  const len = typeof value === 'string' ? value.length : 0;
  return (
    <div style={{ position: 'relative' }}>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={maxLength}
        required={required}
        style={{
          width: '100%', fontFamily: S.fontBody, fontSize: 14,
          color: disabled ? S.textMuted : S.textPrimary,
          background: disabled ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.9)',
          border: `1px solid ${S.cardBorder}`,
          borderRadius: 10, padding: maxLength ? '10px 52px 10px 14px' : '10px 14px',
          outline: 'none', cursor: disabled ? 'not-allowed' : 'text',
          transition: 'border-color 0.2s, box-shadow 0.2s',
          boxSizing: 'border-box',
        }}
        onFocus={e => { e.target.style.borderColor = 'rgba(200,64,112,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(200,64,112,0.08)'; }}
        onBlur={e => { e.target.style.borderColor = S.cardBorder; e.target.style.boxShadow = 'none'; }}
      />
      {maxLength && !disabled && (
        <span style={{
          position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
          fontFamily: S.fontBody, fontSize: 10, color: len > maxLength * 0.9 ? S.rose : S.textMuted,
        }}>
          {len}/{maxLength}
        </span>
      )}
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, type }) {
  if (!msg) return null;
  const colors = { success: { bg: S.greenBg, border: 'rgba(46,204,113,0.3)', text: '#1a7a3a' }, error: { bg: 'rgba(231,76,60,0.08)', border: 'rgba(231,76,60,0.3)', text: '#c0392b' } };
  const c = colors[type] || colors.success;
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      style={{
        marginTop: 14, padding: '10px 16px',
        background: c.bg, border: `1px solid ${c.border}`,
        borderRadius: 10, fontFamily: S.fontBody, fontSize: 13, color: c.text,
      }}
    >
      {msg}
    </motion.div>
  );
}

// ─── Avatar uploader ──────────────────────────────────────────────────────────
function AvatarSection({ profile, userId, onUpdate }) {
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState(null);
  const fileRef = useRef(null);

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setToast({ msg: 'File must be under 2 MB', type: 'error' }); return; }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setToast({ msg: 'Only JPEG, PNG, or WebP accepted', type: 'error' }); return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `avatars/${userId}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      const avatar_url = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url })
        .eq('id', userId);

      if (updateError) throw updateError;
      onUpdate({ avatar_url });
      setToast({ msg: 'Profile photo updated!', type: 'success' });
    } catch (err) {
      setToast({ msg: `Upload failed: ${err.message}`, type: 'error' });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
      {/* Avatar display */}
      <div style={{ position: 'relative' }}>
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt="Profile"
            style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: `3px solid rgba(200,64,112,0.2)` }}
          />
        ) : (
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'linear-gradient(135deg,#c84070,#f07090)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: S.fontDisplay, fontSize: 28, fontWeight: 600, color: 'white',
            border: `3px solid rgba(200,64,112,0.15)`,
          }}>{initials}</div>
        )}
        {uploading && (
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{ width: 20, height: 20, border: '2px solid rgba(255,255,255,0.4)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          </div>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 200 }}>
        <p style={{ fontFamily: S.fontBody, fontSize: 14, fontWeight: 500, color: S.textPrimary, margin: '0 0 4px' }}>
          {profile?.full_name || 'Your Name'}
        </p>
        <p style={{ fontFamily: S.fontBody, fontSize: 12, color: S.textMuted, margin: '0 0 12px' }}>
          JPG, PNG, or WebP · max 2 MB
        </p>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          style={{
            background: S.roseBg, border: `1px solid ${S.roseBorder}`,
            color: S.rose, fontFamily: S.fontBody, fontSize: 12, fontWeight: 500,
            borderRadius: 100, padding: '7px 18px', cursor: uploading ? 'not-allowed' : 'pointer',
            opacity: uploading ? 0.6 : 1, transition: 'background 0.2s',
          }}
          onMouseEnter={e => { if (!uploading) e.currentTarget.style.background = 'rgba(200,64,112,0.12)'; }}
          onMouseLeave={e => e.currentTarget.style.background = S.roseBg}
        >
          {uploading ? 'Uploading…' : 'Change Photo'}
        </button>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} style={{ display: 'none' }} />
      </div>

      <AnimatePresence>
        {toast && (
          <div style={{ width: '100%' }}>
            <Toast msg={toast.msg} type={toast.type} />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Toggle ───────────────────────────────────────────────────────────────────
function Toggle({ checked, onChange }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        width: 44, height: 24, borderRadius: 12, cursor: 'pointer',
        background: checked ? S.roseGrad : 'rgba(0,0,0,0.12)',
        border: checked ? 'none' : '1px solid rgba(0,0,0,0.1)',
        position: 'relative', flexShrink: 0, transition: 'background 0.25s',
      }}
    >
      <div style={{
        position: 'absolute', top: 3, left: checked ? 23 : 3,
        width: 18, height: 18, borderRadius: '50%', background: 'white',
        boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
        transition: 'left 0.25s cubic-bezier(0.22,1,0.36,1)',
      }} />
    </div>
  );
}

// ─── Password section ─────────────────────────────────────────────────────────
function PasswordSection() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const showPass = (val) => {
    setToast({ msg: val, type: val.startsWith('✓') ? 'success' : 'error' });
    setTimeout(() => setToast(null), 3500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!next || !confirm) return showPass('Fill in all fields.');
    if (next.length < 8) return showPass('New password must be at least 8 characters.');
    if (next !== confirm) return showPass('Passwords do not match.');
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: next });
      if (error) throw error;
      showPass('✓ Password updated successfully.');
      setCurrent(''); setNext(''); setConfirm('');
    } catch (err) {
      showPass(`Failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const strength = !next ? 0 : next.length < 8 ? 1 : next.length < 12 || !/[A-Z]/.test(next) || !/[0-9]/.test(next) ? 2 : 3;
  const strengthLabel = ['', 'Weak', 'Fair', 'Strong'];
  const strengthColors = ['', '#e74c3c', '#f0a030', '#2ecc71'];

  return (
    <form onSubmit={handleSubmit}>
      <Field label="New password" required>
        <Input type="password" value={next} onChange={e => setNext(e.target.value)} placeholder="Min. 8 characters" />
        {next && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{
                height: 3, flex: 1, borderRadius: 2,
                background: i <= strength ? strengthColors[strength] : '#eee',
                transition: 'background 0.3s',
              }} />
            ))}
            <span style={{ fontFamily: S.fontBody, fontSize: 10, color: strengthColors[strength], fontWeight: 600 }}>
              {strengthLabel[strength]}
            </span>
          </div>
        )}
      </Field>
      <Field label="Confirm new password" required>
        <Input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat new password" />
        {confirm && confirm !== next && (
          <p style={{ fontFamily: S.fontBody, fontSize: 11, color: '#e74c3c', margin: '4px 0 0' }}>Passwords don't match</p>
        )}
      </Field>
      <AnimatePresence>{toast && <Toast msg={toast.msg} type={toast.type} />}</AnimatePresence>
      <button
        type="submit"
        disabled={saving || !next || !confirm}
        style={{
          marginTop: 8,
          background: saving || !next || !confirm ? '#f0e0e8' : S.roseGrad,
          color: saving || !next || !confirm ? S.textMuted : 'white',
          border: 'none', borderRadius: 100, padding: '10px 24px', cursor: saving || !next || !confirm ? 'not-allowed' : 'pointer',
          fontFamily: S.fontBody, fontSize: 13, fontWeight: 500,
          boxShadow: saving || !next || !confirm ? 'none' : '0 3px 12px rgba(200,64,112,0.28)',
          transition: 'all 0.2s',
        }}
      >
        {saving ? 'Saving…' : 'Update Password'}
      </button>
    </form>
  );
}

// ─── SettingsPage ─────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { user, profile } = useAuth();
  const [localProfile, setLocalProfile] = useState(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [notifPrefs, setNotifPrefs] = useState({
    email_progress: true,
    email_calls: true,
    email_certificates: true,
    email_marketing: false,
  });
  const [notifSaving, setNotifSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  useEffect(() => {
    if (profile) {
      setLocalProfile(profile);
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
      setBio(profile.bio || '');
      if (profile.notification_prefs) {
        setNotifPrefs(prev => ({ ...prev, ...profile.notification_prefs }));
      }
    }
  }, [profile]);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    if (saving) return;
    if (!fullName.trim()) { setToast({ msg: 'Full name is required.', type: 'error' }); return; }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim(), phone: phone.trim(), bio: bio.trim() })
        .eq('id', user.id);
      if (error) throw error;
      setToast({ msg: '✓ Profile saved.', type: 'success' });
      setLocalProfile(prev => ({ ...prev, full_name: fullName, phone, bio }));
    } catch (err) {
      setToast({ msg: `Save failed: ${err.message}`, type: 'error' });
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleNotifSave = async () => {
    if (notifSaving) return;
    setNotifSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ notification_prefs: notifPrefs })
        .eq('id', user.id);
      if (error) throw error;
      setToast({ msg: '✓ Notification preferences saved.', type: 'success' });
    } catch (err) {
      setToast({ msg: `Failed: ${err.message}`, type: 'error' });
    } finally {
      setNotifSaving(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  if (!user) return null;

  const notifItems = [
    { key: 'email_progress', label: 'Course progress reminders', desc: 'Weekly summary of your learning activity' },
    { key: 'email_calls', label: 'Upcoming call reminders', desc: '15-minute and 1-hour reminders for booked sessions' },
    { key: 'email_certificates', label: 'Certificate issued', desc: 'Notified when a new certificate is ready to download' },
    { key: 'email_marketing', label: 'New courses & promotions', desc: 'Be the first to know about new content and offers' },
  ];

  return (
    <PageShell maxWidth={680}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Header */}
        <motion.div {...stagger(0)}>
          <h1 style={{ fontFamily: S.fontDisplay, fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 600, color: S.textPrimary, margin: 0 }}>
            Account Settings
          </h1>
          <p style={{ fontFamily: S.fontBody, fontSize: 13, color: S.textMuted, margin: '5px 0 0' }}>
            Manage your profile, security, and preferences
          </p>
        </motion.div>

        {/* Profile photo */}
        <motion.div {...stagger(1)}>
          <Section title="Profile Photo" subtitle="Shown on your certificates and in the community">
            <AvatarSection
              profile={localProfile}
              userId={user.id}
              onUpdate={(updates) => setLocalProfile(prev => ({ ...prev, ...updates }))}
            />
          </Section>
        </motion.div>

        {/* Profile info */}
        <motion.div {...stagger(2)}>
          <Section title="Personal Information" subtitle="Used on your certificates — make sure your name is correct">
            <form onSubmit={handleProfileSave}>
              <Field label="Email address">
                <Input value={user.email || ''} disabled />
                <p style={{ fontFamily: S.fontBody, fontSize: 11, color: S.textMuted, margin: '4px 0 0' }}>
                  Contact support to change your email address.
                </p>
              </Field>
              <Field label="Full name" required>
                <Input
                  value={fullName} onChange={e => setFullName(e.target.value)}
                  placeholder="Jane Smith" maxLength={80} required
                />
              </Field>
              <Field label="Phone number" hint="Optional · used for call scheduling reminders">
                <Input
                  value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="+1 (555) 000 0000" type="tel" maxLength={25}
                />
              </Field>
              <Field label="Bio" hint="A short sentence about you, shown on your public profile">
                <textarea
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder="e.g. Aspiring lash artist from Milan…"
                  maxLength={200}
                  rows={3}
                  style={{
                    width: '100%', fontFamily: S.fontBody, fontSize: 14, color: S.textPrimary,
                    background: 'rgba(255,255,255,0.9)', border: `1px solid ${S.cardBorder}`,
                    borderRadius: 10, padding: '10px 14px', outline: 'none', resize: 'vertical',
                    boxSizing: 'border-box', transition: 'border-color 0.2s, box-shadow 0.2s',
                    lineHeight: 1.5,
                  }}
                  onFocus={e => { e.target.style.borderColor = 'rgba(200,64,112,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(200,64,112,0.08)'; }}
                  onBlur={e => { e.target.style.borderColor = S.cardBorder; e.target.style.boxShadow = 'none'; }}
                />
                <p style={{ fontFamily: S.fontBody, fontSize: 10, color: S.textMuted, margin: '3px 0 0', textAlign: 'right' }}>
                  {bio.length}/200
                </p>
              </Field>

              <AnimatePresence>{toast && <Toast msg={toast.msg} type={toast.type} />}</AnimatePresence>

              <button
                type="submit"
                disabled={saving}
                style={{
                  marginTop: 8,
                  background: saving ? '#f0e0e8' : S.roseGrad,
                  color: saving ? S.textMuted : 'white',
                  border: 'none', borderRadius: 100, padding: '11px 28px',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  fontFamily: S.fontBody, fontSize: 13, fontWeight: 500,
                  boxShadow: saving ? 'none' : '0 3px 12px rgba(200,64,112,0.28)',
                  transition: 'all 0.2s',
                }}
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </form>
          </Section>
        </motion.div>

        {/* Password */}
        <motion.div {...stagger(3)}>
          <Section title="Password" subtitle="Use a strong password with letters, numbers, and symbols">
            <PasswordSection />
          </Section>
        </motion.div>

        {/* Notifications */}
        <motion.div {...stagger(4)}>
          <Section title="Email Notifications" subtitle="Choose which emails you want to receive from us">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {notifItems.map(item => (
                <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 14, justifyContent: 'space-between' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: S.fontBody, fontSize: 13, fontWeight: 500, color: S.textPrimary, margin: 0 }}>{item.label}</p>
                    <p style={{ fontFamily: S.fontBody, fontSize: 11.5, color: S.textMuted, margin: '2px 0 0' }}>{item.desc}</p>
                  </div>
                  <Toggle
                    checked={notifPrefs[item.key]}
                    onChange={val => setNotifPrefs(prev => ({ ...prev, [item.key]: val }))}
                  />
                </div>
              ))}
            </div>
            <button
              onClick={handleNotifSave}
              disabled={notifSaving}
              style={{
                marginTop: 20,
                background: notifSaving ? '#f0e0e8' : S.roseGrad,
                color: notifSaving ? S.textMuted : 'white',
                border: 'none', borderRadius: 100, padding: '10px 24px',
                cursor: notifSaving ? 'not-allowed' : 'pointer',
                fontFamily: S.fontBody, fontSize: 13, fontWeight: 500,
                boxShadow: notifSaving ? 'none' : '0 3px 12px rgba(200,64,112,0.28)',
                transition: 'all 0.2s',
              }}
            >
              {notifSaving ? 'Saving…' : 'Save Preferences'}
            </button>
          </Section>
        </motion.div>

        {/* Danger zone */}
        <motion.div {...stagger(5)}>
          <div style={{
            background: 'rgba(231,76,60,0.03)', border: '1px solid rgba(231,76,60,0.2)',
            borderRadius: S.cardRadius, overflow: 'hidden',
          }}>
            <div style={{
              padding: '18px 24px', borderBottom: '1px solid rgba(231,76,60,0.1)',
              background: 'rgba(231,76,60,0.03)',
            }}>
              <h3 style={{ fontFamily: S.fontDisplay, fontSize: 20, fontWeight: 600, color: '#c0392b', margin: 0 }}>Danger Zone</h3>
              <p style={{ fontFamily: S.fontBody, fontSize: 12.5, color: '#c0392b', margin: '3px 0 0', opacity: 0.75 }}>
                Irreversible actions — proceed with care
              </p>
            </div>
            <div style={{ padding: '20px 24px' }}>
              <p style={{ fontFamily: S.fontBody, fontSize: 13, color: S.textSecondary, margin: '0 0 14px' }}>
                Deleting your account will permanently remove all your data, progress, and certificates.
                This cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder='Type "DELETE" to confirm'
                  value={deleteConfirm}
                  onChange={e => setDeleteConfirm(e.target.value)}
                  style={{
                    fontFamily: S.fontBody, fontSize: 13, color: S.textPrimary,
                    background: 'white', border: '1px solid rgba(231,76,60,0.3)',
                    borderRadius: 8, padding: '9px 14px', outline: 'none',
                    flex: '1', minWidth: 200,
                  }}
                />
                <button
                  disabled={deleteConfirm !== 'DELETE'}
                  onClick={() => {
                    if (deleteConfirm === 'DELETE') {
                      alert('Please contact support@lumiere.academy to process your account deletion.');
                      setDeleteConfirm('');
                    }
                  }}
                  style={{
                    background: deleteConfirm === 'DELETE' ? '#e74c3c' : 'rgba(231,76,60,0.08)',
                    color: deleteConfirm === 'DELETE' ? 'white' : 'rgba(231,76,60,0.4)',
                    border: '1px solid rgba(231,76,60,0.2)',
                    borderRadius: 100, padding: '9px 20px', cursor: deleteConfirm === 'DELETE' ? 'pointer' : 'not-allowed',
                    fontFamily: S.fontBody, fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap',
                    transition: 'all 0.2s',
                  }}
                >
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        </motion.div>

      </div>
    </PageShell>
  );
}