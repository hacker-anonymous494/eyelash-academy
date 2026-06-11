import { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useSignOut } from '@/features/auth/hooks/useSignOut';
import ChatBubble from '@/features/chat/ChatBubble';
import CallToast from '@/features/calls/CallToast';
import { S, globalCSS } from '@/features/dashboard/student/dashboardShared.jsx';
import { supabase } from '@/config/supabase';
import { sendNotification } from '@/lib/notifications';

// Module‑level guard – prevents duplicate realtime subscriptions
const activeCallListeners = new Set();

// ─── Sidebar design tokens ────────────────────────────────────────────────────
const SB = {
  bg: '#0f0a10',
  border: 'rgba(232,112,144,0.15)',
  text: 'rgba(255,240,245,0.82)',
  muted: 'rgba(255,180,210,0.42)',
  hover: 'rgba(255,255,255,0.05)',
  active: 'rgba(232,112,144,0.13)',
  activeRail: '#e87090',
  width: 240,
};

// ─── Icons ────────────────────────────────────────────────────────────────────
const Icon = {
  overview: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/>
      <rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>
    </svg>
  ),
  courses: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>
  ),
  certs: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="8" r="5"/><path d="M9 14.5l-1.5 7L12 20l4.5 1.5L15 14.5"/>
    </svg>
  ),
  calls: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M15.05 5A5 5 0 0 1 19 8.95M15.05 1A9 9 0 0 1 23 8.94m-1 7.98v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.8 12.8 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.8 12.8 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>
  ),
  settings: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  signout: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
  menu: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  ),
  bell: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  ),
  chevronDown: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M6 9l6 6 6-6"/>
    </svg>
  ),
  explore: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
};

// ─── Nav item ─────────────────────────────────────────────────────────────────
function NavItem({ icon, label, to, active, badge, onClick }) {
  return (
    <Link to={to} style={{ textDecoration: 'none', display: 'block' }} onClick={onClick}>
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 9,
          padding: '9px 12px', borderRadius: 8, marginBottom: 2,
          cursor: 'pointer', position: 'relative',
          background: active ? SB.active : 'transparent',
          color: active ? 'rgba(255,240,245,0.97)' : SB.text,
          transition: 'background 0.15s, color 0.15s',
        }}
        onMouseEnter={e => { if (!active) e.currentTarget.style.background = SB.hover; }}
        onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
      >
        {active && (
          <span style={{
            position: 'absolute', left: 0, top: '20%', bottom: '20%',
            width: 3, borderRadius: 2, background: SB.activeRail,
          }} />
        )}
        <span style={{ opacity: active ? 1 : 0.65, display: 'flex', flexShrink: 0 }}>{icon}</span>
        <span style={{ fontFamily: S.fontBody, fontSize: 13.5, fontWeight: active ? 500 : 400, flex: 1 }}>
          {label}
        </span>
        {badge != null && badge > 0 && (
          <span style={{
            background: SB.activeRail, color: 'white',
            fontFamily: S.fontBody, fontSize: 10, fontWeight: 700,
            borderRadius: 100, padding: '1px 6px', minWidth: 18, textAlign: 'center',
          }}>
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </div>
    </Link>
  );
}

// ─── Section divider ──────────────────────────────────────────────────────────
function NavDivider({ label }) {
  return (
    <div style={{
      padding: '12px 12px 5px',
      fontFamily: S.fontBody, fontSize: 10, fontWeight: 700,
      color: SB.muted, letterSpacing: '0.12em', textTransform: 'uppercase',
    }}>
      {label}
    </div>
  );
}

// ─── Avatar initials ──────────────────────────────────────────────────────────
function Avatar({ name, size = 32, url }) {
  const initials = name
    ? name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
    : '?';
  return url ? (
    <img src={url} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
  ) : (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'linear-gradient(135deg, #c84070, #f07090)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: S.fontBody, fontSize: size * 0.36, fontWeight: 600,
      color: 'white', userSelect: 'none',
    }}>
      {initials}
    </div>
  );
}

// ─── Topbar (mobile) ──────────────────────────────────────────────────────────
function MobileTopbar({ onOpenSidebar, profile, user }) {
  return (
    <div style={{
      height: 56, display: 'flex', alignItems: 'center', gap: 12,
      padding: '0 16px',
      background: 'rgba(250,248,247,0.94)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid rgba(200,64,112,0.1)',
      position: 'sticky', top: 0, zIndex: 30,
    }}>
      <button
        onClick={onOpenSidebar}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: S.rose, padding: 4, display: 'flex',
        }}
      >
        {Icon.menu}
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
        <div style={{
          width: 22, height: 22, borderRadius: 6,
          background: 'linear-gradient(135deg,#c84070,#f07090)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.85)' }} />
        </div>
        <span style={{ fontFamily: S.fontDisplay, fontSize: 16, color: S.rose, fontWeight: 600 }}>Lumière</span>
      </div>
      <Avatar name={profile?.full_name || user?.email} size={30} url={profile?.avatar_url} />
    </div>
  );
}

