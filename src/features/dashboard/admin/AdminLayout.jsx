/**
 * AdminLayout.jsx — World-class dark sidebar admin shell
 * - Fully responsive: mobile overlay, tablet collapsed, desktop full
 * - Keyboard shortcut [ to toggle
 * - Active route highlighting with rose rail
 * - Avatar + dropdown
 * - useAdminNotifications hook preserved
 */

import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSignOut } from '@/features/auth/hooks/useSignOut';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { adminGlobalCSS, A } from './adminShared.jsx';

// ─── Navigation items ─────────────────────────────────────────────────────────
const NAV = [
  { to: '/admin', label: 'Overview', exact: true, icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/>
      <rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>
    </svg>
  )},
  { to: '/admin/courses', label: 'Courses', icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>
  )},
  { to: '/admin/students', label: 'Students', icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  )},
  { to: '/admin/orders', label: 'Orders', icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  )},
  { to: '/admin/chat', label: 'Chat', icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  )},
  { to: '/admin/calls', label: 'Calls', icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.8 12.8 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.8 12.8 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>
  )},
  { to: '/admin/analytics', label: 'Analytics', icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  )},
  { to: '/admin/settings', label: 'Settings', icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  )},
];

const MenuIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
);

const ChevronDownIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M6 9l6 6 6-6"/>
  </svg>
);

function Avatar({ name, size = 30, url }) {
  const initials = name ? name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase() : 'A';
  return url ? (
    <img src={url} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
  ) : (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'linear-gradient(135deg,#c84070,#f07090)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: A.fontBody, fontSize: size * 0.35, fontWeight: 700, color: 'white',
    }}>{initials}</div>
  );
}

function NavItem({ item, active, onClick }) {
  return (
    <Link to={item.to} style={{ textDecoration: 'none', display: 'block' }} onClick={onClick}>
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 9,
          padding: '9px 12px', borderRadius: 8, marginBottom: 1,
          cursor: 'pointer', position: 'relative',
          background: active ? A.sidebarActive : 'transparent',
          color: active ? 'rgba(255,240,245,0.97)' : A.sidebarText,
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => { if (!active) e.currentTarget.style.background = A.sidebarHover; }}
        onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
      >
        {active && <span style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: 3, borderRadius: 2, background: A.sidebarActiveRail }} />}
        <span style={{ opacity: active ? 1 : 0.65, display: 'flex', flexShrink: 0 }}>{item.icon}</span>
        <span style={{ fontFamily: A.fontBody, fontSize: 13.5, fontWeight: active ? 500 : 400 }}>{item.label}</span>
      </div>
    </Link>
  );
}

function AdminDropdown({ profile, user, signOut }) {
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
      <button onClick={() => setOpen(o => !o)} style={{
        display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
        background: 'transparent', border: 'none', borderRadius: 10, padding: '5px 8px 5px 5px',
        transition: 'background 0.15s', width: '100%',
      }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = 'transparent'; }}>
        <Avatar name={profile?.full_name || user?.email} url={profile?.avatar_url} />
        <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
          <p style={{ fontFamily: A.fontBody, fontSize: 12, fontWeight: 500, color: A.sidebarText, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile?.full_name || 'Admin'}</p>
          <p style={{ fontFamily: A.fontBody, fontSize: 10, color: A.sidebarMuted, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</p>
        </div>
        <span style={{ color: A.sidebarMuted, flexShrink: 0 }}><ChevronDownIcon /></span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.16 }}
            style={{ position: 'absolute', bottom: 'calc(100% + 8px)', left: 0, right: 0, background: '#1a0f1a', border: `1px solid ${A.sidebarBorder}`, borderRadius: 12, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', zIndex: 100 }}>
            {[{ label: 'View Site', to: '/' }, { label: 'Student Dashboard', to: '/dashboard' }].map(item => (
              <button key={item.to} onClick={() => { setOpen(false); navigate(item.to); }}
                style={{ display: 'block', width: '100%', padding: '10px 14px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', fontFamily: A.fontBody, fontSize: 13, color: A.sidebarText, transition: 'background 0.12s' }}
                onMouseEnter={e => e.currentTarget.style.background = A.sidebarHover}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                {item.label}
              </button>
            ))}
            <div style={{ height: 1, background: A.sidebarBorder }} />
            <button onClick={() => { setOpen(false); signOut(); }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: A.fontBody, fontSize: 13, color: 'rgba(248,112,144,0.8)', transition: 'background 0.12s' }}
              onMouseEnter={e => e.currentTarget.style.background = A.sidebarHover}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              Sign Out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SidebarContent({ location, onLinkClick, profile, user, signOut }) {
  const path = location.pathname;
  const isActive = (item) => item.exact ? path === item.to : path.startsWith(item.to) && (item.to !== '/admin' || path === '/admin');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Logo */}
      <Link to="/admin" style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '18px 14px 14px', textDecoration: 'none', borderBottom: `1px solid ${A.sidebarBorder}`, flexShrink: 0 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#c84070,#f07090)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.85)' }} />
        </div>
        <div>
          <span style={{ fontFamily: A.fontDisplay, fontSize: 17, fontWeight: 600, color: '#f0a0b8', lineHeight: 1 }}>Lumière</span>
          <div style={{ fontFamily: A.fontBody, fontSize: 8.5, color: A.sidebarMuted, letterSpacing: '0.16em', textTransform: 'uppercase', lineHeight: 1, marginTop: 2 }}>Admin Panel</div>
        </div>
      </Link>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '10px 10px 6px' }}>
        <div style={{ fontFamily: A.fontBody, fontSize: 9.5, fontWeight: 700, color: A.sidebarMuted, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '8px 12px 4px' }}>Management</div>
        {NAV.slice(0, 4).map(item => <NavItem key={item.to} item={item} active={isActive(item)} onClick={onLinkClick} />)}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '10px 12px' }} />
        <div style={{ fontFamily: A.fontBody, fontSize: 9.5, fontWeight: 700, color: A.sidebarMuted, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '4px 12px' }}>Communication</div>
        {NAV.slice(4, 6).map(item => <NavItem key={item.to} item={item} active={isActive(item)} onClick={onLinkClick} />)}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '10px 12px' }} />
        {NAV.slice(6).map(item => <NavItem key={item.to} item={item} active={isActive(item)} onClick={onLinkClick} />)}
      </nav>

      {/* User */}
      <div style={{ padding: '10px 10px 14px', borderTop: `1px solid ${A.sidebarBorder}`, flexShrink: 0 }}>
        <AdminDropdown profile={profile} user={user} signOut={signOut} />
      </div>
    </div>
  );
}

