import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import GlassCard from '@/shared/components/GlassCard';
import GradientText from '@/shared/components/GradientText';
import PrimaryButton from '@/shared/components/PrimaryButton';
// GhostButton no longer needed (we only use PrimaryButton)
import PageTransition from '@/shared/components/PageTransition';
import Input from '@/shared/components/Input';
import { useSignIn } from '../hooks/useSignIn';
// BackgroundBlobs is removed – PublicLayout handles it

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export default function LoginPage() {
  const navigate = useNavigate();
  const { signIn, loading, error } = useSignIn();
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (data) => {
    const success = await signIn(data.email, data.password);
    if (success) navigate('/dashboard');
  };

  return (
    <PageTransition>
      {/* Centered container with enough height to look good inside PublicLayout */}
      <div className="flex items-center justify-center min-h-[80vh] px-4">
        <GlassCard className="w-full max-w-md p-8">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-rose-600 to-brand-rose-400 flex items-center justify-center shadow-lg shadow-brand-rose-600/30">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                  <path d="M12 2C8 2 5 5 5 9c0 2.5 1.2 4.7 3 6l-1 4h10l-1-4c1.8-1.3 3-3.5 3-6 0-4-3-7-7-7z" fill="white" fillOpacity="0.9"/>
                  <circle cx="12" cy="9" r="2.5" fill="white" fillOpacity="0.6"/>
                </svg>
              </div>
              <div>
                <div className="font-display text-lg font-semibold leading-none">Lumière</div>
                <div className="text-[10px] tracking-[0.12em] uppercase text-brand-rose-600 font-medium">Beauty Academy</div>
              </div>
            </div>
          </div>

          <h1 className="font-display text-2xl font-semibold text-center mb-1">Welcome back</h1>
          <p className="text-center text-sm text-brand-rose-800/60 mb-6">
            Sign in to your <GradientText>account</GradientText>
          </p>

          {error && (
            <div className="mb-4 p-3 bg-brand-rose-50 border border-brand-rose-200 rounded-xl text-sm text-brand-rose-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)}>
            <Input
              label="Email"
              type="email"
              {...register('email')}
              error={errors.email?.message}
            />
            <Input
              label="Password"
              type="password"
              {...register('password')}
              error={errors.password?.message}
            />

            <div className="flex justify-end mb-6">
              <Link to="/forgot-password" className="text-xs text-brand-rose-600 hover:underline">
                Forgot password?
              </Link>
            </div>

            <PrimaryButton type="submit" loading={loading}>
              Sign In
            </PrimaryButton>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            Don't have an account?{' '}
            <Link to="/signup" className="font-medium text-brand-rose-600 hover:underline">
              Create free account
            </Link>
          </div>
        </GlassCard>
      </div>
    </PageTransition>
  );
}