// ─── Avatar dropdown ──────────────────────────────────────────────────────────
function AvatarDropdown({ profile, user, signOut }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const ref = useRef(null);

  useEffect(() => {
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
          background: open ? 'rgba(255,255,255,0.08)' : 'transparent',
          border: 'none', borderRadius: 10, padding: '5px 8px 5px 5px',
          transition: 'background 0.15s', width: '100%',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = 'transparent'; }}
      >
        <Avatar name={profile?.full_name || user?.email} size={30} url={profile?.avatar_url} />
        <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
          <p style={{ fontFamily: S.fontBody, fontSize: 12, fontWeight: 500, color: SB.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {profile?.full_name || 'Student'}
          </p>
          <p style={{ fontFamily: S.fontBody, fontSize: 10, color: SB.muted, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.email}
          </p>
        </div>
        <span style={{ color: SB.muted, opacity: 0.7, flexShrink: 0 }}>{Icon.chevronDown}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            style={{
              position: 'absolute', bottom: 'calc(100% + 8px)', left: 0, right: 0,
              background: '#1a0f1a',
              border: `1px solid ${SB.border}`,
              borderRadius: 12, overflow: 'hidden',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              zIndex: 100,
            }}
          >
            {[
              { label: 'Profile Settings', to: '/dashboard/settings' },
              { label: 'My Certificates', to: '/dashboard/certificates' },
              { label: 'Browse Courses', to: '/courses' },
            ].map(item => (
              <button
                key={item.to}
                onClick={() => { setOpen(false); navigate(item.to); }}
                style={{
                  display: 'block', width: '100%', padding: '10px 14px', border: 'none',
                  background: 'transparent', cursor: 'pointer', textAlign: 'left',
                  fontFamily: S.fontBody, fontSize: 13, color: SB.text,
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = SB.hover}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {item.label}
              </button>
            ))}
            <div style={{ height: 1, background: SB.border }} />
            <button
              onClick={() => { setOpen(false); signOut(); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                width: '100%', padding: '10px 14px', border: 'none',
                background: 'transparent', cursor: 'pointer',
                fontFamily: S.fontBody, fontSize: 13, color: 'rgba(248,112,144,0.8)',
                transition: 'background 0.12s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = SB.hover}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {Icon.signout} Sign Out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Sidebar body ─────────────────────────────────────────────────────────────
function SidebarContent({ profile, user, signOut, location, onLinkClick }) {
  const path = location.pathname;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Logo */}
      <Link
        to="/"
        style={{
          display: 'flex', alignItems: 'center', gap: 9,
          padding: '18px 14px 14px', textDecoration: 'none',
          borderBottom: `1px solid ${SB.border}`, flexShrink: 0,
        }}
      >
        <div style={{
          width: 26, height: 26, borderRadius: 8,
          background: 'linear-gradient(135deg,#c84070,#f07090)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <div style={{ width: 9, height: 9, borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.85)' }} />
        </div>
        <div>
          <span style={{ fontFamily: S.fontDisplay, fontSize: 18, fontWeight: 600, color: '#f0a0b8', lineHeight: 1 }}>
            Lumière
          </span>
          <div style={{ fontFamily: S.fontBody, fontSize: 9, color: SB.muted, letterSpacing: '0.14em', textTransform: 'uppercase', lineHeight: 1, marginTop: 2 }}>
            Beauty Academy
          </div>
        </div>
      </Link>

      {/* Navigation */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '10px 10px 6px' }}>
        <NavDivider label="Learning" />
        <NavItem icon={Icon.overview} label="Overview" to="/dashboard" active={path === '/dashboard'} onClick={onLinkClick} />
        <NavItem icon={Icon.courses} label="My Courses" to="/dashboard/courses" active={path.startsWith('/dashboard/courses')} onClick={onLinkClick} />
        <NavItem icon={Icon.certs} label="Certificates" to="/dashboard/certificates" active={path.startsWith('/dashboard/certificates')} onClick={onLinkClick} />

        <NavDivider label="Connect" />
        <NavItem icon={Icon.calls} label="My Calls" to="/dashboard/calls" active={path.startsWith('/dashboard/calls')} onClick={onLinkClick} />

        <NavDivider label="Account" />
        <NavItem icon={Icon.settings} label="Settings" to="/dashboard/settings" active={path.startsWith('/dashboard/settings')} onClick={onLinkClick} />
        <NavItem icon={Icon.explore} label="Browse Courses" to="/courses" active={false} onClick={onLinkClick} />
      </nav>

      {/* User section */}
      <div style={{ padding: '10px 10px 14px', borderTop: `1px solid ${SB.border}`, flexShrink: 0 }}>
        <AvatarDropdown profile={profile} user={user} signOut={signOut} />
      </div>
    </div>
  );
}

// ─── RouteBreadcrumb ──────────────────────────────────────────────────────────
function RouteBreadcrumb({ location }) {
  const map = {
    '/dashboard': 'Overview',
    '/dashboard/courses': 'My Courses',
    '/dashboard/certificates': 'Certificates',
    '/dashboard/calls': 'My Calls',
    '/dashboard/settings': 'Settings',
  };
  const label = map[location.pathname] || 'Dashboard';
  return (
    <span style={{ fontFamily: S.fontBody, fontSize: 13, color: S.textSecondary }}>
      <span style={{ color: S.textMuted }}>Dashboard</span>
      {label !== 'Overview' && (
        <>
          <span style={{ margin: '0 6px', color: S.textMuted }}>›</span>
          <span style={{ fontWeight: 500 }}>{label}</span>
        </>
      )}
    </span>
  );
}

// ─── StudentLayout ────────────────────────────────────────────────────────────
export default function StudentLayout() {
  const { user, profile } = useAuth();
  const { signOut } = useSignOut();
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // ── Realtime call invite listener (global guard) ─────────────────────────
  useEffect(() => {
    if (!user) return;
    const channelKey = `call_${user.id}`;
    if (activeCallListeners.has(channelKey)) return;
    activeCallListeners.add(channelKey);

    const channel = supabase
      .channel(channelKey)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'video_call_sessions',
          filter: `student_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new.room_ready) {
            sendNotification('Your call is starting!', { body: 'Instructor is waiting.' });
            window.dispatchEvent(new CustomEvent('call:invite', { detail: { sessionId: payload.new.id } }));
          }
        }
      )
      .subscribe((status) => {
        if (status !== 'SUBSCRIBED') activeCallListeners.delete(channelKey);
      });

    return () => {
      supabase.removeChannel(channel);
      activeCallListeners.delete(channelKey);
    };
  }, [user?.id]);

  // Detect mobile
  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setSidebarOpen(!mobile);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Close sidebar on mobile route change
  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [location.pathname, isMobile]);

  // Keyboard shortcut: [ to toggle sidebar
  useEffect(() => {
    const fn = e => {
      if (e.key === '[' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        setSidebarOpen(o => !o);
      }
    };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, []);

  const closeSidebar = () => isMobile && setSidebarOpen(false);

  return (
    <>
      <style>{globalCSS}</style>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: S.canvasBg }}>

        {/* ── Desktop sidebar (pushes content) ────────────────────────────── */}
        {!isMobile && (
          <motion.aside
            initial={false}
            animate={{ width: sidebarOpen ? SB.width : 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            style={{
              background: SB.bg,
              borderRight: `1px solid ${SB.border}`,
              flexShrink: 0, overflow: 'hidden',
              height: '100vh',
            }}
          >
            <div style={{ width: SB.width }}>
              <SidebarContent
                profile={profile} user={user} signOut={signOut}
                location={location} onLinkClick={closeSidebar}
              />
            </div>
          </motion.aside>
        )}

        {/* ── Mobile sidebar (overlay) ─────────────────────────────────────── */}
        <AnimatePresence>
          {isMobile && sidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setSidebarOpen(false)}
                style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 40, backdropFilter: 'blur(2px)' }}
              />
              <motion.aside
                initial={{ x: -SB.width }} animate={{ x: 0 }} exit={{ x: -SB.width }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  position: 'fixed', left: 0, top: 0, bottom: 0,
                  width: SB.width, background: SB.bg,
                  borderRight: `1px solid ${SB.border}`,
                  zIndex: 50, overflow: 'hidden',
                }}
              >
                <SidebarContent
                  profile={profile} user={user} signOut={signOut}
                  location={location} onLinkClick={closeSidebar}
                />
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* ── Main panel ───────────────────────────────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

          {/* Desktop collapse toggle */}
          {!isMobile && (
            <div style={{
              height: 48, display: 'flex', alignItems: 'center',
              padding: '0 20px', gap: 16,
              borderBottom: '1px solid rgba(200,64,112,0.08)',
              background: 'rgba(250,248,247,0.92)', backdropFilter: 'blur(10px)',
              flexShrink: 0,
            }}>
              <button
                onClick={() => setSidebarOpen(o => !o)}
                title="Toggle sidebar  [ "
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: S.textMuted, padding: 4, display: 'flex', borderRadius: 6,
                  transition: 'color 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.color = S.rose}
                onMouseLeave={e => e.currentTarget.style.color = S.textMuted}
              >
                {Icon.menu}
              </button>
              {/* Breadcrumb */}
              <RouteBreadcrumb location={location} />
              <div style={{ flex: 1 }} />
              {/* Bell placeholder */}
              <button style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: S.textMuted, padding: 6, display: 'flex', borderRadius: 8,
                transition: 'color 0.15s', position: 'relative',
              }}>
                {Icon.bell}
              </button>
            </div>
          )}

          {/* Mobile topbar */}
          {isMobile && (
            <MobileTopbar onOpenSidebar={() => setSidebarOpen(true)} profile={profile} user={user} />
          )}

          {/* Page content */}
          <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
            <Outlet />
          </main>
        </div>
      </div>

      {/* Global floating widgets */}
      <ChatBubble />
      <CallToast />
    </>
  );
}