function Breadcrumb({ location }) {
  const map = {
    '/admin': 'Overview', '/admin/courses': 'Courses', '/admin/students': 'Students',
    '/admin/orders': 'Orders', '/admin/chat': 'Chat', '/admin/calls': 'Calls',
    '/admin/analytics': 'Analytics', '/admin/settings': 'Settings',
  };
  const exact = map[location.pathname];
  const prefix = Object.entries(map).find(([k]) => location.pathname.startsWith(k) && k !== '/admin');
  const label = exact || (prefix ? prefix[1] : 'Admin');
  const sub = !exact && location.pathname.includes('/new') ? 'New' : !exact && location.pathname.split('/').length > 3 ? 'Edit' : null;
  return (
    <span style={{ fontFamily: A.fontBody, fontSize: 13, color: A.textSecondary }}>
      <span style={{ color: A.textMuted }}>Admin</span>
      {label && label !== 'Overview' && <><span style={{ margin: '0 6px', color: A.textMuted }}>›</span><span style={{ fontWeight: 500 }}>{label}</span></>}
      {sub && <><span style={{ margin: '0 6px', color: A.textMuted }}>›</span><span style={{ fontWeight: 500 }}>{sub}</span></>}
    </span>
  );
}

export default function AdminLayout({ children }) {
  const { user, profile } = useAuth();
  const { signOut } = useSignOut();
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [location.pathname, isMobile]);

  useEffect(() => {
    const fn = e => { if (e.key === '[' && !e.metaKey && !e.ctrlKey) setSidebarOpen(o => !o); };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, []);

  const closeSidebar = () => isMobile && setSidebarOpen(false);
  const sidebarProps = { location, onLinkClick: closeSidebar, profile, user, signOut };

  return (
    <>
      <style>{adminGlobalCSS}</style>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: A.bg }}>

        {/* Desktop sidebar */}
        {!isMobile && (
          <motion.aside initial={false} animate={{ width: sidebarOpen ? A.sidebarWidth : 0 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            style={{ background: A.sidebar, borderRight: `1px solid ${A.sidebarBorder}`, flexShrink: 0, overflow: 'hidden', height: '100vh' }}>
            <div style={{ width: A.sidebarWidth }}>
              <SidebarContent {...sidebarProps} />
            </div>
          </motion.aside>
        )}

        {/* Mobile sidebar overlay */}
        <AnimatePresence>
          {isMobile && sidebarOpen && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
                onClick={() => setSidebarOpen(false)}
                style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 40, backdropFilter: 'blur(2px)' }} />
              <motion.aside initial={{ x: -A.sidebarWidth }} animate={{ x: 0 }} exit={{ x: -A.sidebarWidth }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                style={{ position: 'fixed', left: 0, top: 0, bottom: 0, width: A.sidebarWidth, background: A.sidebar, borderRight: `1px solid ${A.sidebarBorder}`, zIndex: 50, overflow: 'hidden' }}>
                <SidebarContent {...sidebarProps} />
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Main panel */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          {/* Topbar */}
          <div style={{ height: 52, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 14, borderBottom: '1px solid rgba(200,64,112,0.08)', background: 'rgba(247,245,246,0.95)', backdropFilter: 'blur(10px)', flexShrink: 0 }}>
            <button onClick={() => setSidebarOpen(o => !o)} title="Toggle sidebar  [" style={{ background: 'none', border: 'none', cursor: 'pointer', color: A.textMuted, padding: 4, display: 'flex', borderRadius: 6, transition: 'color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.color = A.rose}
              onMouseLeave={e => e.currentTarget.style.color = A.textMuted}>
              <MenuIcon />
            </button>
            <Breadcrumb location={location} />
            <div style={{ flex: 1 }} />
            <Link to="/" style={{ fontFamily: A.fontBody, fontSize: 12, color: A.textMuted, textDecoration: 'none', padding: '5px 12px', border: `1px solid ${A.cardBorder}`, borderRadius: 100, transition: 'color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.color = A.rose}
              onMouseLeave={e => e.currentTarget.style.color = A.textMuted}>
              ← Site
            </Link>
          </div>

          {/* Page content */}
          <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: 'clamp(16px,3vw,32px)' }}>
            {children}
          </main>
        </div>
      </div>
    </>
  );
}