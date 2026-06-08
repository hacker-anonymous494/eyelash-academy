import { useState } from 'react';
import { supabase } from '@/config/supabase';
import GlassCard from '@/shared/components/GlassCard';
import GradientText from '@/shared/components/GradientText';
import PrimaryButton from '@/shared/components/PrimaryButton';
import PageTransition from '@/shared/components/PageTransition';
import Input from '@/shared/components/Input';
import { Link } from 'react-router-dom';
import BackgroundBlobs from '@/shared/components/BackgroundBlobs';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) setError(error.message);
    else setSent(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-[#fff6f9] via-[#fdf2ee] to-[#fff0f4]">
      <BackgroundBlobs section="hero" />
      <PageTransition>
        <GlassCard className="w-full max-w-md mx-4 p-8 relative z-10 text-center">
          <div className="flex justify-center mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-rose-600 to-brand-rose-400 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 2C8 2 5 5 5 9c0 2.5 1.2 4.7 3 6l-1 4h10l-1-4c1.8-1.3 3-3.5 3-6 0-4-3-7-7-7z"/></svg>
            </div>
          </div>
          <h1 className="font-display text-2xl font-semibold mb-2">Reset Password</h1>
          {sent ? (
            <p className="text-gray-600 mb-4">Check your email for a reset link.</p>
          ) : (
            <>
              <p className="text-sm text-gray-500 mb-6">
                Enter your email and we’ll send you a magic link.
              </p>
              <form onSubmit={handleSubmit}>
                <Input
                  label="Email address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {error && <p className="text-sm text-red-500 mb-3">{error}</p>}
                <PrimaryButton type="submit" loading={loading}>
                  Send Reset Link
                </PrimaryButton>
              </form>
            </>
          )}
          <p className="mt-4 text-sm">
            <Link to="/login" className="text-brand-rose-600 hover:underline">Back to login</Link>
          </p>
        </GlassCard>
      </PageTransition>
    </div>
  );
}