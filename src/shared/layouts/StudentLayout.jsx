import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useSignOut } from '@/features/auth/hooks/useSignOut';
import ChatBubble from '@/features/chat/ChatBubble';
import CallToast from '@/features/calls/CallToast';
import { useCallNotifications } from '@/features/calls/useCallNotifications';

// ─── Design tokens (same dark theme as LearnPage) ────────────────────────
const S = {
  sidebarBg: '#0f0a10',
  sidebarBorder: 'rgba(232,112,144,0.18)',
  sidebarText: 'rgba(255,240,245,0.85)',
  sidebarMuted: 'rgba(255,180,210,0.45)',
  sidebarHover: 'rgba(255,255,255,0.05)',
  sidebarActive: 'rgba(232,112,144,0.14)',
  sidebarActiveRail: '#e87090',
  canvasBg: '#faf8f7',
};

// ─── Icons (compact SVGs) ────────────────────────────────────────────────
const Icons = {
  dashboard: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  courses: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  certificates: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>,
  calls: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
  settings: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  logout: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  hamburger: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>,
};

// ─── NavItem ──────────────────────────────────────────────────────────────
function NavItem({ icon, label, to, active, onClick }) {
  return (
    <Link to={to} style={{ textDecoration: 'none' }} onClick={onClick}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          borderRadius: 6,
          marginBottom: 2,
          cursor: 'pointer',
          background: active ? S.sidebarActive : 'transparent',
          color: active ? 'rgba(255,240,245,0.95)' : S.sidebarText,
          transition: 'background 0.15s',
          position: 'relative',
        }}
        onMouseEnter={e => { if (!active) e.currentTarget.style.background = S.sidebarHover; }}
        onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
      >
        {active && (
          <span style={{
            position: 'absolute', left: 0, top: '25%', bottom: '25%',
            width: 3, borderRadius: 2, background: S.sidebarActiveRail,
          }} />
        )}
        <span style={{ opacity: active ? 1 : 0.7 }}>{icon}</span>
        <span style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 13, fontWeight: active ? 500 : 400 }}>
          {label}
        </span>
      </div>
    </Link>
  );
}

// ─── StudentLayout ────────────────────────────────────────────────────────
export default function StudentLayout() {
  const { user, profile } = useAuth();
  const { signOut } = useSignOut();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768);

  useCallNotifications();

  useEffect(() => {
    const handleResize = () => {
      setSidebarOpen(window.innerWidth >= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (window.innerWidth < 768) setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: S.canvasBg }}>
      {/* Sidebar – fixed on mobile, static on desktop */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            {/* Mobile backdrop */}
            {window.innerWidth < 768 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)',
                  zIndex: 40,
                }}
                onClick={() => setSidebarOpen(false)}
              />
            )}

            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              style={{
                position: window.innerWidth < 768 ? 'fixed' : 'relative',
                zIndex: 50,
                width: 250,
                height: '100vh',
                background: S.sidebarBg,
                borderRight: `1px solid ${S.sidebarBorder}`,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                flexShrink: 0,
              }}
            >
              <div style={{ width: 250, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                {/* Logo */}
                <Link to="/" style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '16px 14px 12px',
                  borderBottom: `1px solid ${S.sidebarBorder}`,
                  textDecoration: 'none',
                  flexShrink: 0,
                }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: 6,
                    background: 'linear-gradient(135deg,#c84070,#f07090)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.8)' }} />
                  </div>
                  <span style={{
                    fontFamily: "'Cormorant Garamond', 'Playfair Display', Georgia, serif",
                    fontSize: 14,
                    color: '#f0a0b8',
                    fontWeight: 600,
                  }}>
                    Lumière
                  </span>
                </Link>

                {/* User info (compact) */}
                <div style={{ padding: '10px 14px 6px', flexShrink: 0 }}>
                  <p style={{
                    fontFamily: "'DM Sans', system-ui, sans-serif",
                    fontSize: 12,
                    fontWeight: 500,
                    color: S.sidebarText,
                    margin: 0,
                  }}>
                    {profile?.full_name || 'Student'}
                  </p>
                  <p style={{
                    fontFamily: "'DM Sans', system-ui, sans-serif",
                    fontSize: 10,
                    color: S.sidebarMuted,
                    margin: 0,
                  }}>
                    {user?.email}
                  </p>
                </div>

                {/* Navigation */}
                <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
                  <NavItem
                    icon={Icons.dashboard}
                    label="Overview"
                    to="/dashboard"
                    active={location.pathname === '/dashboard'}
                    onClick={() => { if (window.innerWidth < 768) setSidebarOpen(false); }}
                  />
                  <NavItem
                    icon={Icons.courses}
                    label="My Courses"
                    to="/dashboard/courses"
                    active={location.pathname.startsWith('/dashboard/courses')}
                    onClick={() => { if (window.innerWidth < 768) setSidebarOpen(false); }}
                  />
                  <NavItem
                    icon={Icons.certificates}
                    label="Certificates"
                    to="/dashboard/certificates"
                    active={location.pathname.startsWith('/dashboard/certificates')}
                    onClick={() => { if (window.innerWidth < 768) setSidebarOpen(false); }}
                  />
                  <NavItem
                    icon={Icons.calls}
                    label="My Calls"
                    to="/dashboard/calls"
                    active={location.pathname.startsWith('/dashboard/calls')}
                    onClick={() => { if (window.innerWidth < 768) setSidebarOpen(false); }}
                  />
                  <NavItem
                    icon={Icons.settings}
                    label="Settings"
                    to="/dashboard/settings"
                    active={location.pathname.startsWith('/dashboard/settings')}
                    onClick={() => { if (window.innerWidth < 768) setSidebarOpen(false); }}
                  />
                </nav>

                {/* Logout */}
                <div style={{ padding: '8px 14px', borderTop: `1px solid ${S.sidebarBorder}`, flexShrink: 0 }}>
                  <button
                    onClick={signOut}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      background: 'transparent',
                      border: 'none',
                      color: S.sidebarMuted,
                      fontFamily: "'DM Sans', system-ui, sans-serif",
                      fontSize: 12,
                      cursor: 'pointer',
                      padding: '6px 8px',
                      borderRadius: 6,
                      width: '100%',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = S.sidebarHover}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {Icons.logout} Sign Out
                  </button>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content – absolutely no extra padding or header */}
      <div style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
        {/* Mobile hamburger (only when sidebar closed) */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            style={{
              position: 'fixed',
              top: 12,
              left: 12,
              zIndex: 20,
              background: 'rgba(255,255,255,0.85)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(220,160,180,0.2)',
              borderRadius: 8,
              padding: 6,
              cursor: 'pointer',
              color: '#c84070',
              lineHeight: 0,
            }}
          >
            {Icons.hamburger}
          </button>
        )}
        <Outlet />
      </div>

      {/* Global floating widgets */}
      <ChatBubble />
      <CallToast />
    </div>
  );
}