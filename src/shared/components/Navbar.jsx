import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { supabase } from "@/config/supabase";

const FONTS = {
  display: "'Cormorant Garamond', 'Playfair Display', Georgia, serif",
  body: "'DM Sans', 'Plus Jakarta Sans', system-ui, sans-serif",
};

export default function Navbar() {
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  // All hash links MUST go to the root path first, so they work from any page
  const links = [
    { label: "Courses", href: "/courses" },
    { label: "Curriculum", href: "/#curriculum" },
    { label: "Instructors", href: "/#instructors" },
    { label: "Pricing", href: "/#pricing" },
    { label: "FAQ", href: "/#faq" },
  ];

  // Render either a <Link> (internal route) or <a> (hash anchor)
  const renderLink = (l) => {
    if (l.href.includes("#")) {
      return (
        <a key={l.label} href={l.href} style={{
          fontFamily: FONTS.body, fontSize: 14, fontWeight: 500,
          color: "#5a2030", textDecoration: "none", letterSpacing: "0.01em",
          transition: "color 0.2s",
        }}
          onMouseEnter={e => e.target.style.color = "#c84070"}
          onMouseLeave={e => e.target.style.color = "#5a2030"}
        >{l.label}</a>
      );
    }
    return (
      <Link key={l.label} to={l.href} style={{
        fontFamily: FONTS.body, fontSize: 14, fontWeight: 500,
        color: "#5a2030", textDecoration: "none", letterSpacing: "0.01em",
        transition: "color 0.2s",
      }}
        onMouseEnter={e => e.target.style.color = "#c84070"}
        onMouseLeave={e => e.target.style.color = "#5a2030"}
      >{l.label}</Link>
    );
  };

  // Mobile link renderer (same logic)
  const renderMobileLink = (l, i) => {
    if (l.href.includes("#")) {
      return (
        <motion.a key={l.label} href={l.href}
          initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
          onClick={() => setMobileOpen(false)}
          style={{
            display: "block", padding: "14px 0", fontFamily: FONTS.body, fontSize: 16,
            fontWeight: 500, color: "#5a2030", textDecoration: "none",
            borderBottom: i < links.length - 1 ? "1px solid rgba(200,64,112,0.1)" : "none",
          }}
        >{l.label}</motion.a>
      );
    }
    return (
      <Link key={l.label} to={l.href}
        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
        onClick={() => setMobileOpen(false)}
        style={{
          display: "block", padding: "14px 0", fontFamily: FONTS.body, fontSize: 16,
          fontWeight: 500, color: "#5a2030", textDecoration: "none",
          borderBottom: i < links.length - 1 ? "1px solid rgba(200,64,112,0.1)" : "none",
        }}
      >{l.label}</Link>
    );
  };

  return (
    <>
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
          padding: scrolled ? "12px 24px" : "20px 24px",
          transition: "padding 0.3s ease",
        }}
      >
        <div style={{
          maxWidth: 1200, margin: "0 auto",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: scrolled ? "rgba(255,248,250,0.88)" : "transparent",
          backdropFilter: scrolled ? "blur(20px)" : "none",
          border: scrolled ? "1px solid rgba(255,180,200,0.3)" : "none",
          borderRadius: 100, padding: scrolled ? "10px 24px" : "0",
          transition: "all 0.4s cubic-bezier(0.22,1,0.36,1)",
          boxShadow: scrolled ? "0 4px 30px rgba(180,60,90,0.1)" : "none",
        }}>
          {/* Logo – wraps to home */}
          <Link to="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
            <motion.div whileHover={{ scale: 1.02 }} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: "linear-gradient(135deg, #c84070, #f07090)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 4px 12px rgba(200,64,112,0.3)",
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2C8 2 5 5 5 9c0 2.5 1.2 4.7 3 6l-1 4h10l-1-4c1.8-1.3 3-3.5 3-6 0-4-3-7-7-7z" fill="white" fillOpacity="0.9"/>
                  <circle cx="12" cy="9" r="2.5" fill="white" fillOpacity="0.6"/>
                </svg>
              </div>
              <div>
                <div style={{ fontFamily: FONTS.display, fontSize: 18, fontWeight: 600, color: "#3a0818", lineHeight: 1 }}>Lumière</div>
                <div style={{ fontFamily: FONTS.body, fontSize: 10, color: "#c84070", letterSpacing: "0.12em", textTransform: "uppercase", lineHeight: 1.2 }}>Beauty Academy</div>
              </div>
            </motion.div>
          </Link>

          {/* Desktop Links */}
          <div style={{ display: "flex", alignItems: "center", gap: 32 }} className="desktop-nav">
            {links.map((l) => renderLink(l))}
          </div>

          {/* CTA */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {user ? (
              <>
                <Link to="/dashboard" className="btn-ghost" style={{ fontSize: 13, padding: "10px 20px" }}>Dashboard</Link>
                <button
                  onClick={() => supabase.auth.signOut()}
                  className="btn-ghost"
                  style={{ fontSize: 13, padding: "10px 20px" }}
                >Sign Out</button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-ghost" style={{ fontSize: 13, padding: "10px 20px", display: window.innerWidth < 640 ? "none" : "inline-flex" }}>Sign In</Link>
                <Link to="/courses" className="btn-primary" style={{ fontSize: 13, padding: "10px 20px" }}>Explore Courses</Link>
              </>
            )}
            <button onClick={() => setMobileOpen(!mobileOpen)} style={{
              display: "none", background: "none", border: "none", cursor: "pointer",
              padding: 8, color: "#c84070",
            }} className="mobile-menu-btn">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {mobileOpen ? <path d="M6 18L18 6M6 6l12 12"/> : <path d="M3 12h18M3 6h18M3 18h18"/>}
              </svg>
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{
              position: "fixed", top: 80, left: 16, right: 16, zIndex: 99,
              background: "rgba(255,248,250,0.95)",
              backdropFilter: "blur(20px)", borderRadius: 20,
              border: "1px solid rgba(255,180,200,0.3)",
              padding: "20px 24px",
              boxShadow: "0 20px 60px rgba(180,60,90,0.15)",
            }}
          >
            {links.map((l, i) => renderMobileLink(l, i))}
            <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
              {user ? (
                <>
                  <Link to="/dashboard" className="btn-primary" style={{ flex: 1, justifyContent: "center", fontSize: 14 }}>Dashboard</Link>
                  <button
                    onClick={() => { supabase.auth.signOut(); setMobileOpen(false); }}
                    className="btn-ghost" style={{ flex: 1, justifyContent: "center", fontSize: 14 }}
                  >Sign Out</button>
                </>
              ) : (
                <>
                  <Link to="/login" className="btn-ghost" style={{ flex: 1, justifyContent: "center", fontSize: 14 }}>Sign In</Link>
                  <Link to="/courses" className="btn-primary" style={{ flex: 1, justifyContent: "center", fontSize: 14 }}>Explore Courses</Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: block !important; }
        }
      `}</style>
    </>
  );
}