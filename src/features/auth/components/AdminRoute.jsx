import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function AdminRoute() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#fff6f9] to-[#fff0f4]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand-rose-200 border-t-brand-rose-600" />
      </div>
    );
  }

  // Not logged in → login page
  if (!user) return <Navigate to="/login" replace />;

  // Logged in but not admin → dashboard (or could show a 403 page)
  if (profile?.role !== 'admin') return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}