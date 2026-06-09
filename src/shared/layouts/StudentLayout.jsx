import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useSignOut } from '@/features/auth/hooks/useSignOut';
import ChatBubble from '@/features/chat/ChatBubble';
import CallToast from '@/features/calls/CallToast';
import { useCallNotifications } from '@/features/calls/useCallNotifications';

const navItems = [
  { to: '/dashboard', label: 'Overview', icon: '📊', exact: true },
  { to: '/dashboard/courses', label: 'My Courses', icon: '📚' },
  { to: '/dashboard/certificates', label: 'Certificates', icon: '📜' },
  { to: '/dashboard/calls', label: 'My Calls', icon: '📞' },
  { to: '/dashboard/settings', label: 'Settings', icon: '⚙️' },
];

export default function StudentLayout() {
  const { user, profile } = useAuth();
  const { signOut } = useSignOut();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Activate call notifications
  useCallNotifications();

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Close user menu on outside click
  useEffect(() => {
    const handler = () => setUserMenuOpen(false);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fff6f9] via-[#fdf2ee] to-[#fff0f4] flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <motion.aside
        initial={{ x: -280 }}
        animate={{ x: sidebarOpen ? 0 : -280 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white/90 backdrop-blur-xl border-r border-brand-rose-200/40 flex flex-col shadow-2xl lg:shadow-none lg:translate-x-0"
      >
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 px-6 py-5 border-b border-brand-rose-200/40">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-rose-600 to-brand-rose-400 flex items-center justify-center shadow shadow-brand-rose-300">
            <div className="w-3 h-3 rounded-full border-2 border-white/80" />
          </div>
          <div>
            <span className="font-display text-base font-semibold text-brand-rose-800">Lumière</span>
            <span className="block text-[9px] text-brand-rose-500 tracking-[0.1em] uppercase">Academy</span>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = item.exact
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-brand-rose-100 text-brand-rose-800 shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-brand-rose-700'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-rose-500" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="p-4 border-t border-brand-rose-200/40">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-rose-400 to-brand-rose-600 text-white flex items-center justify-center text-sm font-semibold">
              {profile?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">
                {profile?.full_name || 'Student'}
              </p>
              <p className="text-xs text-gray-400 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="w-full text-xs text-gray-500 hover:text-red-500 transition-colors text-left"
          >
            Sign Out
          </button>
        </div>
      </motion.aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-xl border-b border-brand-rose-200/40 h-14 flex items-center justify-between px-4 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            {/* Mobile menu toggle */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden text-gray-500 hover:text-brand-rose-600 transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12h18M3 6h18M3 18h18" />
              </svg>
            </button>

            {/* Breadcrumb / page title */}
            <div>
              <p className="text-xs text-gray-400">Welcome back</p>
              <p className="text-sm font-semibold text-gray-800">
                {profile?.full_name || 'Student'}
              </p>
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            {/* Notifications (placeholder) */}
            <button className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-400 hover:text-brand-rose-600 hover:border-brand-rose-300 transition-all relative">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-brand-rose-500 border-2 border-white" />
            </button>

            {/* User menu */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setUserMenuOpen(!userMenuOpen);
                }}
                className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-rose-400 to-brand-rose-600 text-white flex items-center justify-center text-sm font-semibold"
              >
                {profile?.full_name?.charAt(0) || 'U'}
              </button>

              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -5 }}
                    className="absolute right-0 mt-2 w-48 bg-white/90 backdrop-blur-xl border border-brand-rose-200/40 rounded-xl shadow-xl py-2 z-50"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="px-4 py-2 border-b border-brand-rose-100/50">
                      <p className="text-sm font-semibold text-gray-800">{profile?.full_name}</p>
                      <p className="text-xs text-gray-400">{user?.email}</p>
                    </div>
                    <Link
                      to="/dashboard/settings"
                      className="block px-4 py-2 text-sm text-gray-600 hover:bg-brand-rose-50 transition"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      ⚙️ Settings
                    </Link>
                    <button
                      onClick={() => { signOut(); setUserMenuOpen(false); }}
                      className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition"
                    >
                      🚪 Sign Out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 relative z-10">
          <Outlet />
        </main>
      </div>

      {/* Global floating widgets */}
      <ChatBubble />
      <CallToast />
    </div>
  );
}