import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import CallNotificationProvider from '@/features/calls/CallNotificationProvider';
import CallToast from '@/features/calls/CallToast';

export default function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#fff6f9] to-[#fff0f4]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand-rose-200 border-t-brand-rose-600" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      <CallNotificationProvider />
      <CallToast />
      <Outlet />
    </>
  );
}