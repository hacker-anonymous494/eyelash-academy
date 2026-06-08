import { useState, useEffect, useRef } from "react";
import { motion, useInView, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { useAuth } from '@/features/auth/hooks/useAuth';
import { supabase } from '@/config/supabase';
import BackgroundBlobs from '@/shared/components/BackgroundBlobs';

// ─── Design Tokens ───────────────────────────────────────────────────────────
const COLORS = {
  rose: { 50: "#fff1f5", 100: "#ffe0e9", 200: "#ffc0d0", 400: "#f87096", 600: "#e03060", 800: "#8b1a36" },
  blush: { 50: "#fef6f8", 100: "#fce8ee", 200: "#f9d0db", 400: "#f0a0b8", 600: "#c96080", 800: "#7a2040" },
  cream: { 50: "#fffaf7", 100: "#fff3ec", 200: "#ffe8d6", 400: "#f5c89a", 600: "#c89060", 800: "#7a4820" },
  gold: { 50: "#fffdf0", 100: "#fdf5c0", 200: "#fae880", 400: "#f0c840", 600: "#c09010", 800: "#7a5800" },
  nude: { 50: "#fdf8f5", 100: "#f5ece5", 200: "#ead8cc", 400: "#d0b09a", 600: "#a07856", 800: "#5c3820" },
};

const FONTS = {
  display: "'Cormorant Garamond', 'Playfair Display', Georgia, serif",
  body: "'DM Sans', 'Plus Jakarta Sans', system-ui, sans-serif",
  mono: "'DM Mono', monospace",
};

// ─── Animation Presets ───────────────────────────────────────────────────────
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 32 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1], delay },
});

const fadeIn = (delay = 0) => ({
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.6, delay },
});

const scaleIn = (delay = 0) => ({
  initial: { opacity: 0, scale: 0.92 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1], delay },
});

function useScrollReveal() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return [ref, inView];
}

// ─── Global Styles (injected once) ───────────────────────────────────────────
function GlobalStyles() {
  useEffect(() => {
    const link1 = document.createElement("link");
    link1.rel = "stylesheet";
    link1.href = "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400;1,500&family=DM+Sans:wght@300;400;500;600&display=swap";
    document.head.appendChild(link1);

    const style = document.createElement("style");
    style.textContent = `
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      html { scroll-behavior: smooth; }
      body { font-family: ${FONTS.body}; background: #fffaf7; color: #1a0a0a; -webkit-font-smoothing: antialiased; }
      ::selection { background: #ffc0d0; color: #5a0020; }
      ::-webkit-scrollbar { width: 6px; }
      ::-webkit-scrollbar-track { background: #fff1f5; }
      ::-webkit-scrollbar-thumb { background: #f0a0b8; border-radius: 3px; }

      .glass {
        background: rgba(255, 245, 248, 0.65);
        backdrop-filter: blur(24px) saturate(180%);
        -webkit-backdrop-filter: blur(24px) saturate(180%);
        border: 1px solid rgba(255, 180, 200, 0.35);
      }
      .glass-dark {
        background: rgba(90, 20, 40, 0.55);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 180, 200, 0.2);
      }
      .gradient-text {
        background: linear-gradient(135deg, #c84070 0%, #e87090 40%, #c05040 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      .gradient-text-gold {
        background: linear-gradient(135deg, #b07820 0%, #e0a840 50%, #c09010 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      .btn-primary {
        display: inline-flex; align-items: center; gap: 8px;
        background: linear-gradient(135deg, #c84070, #e87090);
        color: white; font-family: ${FONTS.body}; font-weight: 500; font-size: 15px;
        padding: 14px 28px; border-radius: 100px; border: none; cursor: pointer;
        transition: all 0.3s cubic-bezier(0.22,1,0.36,1);
        box-shadow: 0 4px 20px rgba(200,64,112,0.35);
        text-decoration: none; letter-spacing: 0.01em;
      }
      .btn-primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 32px rgba(200,64,112,0.45);
        background: linear-gradient(135deg, #b83060, #d86080);
      }
      .btn-primary:active { transform: translateY(0); }
      .btn-ghost {
        display: inline-flex; align-items: center; gap: 8px;
        background: transparent; color: #c84070;
        font-family: ${FONTS.body}; font-weight: 500; font-size: 15px;
        padding: 13px 27px; border-radius: 100px;
        border: 1.5px solid rgba(200,64,112,0.4); cursor: pointer;
        transition: all 0.25s ease; text-decoration: none; letter-spacing: 0.01em;
      }
      .btn-ghost:hover {
        background: rgba(200,64,112,0.08);
        border-color: rgba(200,64,112,0.7);
      }
      .section-tag {
        display: inline-flex; align-items: center; gap: 6px;
        background: linear-gradient(135deg, rgba(248,112,150,0.12), rgba(200,64,112,0.08));
        border: 1px solid rgba(200,64,112,0.2);
        color: #c84070; font-size: 12px; font-weight: 500; letter-spacing: 0.1em;
        text-transform: uppercase; padding: 6px 14px; border-radius: 100px;
      }
      .card-hover {
        transition: transform 0.3s cubic-bezier(0.22,1,0.36,1), box-shadow 0.3s ease;
      }
      .card-hover:hover {
        transform: translateY(-4px);
        box-shadow: 0 20px 60px rgba(180,60,90,0.15) !important;
      }
      @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
      @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
      @keyframes pulse-ring { 0%{transform:scale(0.85);opacity:0.7} 100%{transform:scale(1.15);opacity:0} }
      .float { animation: float 6s ease-in-out infinite; }
      .float-delay { animation: float 6s ease-in-out infinite; animation-delay: 2s; }
      .ornament { font-family: ${FONTS.display}; font-style: italic; }
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(link1); document.head.removeChild(style); };
  }, []);
  return null;
}

// ─── Navbar ──────────────────────────────────────────────────────────────────
function Navbar() {
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const links = ["Curriculum", "Instructors", "Pricing", "FAQ"];

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
          {/* Logo */}
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

          {/* Desktop Links */}
          <div style={{ display: "flex", alignItems: "center", gap: 32 }} className="desktop-nav">
            {links.map((l) => (
              <a key={l} href={`#${l.toLowerCase()}`} style={{
                fontFamily: FONTS.body, fontSize: 14, fontWeight: 500,
                color: "#5a2030", textDecoration: "none", letterSpacing: "0.01em",
                transition: "color 0.2s",
              }}
                onMouseEnter={e => e.target.style.color = "#c84070"}
                onMouseLeave={e => e.target.style.color = "#5a2030"}
              >{l}</a>
            ))}
          </div>

          {/* CTA */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {user ? (
              <>
                <a href="/dashboard" className="btn-ghost" style={{ fontSize: 13, padding: "10px 20px" }}>Dashboard</a>
                <button
                  onClick={() => supabase.auth.signOut()}
                  className="btn-ghost"
                  style={{ fontSize: 13, padding: "10px 20px" }}
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <a href="/login" className="btn-ghost" style={{ fontSize: 13, padding: "10px 20px", display: window.innerWidth < 640 ? "none" : "inline-flex" }}>Sign In</a>
                <a href="#pricing" className="btn-primary" style={{ fontSize: 13, padding: "10px 20px" }}>Enroll Now →</a>
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
            {links.map((l, i) => (
              <motion.a key={l} href={`#${l.toLowerCase()}`}
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                onClick={() => setMobileOpen(false)}
                style={{
                  display: "block", padding: "14px 0", fontFamily: FONTS.body, fontSize: 16,
                  fontWeight: 500, color: "#5a2030", textDecoration: "none",
                  borderBottom: i < links.length - 1 ? "1px solid rgba(200,64,112,0.1)" : "none",
                }}
              >{l}</motion.a>
            ))}
            <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
              <a href="#" className="btn-ghost" style={{ flex: 1, justifyContent: "center", fontSize: 14 }}>Sign In</a>
              <a href="#pricing" className="btn-primary" style={{ flex: 1, justifyContent: "center", fontSize: 14 }}>Enroll →</a>
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

// ─── Hero ────────────────────────────────────────────────────────────────────
function Hero() {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 600], [0, -80]);
  const opacity = useTransform(scrollY, [0, 400], [1, 0]);

  const stats = [
    { n: "12,000+", l: "Graduates" },
    { n: "4.9★", l: "Rating" },
    { n: "50+", l: "Techniques" },
    { n: "Lifetime", l: "Access" },
  ];

  return (
    <section style={{
      minHeight: "100vh", position: "relative", overflow: "hidden",
      background: "linear-gradient(160deg, #fff6f9 0%, #fdf2ee 40%, #fff0f4 100%)",
      display: "flex", alignItems: "center", padding: "120px 24px 80px",
    }}>
      <BackgroundBlobs section="hero" />

      {/* Decorative lines */}
      <div style={{ position: "absolute", top: "15%", right: "8%", opacity: 0.12 }}>
        <svg width="200" height="200" viewBox="0 0 200 200" fill="none">
          <circle cx="100" cy="100" r="80" stroke="#c84070" strokeWidth="0.5"/>
          <circle cx="100" cy="100" r="60" stroke="#c84070" strokeWidth="0.5"/>
          <circle cx="100" cy="100" r="40" stroke="#c84070" strokeWidth="0.5"/>
          <line x1="20" y1="100" x2="180" y2="100" stroke="#c84070" strokeWidth="0.5"/>
          <line x1="100" y1="20" x2="100" y2="180" stroke="#c84070" strokeWidth="0.5"/>
        </svg>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", width: "100%", position: "relative", zIndex: 1 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }}
          className="hero-grid">
          {/* Left */}
          <motion.div style={{ y, opacity }}>
            <motion.div {...fadeIn(0.1)} style={{ marginBottom: 24 }}>
              <span className="section-tag">
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#e87090", display: "inline-block" }}/>
                Certified Professional Training
              </span>
            </motion.div>

            <motion.h1 {...fadeUp(0.2)} style={{
              fontFamily: FONTS.display, fontWeight: 600, lineHeight: 1.08,
              fontSize: "clamp(44px, 6vw, 78px)", color: "#1a0810", marginBottom: 24,
              letterSpacing: "-0.02em",
            }}>
              Master the Art of{" "}
              <span className="gradient-text" style={{ display: "block", fontStyle: "italic" }}>
                Eyelash Extension
              </span>
            </motion.h1>

            <motion.p {...fadeUp(0.3)} style={{
              fontFamily: FONTS.body, fontSize: "clamp(16px, 2vw, 18px)", color: "#6a3040",
              lineHeight: 1.7, maxWidth: 480, marginBottom: 40, fontWeight: 300,
            }}>
              Learn from world-class artists. Master every technique from classic to mega-volume. 
              Launch your luxury beauty career with confidence.
            </motion.p>

            <motion.div {...fadeUp(0.4)} style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 52 }}>
              <a href="#curriculum" className="btn-primary" style={{ fontSize: 16, padding: "16px 32px" }}>
                Start Learning Free
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </a>
              <a href="#" className="btn-ghost" style={{ fontSize: 16, padding: "16px 32px" }}>
                Watch Preview
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" fill="rgba(200,64,112,0.12)" stroke="#c84070" strokeWidth="1.5"/><polygon points="10,8 16,12 10,16" fill="#c84070"/></svg>
              </a>
            </motion.div>

            {/* Stats */}
            <motion.div {...fadeUp(0.5)} style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
              {stats.map((s, i) => (
                <div key={i}>
                  <div style={{ fontFamily: FONTS.display, fontSize: 24, fontWeight: 600, color: "#c84070", lineHeight: 1 }}>{s.n}</div>
                  <div style={{ fontFamily: FONTS.body, fontSize: 12, color: "#8a4050", letterSpacing: "0.06em", textTransform: "uppercase", marginTop: 3 }}>{s.l}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right — Visual */}
          <motion.div {...scaleIn(0.3)} style={{ position: "relative" }} className="hero-visual">
            {/* Main card */}
            <div style={{
              background: "linear-gradient(145deg, rgba(255,240,244,0.9), rgba(255,250,248,0.8))",
              backdropFilter: "blur(30px)", border: "1px solid rgba(255,180,200,0.5)",
              borderRadius: 32, padding: 8, boxShadow: "0 30px 80px rgba(180,60,90,0.2)",
              overflow: "hidden",
            }}>
              {/* Decorative gradient image area */}
              <div style={{
                borderRadius: 26, overflow: "hidden", aspectRatio: "4/5",
                background: "linear-gradient(160deg, #f5c0d0 0%, #e89090 30%, #c06080 60%, #8a2040 100%)",
                position: "relative", minHeight: 420,
              }}>
                {/* Abstract beauty illustration */}
                <svg viewBox="0 0 400 500" style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }} preserveAspectRatio="xMidYMid slice">
                  <defs>
                    <radialGradient id="g1" cx="50%" cy="40%" r="60%">
                      <stop offset="0%" stopColor="#ffd0dc" stopOpacity="0.6"/>
                      <stop offset="100%" stopColor="#8a2040" stopOpacity="0"/>
                    </radialGradient>
                    <radialGradient id="g2" cx="70%" cy="70%" r="40%">
                      <stop offset="0%" stopColor="#f0a0a0" stopOpacity="0.5"/>
                      <stop offset="100%" stopColor="transparent"/>
                    </radialGradient>
                  </defs>
                  <rect width="400" height="500" fill="url(#g1)"/>
                  <rect width="400" height="500" fill="url(#g2)"/>
                  {/* Lashes illustration */}
                  {[...Array(12)].map((_, i) => {
                    const x = 120 + i * 14;
                    const bend = i < 6 ? -1 : 1;
                    const len = 30 + Math.abs(i - 5.5) * 3;
                    return (
                      <g key={i}>
                        <path
                          d={`M${x},250 Q${x + bend * 8},${250 - len / 2} ${x + bend * 16},${250 - len}`}
                          stroke="rgba(40,10,20,0.85)" strokeWidth={i === 0 || i === 11 ? 1 : 2.5}
                          fill="none" strokeLinecap="round"
                        />
                      </g>
                    );
                  })}
                  {/* Eye shape */}
                  <path d="M100,260 Q200,220 300,260 Q200,300 100,260 Z" fill="rgba(255,200,210,0.4)" stroke="rgba(180,60,90,0.3)" strokeWidth="1"/>
                  <ellipse cx="200" cy="265" rx="25" ry="22" fill="rgba(80,20,40,0.6)"/>
                  <ellipse cx="200" cy="263" rx="12" ry="10" fill="rgba(20,5,10,0.9)"/>
                  <ellipse cx="195" cy="260" rx="4" ry="3" fill="rgba(255,255,255,0.5)"/>
                  {/* Floating particles */}
                  {[...Array(20)].map((_, i) => (
                    <circle key={i}
                      cx={50 + Math.random() * 300}
                      cy={50 + Math.random() * 400}
                      r={1 + Math.random() * 2}
                      fill={`rgba(255,200,210,${0.3 + Math.random() * 0.5})`}
                    />
                  ))}
                  {/* Text overlay */}
                  <text x="200" y="390" textAnchor="middle" fontFamily="'Cormorant Garamond', serif" fontSize="22" fill="rgba(255,240,245,0.9)" fontStyle="italic">Master the Craft</text>
                  <text x="200" y="415" textAnchor="middle" fontFamily="sans-serif" fontSize="11" fill="rgba(255,200,215,0.7)" letterSpacing="3">LUMIÈRE ACADEMY</text>
                </svg>
              </div>
            </div>

            {/* Floating badge — students online */}
            <motion.div
              animate={{ y: [0, -8, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              style={{
                position: "absolute", top: 24, left: -24,
                background: "rgba(255,248,250,0.95)", backdropFilter: "blur(20px)",
                border: "1px solid rgba(255,180,200,0.4)",
                borderRadius: 16, padding: "12px 16px",
                boxShadow: "0 8px 32px rgba(180,60,90,0.15)",
                display: "flex", alignItems: "center", gap: 10, minWidth: 180,
              }}
            >
              <div style={{ position: "relative" }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#f87096,#c84070)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </div>
                <div style={{ position: "absolute", bottom: 0, right: 0, width: 10, height: 10, borderRadius: "50%", background: "#4caf50", border: "2px solid white" }}/>
              </div>
              <div>
                <div style={{ fontFamily: FONTS.body, fontSize: 13, fontWeight: 600, color: "#2a0818" }}>2,481 online</div>
                <div style={{ fontFamily: FONTS.body, fontSize: 11, color: "#8a4050" }}>Students learning now</div>
              </div>
            </motion.div>

            {/* Floating badge — certificate */}
            <motion.div
              animate={{ y: [0, 10, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
              style={{
                position: "absolute", bottom: 32, right: -20,
                background: "linear-gradient(135deg, rgba(200,64,112,0.95), rgba(180,40,80,0.95))",
                backdropFilter: "blur(20px)",
                borderRadius: 16, padding: "12px 16px",
                boxShadow: "0 8px 32px rgba(200,64,112,0.4)",
                minWidth: 160,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="rgba(255,220,230,0.9)"><path d="M12 15l-3.5 2 .9-4L5 9.5l4.1-.4L12 5.5l2.9 3.6 4.1.4-4.4 3.5.9 4z"/></svg>
                <span style={{ fontFamily: FONTS.body, fontSize: 13, fontWeight: 600, color: "rgba(255,240,245,0.95)" }}>Certified Program</span>
              </div>
              <div style={{ fontFamily: FONTS.body, fontSize: 11, color: "rgba(255,200,215,0.8)", marginTop: 3 }}>Industry Recognized</div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .hero-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
          .hero-visual { display: none; }
        }
      `}</style>
    </section>
  );
}

// ─── Course Curriculum ────────────────────────────────────────────────────────
function Curriculum() {
  const [ref, inView] = useScrollReveal();
  const [activeModule, setActiveModule] = useState(0);

  const modules = [
    {
      id: 1, badge: "Module 01", title: "Foundation & Safety",
      lessons: 8, duration: "4h 30m", icon: "🎯",
      color: "#f87096",
      topics: ["Anatomy of the eye & lash cycle", "Health & safety protocols", "Allergy testing & contraindications", "Tool sterilization & hygiene", "Client consultation mastery", "Patch testing procedures", "Workspace setup & ergonomics", "Insurance & legalities"],
    },
    {
      id: 2, badge: "Module 02", title: "Classic Lashes",
      lessons: 12, duration: "7h 15m", icon: "✨",
      color: "#c84070",
      topics: ["Natural lash mapping", "Classic 1:1 application", "Isolation techniques", "Curl & length selection", "Adhesive mastery", "Timing & curing", "Lash wrapping method", "Client aftercare"],
    },
    {
      id: 3, badge: "Module 03", title: "Volume Lashes",
      lessons: 14, duration: "9h 00m", icon: "💫",
      color: "#a03060",
      topics: ["Russian volume techniques", "Fan creation methods", "2D–10D mega volume", "Promade vs handmade fans", "Weight distribution", "Natural mega volume look", "Speed fanning mastery", "Advanced mapping designs"],
    },
    {
      id: 4, badge: "Module 04", title: "Specialty Styles",
      lessons: 10, duration: "6h 45m", icon: "🌸",
      color: "#e09060",
      topics: ["Wispy & textured sets", "Kim K style sets", "Wet look lashes", "Coloured & glitter lashes", "Cat eye mapping", "Doll eye design", "Natural brow-lift look", "Custom creative mapping"],
    },
    {
      id: 5, badge: "Module 05", title: "Business Mastery",
      lessons: 8, duration: "5h 00m", icon: "💼",
      color: "#c06840",
      topics: ["Pricing your services", "Social media marketing", "Building a clientele", "Photography & portfolio", "Booking systems & software", "Financial management", "Legal requirements", "Scaling your business"],
    },
  ];

  return (
    <section id="curriculum" style={{
      padding: "120px 24px", position: "relative",
      background: "linear-gradient(180deg, #fff0f4 0%, #fffaf7 100%)",
      overflow: "hidden",
    }}>
      <BackgroundBlobs section="mid" />

      <div ref={ref} style={{ maxWidth: 1200, margin: "0 auto", position: "relative", zIndex: 1 }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }} animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          style={{ textAlign: "center", marginBottom: 72 }}
        >
          <span className="section-tag" style={{ marginBottom: 20, display: "inline-flex" }}>Complete Curriculum</span>
          <h2 style={{
            fontFamily: FONTS.display, fontSize: "clamp(36px, 5vw, 60px)", fontWeight: 600,
            color: "#1a0810", lineHeight: 1.1, letterSpacing: "-0.02em", marginBottom: 20,
          }}>
            From beginner to{" "}
            <span className="gradient-text" style={{ fontStyle: "italic" }}>master artist</span>
          </h2>
          <p style={{ fontFamily: FONTS.body, fontSize: 18, color: "#6a3040", maxWidth: 560, margin: "0 auto", lineHeight: 1.6, fontWeight: 300 }}>
            52 professional lessons across 5 comprehensive modules. Everything you need to build a thriving lash career.
          </p>
        </motion.div>

        <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 32, alignItems: "start" }} className="curriculum-grid">
          {/* Module list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {modules.map((m, i) => (
              <motion.button
                key={m.id}
                initial={{ opacity: 0, x: -20 }} animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: i * 0.08 + 0.2 }}
                onClick={() => setActiveModule(i)}
                style={{
                  background: activeModule === i
                    ? `linear-gradient(135deg, ${m.color}18, ${m.color}0a)`
                    : "rgba(255,255,255,0.6)",
                  border: activeModule === i ? `1.5px solid ${m.color}40` : "1px solid rgba(200,64,112,0.1)",
                  borderRadius: 16, padding: "16px 20px", cursor: "pointer", textAlign: "left",
                  transition: "all 0.25s ease",
                  boxShadow: activeModule === i ? `0 4px 20px ${m.color}20` : "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 12, fontSize: 18,
                    background: activeModule === i ? `${m.color}20` : "rgba(200,64,112,0.08)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>{m.icon}</div>
                  <div>
                    <div style={{ fontFamily: FONTS.body, fontSize: 11, color: m.color, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>{m.badge}</div>
                    <div style={{ fontFamily: FONTS.body, fontSize: 14, fontWeight: 600, color: "#2a0818", marginTop: 1 }}>{m.title}</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 16, marginTop: 10, paddingLeft: 52 }}>
                  <span style={{ fontFamily: FONTS.body, fontSize: 12, color: "#8a4050" }}>📚 {m.lessons} lessons</span>
                  <span style={{ fontFamily: FONTS.body, fontSize: 12, color: "#8a4050" }}>⏱ {m.duration}</span>
                </div>
              </motion.button>
            ))}
          </div>

          {/* Module detail */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeModule}
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.35 }}
              style={{
                background: "rgba(255,255,255,0.8)", backdropFilter: "blur(20px)",
                border: "1px solid rgba(200,64,112,0.15)",
                borderRadius: 24, padding: "40px",
                boxShadow: "0 8px 40px rgba(180,60,90,0.1)",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 20, marginBottom: 32 }}>
                <div style={{
                  width: 64, height: 64, borderRadius: 18, fontSize: 28,
                  background: `linear-gradient(135deg, ${modules[activeModule].color}20, ${modules[activeModule].color}10)`,
                  border: `1px solid ${modules[activeModule].color}30`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>{modules[activeModule].icon}</div>
                <div>
                  <div style={{ fontFamily: FONTS.body, fontSize: 12, color: modules[activeModule].color, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>{modules[activeModule].badge}</div>
                  <h3 style={{ fontFamily: FONTS.display, fontSize: 28, fontWeight: 600, color: "#1a0810", marginTop: 4 }}>{modules[activeModule].title}</h3>
                  <div style={{ display: "flex", gap: 20, marginTop: 8 }}>
                    <span style={{ fontFamily: FONTS.body, fontSize: 13, color: "#8a4050" }}>📚 {modules[activeModule].lessons} lessons</span>
                    <span style={{ fontFamily: FONTS.body, fontSize: 13, color: "#8a4050" }}>⏱ {modules[activeModule].duration}</span>
                    <span style={{ fontFamily: FONTS.body, fontSize: 13, color: "#4caf80" }}>✓ Certificate included</span>
                  </div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {modules[activeModule].topics.map((t, i) => (
                  <motion.div key={i}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "12px 16px", borderRadius: 12,
                      background: "rgba(248,112,150,0.05)",
                      border: "1px solid rgba(200,64,112,0.08)",
                    }}
                  >
                    <div style={{ width: 20, height: 20, borderRadius: "50%", background: `${modules[activeModule].color}20`, border: `1px solid ${modules[activeModule].color}40`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={modules[activeModule].color} strokeWidth="3"><path d="M5 13l4 4L19 7"/></svg>
                    </div>
                    <span style={{ fontFamily: FONTS.body, fontSize: 13, color: "#4a2028", lineHeight: 1.3 }}>{t}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .curriculum-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}

// ─── Testimonials ─────────────────────────────────────────────────────────────
function Testimonials() {
  const [ref, inView] = useScrollReveal();
  const [current, setCurrent] = useState(0);

  const testimonials = [
    {
      name: "Sofia Marchetti", role: "Lash Artist, Milan", avatar: "SM", rating: 5,
      text: "Lumière completely transformed my career. Within 3 months of completing the course, I had a 6-week waitlist. The volume techniques alone are worth 10x the price.",
      result: "Went from zero to $8,000/month in 4 months",
      bg: "#f87096",
    },
    {
      name: "Priya Nair", role: "Beauty Salon Owner, London", avatar: "PN", rating: 5,
      text: "I've tried four other online courses. Nothing comes close. The level of detail, the video quality, the instructor feedback — it's genuinely world-class.",
      result: "Opened her own studio within 6 months",
      bg: "#c84070",
    },
    {
      name: "Mia Johansson", role: "Freelance Artist, Stockholm", avatar: "MJ", rating: 5,
      text: "The business module changed everything. I had the skills but not the clients. Now I'm fully booked and just hired my first employee. Worth every penny.",
      result: "Fully booked within 8 weeks of graduating",
      bg: "#e09060",
    },
    {
      name: "Isabella Santos", role: "Spa Director, São Paulo", avatar: "IS", rating: 5,
      text: "As a spa director, I enrolled my entire team. The consistency in their work improved dramatically. Our lash services now generate 40% of total revenue.",
      result: "Team trained, revenue up 40%",
      bg: "#a03060",
    },
  ];

  return (
    <section style={{
      padding: "120px 24px",
      background: "linear-gradient(160deg, #3a0818 0%, #1a0408 50%, #2a0e1a 100%)",
      position: "relative", overflow: "hidden",
    }}>
      <BackgroundBlobs section="dark" />

      {/* Decorative text */}
      <div style={{ position: "absolute", top: "5%", left: "-2%", fontFamily: FONTS.display, fontSize: 180, fontWeight: 700, color: "rgba(255,100,150,0.04)", lineHeight: 1, userSelect: "none", pointerEvents: "none" }}>
        Love
      </div>

      <div ref={ref} style={{ maxWidth: 1200, margin: "0 auto", position: "relative", zIndex: 1 }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }} animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          style={{ textAlign: "center", marginBottom: 72 }}
        >
          <span className="section-tag" style={{ marginBottom: 20, display: "inline-flex", background: "rgba(248,112,150,0.12)", borderColor: "rgba(248,112,150,0.3)", color: "#f87096" }}>Success Stories</span>
          <h2 style={{
            fontFamily: FONTS.display, fontSize: "clamp(36px, 5vw, 60px)", fontWeight: 600,
            color: "rgba(255,240,245,0.95)", lineHeight: 1.1, letterSpacing: "-0.02em", marginBottom: 16,
          }}>
            Our graduates are{" "}
            <span style={{ fontFamily: FONTS.display, fontStyle: "italic", color: "#f87096" }}>thriving</span>
          </h2>
          <p style={{ fontFamily: FONTS.body, fontSize: 17, color: "rgba(255,180,200,0.7)", maxWidth: 500, margin: "0 auto" }}>
            Join 12,000+ graduates who transformed their passion into a profitable career
          </p>
        </motion.div>

        {/* Main featured testimonial */}
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.45 }}
            style={{
              background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)",
              border: "1px solid rgba(255,180,200,0.15)",
              borderRadius: 28, padding: "52px 60px", marginBottom: 32,
              position: "relative", overflow: "hidden",
            }}
          >
            <div style={{ position: "absolute", top: -20, right: 60, fontFamily: FONTS.display, fontSize: 200, color: "rgba(255,100,150,0.06)", lineHeight: 1 }}>"</div>
            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 40, alignItems: "center" }} className="testimonial-inner">
              <div style={{ textAlign: "center" }}>
                <div style={{
                  width: 80, height: 80, borderRadius: "50%",
                  background: `linear-gradient(135deg, ${testimonials[current].bg}, ${testimonials[current].bg}88)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: FONTS.display, fontSize: 24, fontWeight: 600, color: "white",
                  margin: "0 auto 12px", border: "2px solid rgba(255,180,200,0.3)",
                }}>{testimonials[current].avatar}</div>
                <div style={{ fontFamily: FONTS.body, fontSize: 14, fontWeight: 600, color: "rgba(255,240,245,0.9)" }}>{testimonials[current].name}</div>
                <div style={{ fontFamily: FONTS.body, fontSize: 12, color: "rgba(255,160,180,0.7)", marginTop: 2 }}>{testimonials[current].role}</div>
                <div style={{ display: "flex", justifyContent: "center", gap: 2, marginTop: 8 }}>
                  {[...Array(testimonials[current].rating)].map((_, i) => (
                    <span key={i} style={{ color: "#f0c840", fontSize: 14 }}>★</span>
                  ))}
                </div>
              </div>
              <div>
                <p style={{ fontFamily: FONTS.display, fontSize: "clamp(20px, 2.5vw, 28px)", color: "rgba(255,240,245,0.9)", lineHeight: 1.5, fontWeight: 400, fontStyle: "italic", marginBottom: 24 }}>
                  "{testimonials[current].text}"
                </p>
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  background: "rgba(248,112,150,0.12)", border: "1px solid rgba(248,112,150,0.25)",
                  borderRadius: 100, padding: "8px 18px",
                }}>
                  <span style={{ color: "#4caf80", fontSize: 14 }}>→</span>
                  <span style={{ fontFamily: FONTS.body, fontSize: 13, fontWeight: 500, color: "rgba(255,200,215,0.9)" }}>{testimonials[current].result}</span>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Dots */}
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 48 }}>
          {testimonials.map((_, i) => (
            <button key={i} onClick={() => setCurrent(i)} style={{
              width: i === current ? 28 : 8, height: 8,
              borderRadius: 100, border: "none", cursor: "pointer",
              background: i === current ? "#f87096" : "rgba(255,180,200,0.2)",
              transition: "all 0.3s ease",
            }}/>
          ))}
        </div>

        {/* Mini testimonial cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }} className="testimonial-mini-grid">
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.1 + 0.4 }}
              onClick={() => setCurrent(i)}
              className="card-hover"
              style={{
                background: i === current ? "rgba(248,112,150,0.1)" : "rgba(255,255,255,0.03)",
                border: i === current ? "1px solid rgba(248,112,150,0.35)" : "1px solid rgba(255,180,200,0.1)",
                borderRadius: 16, padding: "16px 20px", cursor: "pointer",
                transition: "all 0.25s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: `linear-gradient(135deg, ${t.bg}, ${t.bg}70)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: FONTS.display, fontSize: 13, color: "white", fontWeight: 600, flexShrink: 0,
                }}>{t.avatar}</div>
                <div>
                  <div style={{ fontFamily: FONTS.body, fontSize: 12, fontWeight: 600, color: "rgba(255,240,245,0.85)" }}>{t.name}</div>
                  <div style={{ fontFamily: FONTS.body, fontSize: 11, color: "rgba(255,160,180,0.6)" }}>{t.role}</div>
                </div>
              </div>
              <p style={{ fontFamily: FONTS.body, fontSize: 12, color: "rgba(255,200,215,0.6)", lineHeight: 1.5 }}>
                {t.text.substring(0, 80)}...
              </p>
            </motion.div>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .testimonial-mini-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 600px) {
          .testimonial-inner { grid-template-columns: 1fr !important; text-align: center; }
          .testimonial-mini-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}

// ─── Certificates ─────────────────────────────────────────────────────────────
function Certificates() {
  const [ref, inView] = useScrollReveal();

  const certFeatures = [
    { icon: "🏅", title: "Industry Recognised", desc: "Accepted by salons & spas globally. Carries weight with top employers in the beauty industry." },
    { icon: "🔗", title: "Verifiable Online", desc: "Each certificate has a unique QR code and URL for instant authentication by clients or employers." },
    { icon: "🎓", title: "CPD Accredited", desc: "Counts toward your Continuing Professional Development hours in most regions." },
    { icon: "📱", title: "Digital & Print Ready", desc: "High-resolution PDF certificate, shareable on LinkedIn, Instagram, and your portfolio website." },
  ];

  return (
    <section id="certificates" style={{
      padding: "120px 24px",
      background: "linear-gradient(180deg, #fffaf7 0%, #fff0f4 100%)",
      overflow: "hidden", position: "relative",
    }}>
      <div ref={ref} style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }} className="cert-grid">
          {/* Left */}
          <div>
            <motion.div initial={{ opacity: 0, y: 30 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.7 }}>
              <span className="section-tag" style={{ marginBottom: 20, display: "inline-flex" }}>Certification</span>
              <h2 style={{
                fontFamily: FONTS.display, fontSize: "clamp(34px, 4.5vw, 56px)", fontWeight: 600,
                color: "#1a0810", lineHeight: 1.1, letterSpacing: "-0.02em", marginBottom: 20,
              }}>
                Your certificate,{" "}
                <span className="gradient-text" style={{ fontStyle: "italic", display: "block" }}>your proof</span>
              </h2>
              <p style={{ fontFamily: FONTS.body, fontSize: 17, color: "#6a3040", lineHeight: 1.7, marginBottom: 40, fontWeight: 300 }}>
                Graduate with a globally recognised certification that opens doors. Our certificates are trusted by luxury salons, spas, and beauty industry employers worldwide.
              </p>
            </motion.div>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {certFeatures.map((f, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, x: -20 }} animate={inView ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: i * 0.1 + 0.3 }}
                  style={{
                    display: "flex", gap: 16, alignItems: "flex-start",
                    padding: "20px 24px", borderRadius: 16,
                    background: "rgba(255,255,255,0.7)", backdropFilter: "blur(10px)",
                    border: "1px solid rgba(200,64,112,0.1)",
                    boxShadow: "0 2px 20px rgba(180,60,90,0.06)",
                  }}
                >
                  <div style={{ fontSize: 24, flexShrink: 0, marginTop: 2 }}>{f.icon}</div>
                  <div>
                    <div style={{ fontFamily: FONTS.body, fontSize: 15, fontWeight: 600, color: "#2a0818", marginBottom: 4 }}>{f.title}</div>
                    <div style={{ fontFamily: FONTS.body, fontSize: 13, color: "#6a3040", lineHeight: 1.5 }}>{f.desc}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Right — Certificate visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, rotate: 2 }} animate={inView ? { opacity: 1, scale: 1, rotate: 0 } : {}}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            style={{ position: "relative" }}
          >
            {/* Shadow cert (behind) */}
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(145deg, #f0c0d0, #e09080)",
              borderRadius: 24, transform: "rotate(-3deg) translateY(12px)",
              opacity: 0.35,
            }}/>

            {/* Main certificate */}
            <div style={{
              background: "linear-gradient(145deg, #fffaf9, #fff5f0)",
              borderRadius: 24, padding: "48px",
              boxShadow: "0 24px 80px rgba(180,60,90,0.2)",
              border: "1px solid rgba(200,64,112,0.15)",
              position: "relative", overflow: "hidden",
            }}>
              {/* Corner ornaments */}
              {[{ tl: 0, tr: "auto", bl: "auto", br: 0, t: 0, b: "auto" },
                { tl: "auto", tr: 0, bl: "auto", br: 0, t: 0, b: "auto" },
                { tl: 0, tr: "auto", bl: 0, br: "auto", t: "auto", b: 0 },
                { tl: "auto", tr: 0, bl: 0, br: "auto", t: "auto", b: 0 }
              ].map((pos, i) => (
                <div key={i} style={{
                  position: "absolute", left: pos.tl, right: pos.tr, top: pos.t, bottom: pos.b,
                  width: 40, height: 40, opacity: 0.25,
                }}>
                  <svg viewBox="0 0 40 40" fill="none">
                    <path d={i === 0 ? "M0 40 L0 0 L40 0" : i === 1 ? "M40 40 L40 0 L0 0" : i === 2 ? "M0 0 L0 40 L40 40" : "M40 0 L40 40 L0 40"} stroke="#c84070" strokeWidth="1.5" fill="none"/>
                  </svg>
                </div>
              ))}

              {/* Content */}
              <div style={{ textAlign: "center" }}>
                {/* Logo */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{
                    display: "inline-flex", alignItems: "center", gap: 8,
                    background: "linear-gradient(135deg, rgba(200,64,112,0.1), rgba(248,112,150,0.08))",
                    border: "1px solid rgba(200,64,112,0.2)", borderRadius: 100, padding: "6px 16px",
                  }}>
                    <div style={{ width: 20, height: 20, borderRadius: 6, background: "linear-gradient(135deg,#c84070,#f07090)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "white" }}/>
                    </div>
                    <span style={{ fontFamily: FONTS.body, fontSize: 11, fontWeight: 600, color: "#c84070", letterSpacing: "0.12em", textTransform: "uppercase" }}>Lumière Academy</span>
                  </div>
                </div>

                <div style={{ fontFamily: FONTS.body, fontSize: 11, color: "#8a4050", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 8 }}>Certificate of Completion</div>
                <h3 style={{ fontFamily: FONTS.display, fontSize: 13, fontWeight: 400, color: "#4a2028", marginBottom: 20 }}>This certifies that</h3>

                <div style={{
                  fontFamily: FONTS.display, fontSize: 36, fontWeight: 500, fontStyle: "italic",
                  color: "#c84070", marginBottom: 8,
                  borderBottom: "1px solid rgba(200,64,112,0.2)", paddingBottom: 8, display: "inline-block", minWidth: 260,
                }}>Your Name Here</div>

                <p style={{ fontFamily: FONTS.body, fontSize: 12, color: "#6a3040", marginBottom: 24, lineHeight: 1.6 }}>
                  has successfully completed the<br/>
                  <strong style={{ color: "#3a0818" }}>Professional Eyelash Extension Masterclass</strong><br/>
                  and demonstrated mastery of all required competencies
                </p>

                {/* Stars */}
                <div style={{ display: "flex", justifyContent: "center", gap: 4, marginBottom: 20 }}>
                  {[...Array(5)].map((_, i) => <span key={i} style={{ color: "#f0c840", fontSize: 16 }}>★</span>)}
                </div>

                {/* Bottom row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderTop: "1px solid rgba(200,64,112,0.1)", paddingTop: 20 }}>
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontFamily: FONTS.display, fontSize: 18, fontStyle: "italic", color: "#c84070" }}>Elena Moreau</div>
                    <div style={{ fontFamily: FONTS.body, fontSize: 10, color: "#8a4050", letterSpacing: "0.06em", textTransform: "uppercase", marginTop: 2 }}>Head Instructor</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ width: 50, height: 50, background: "linear-gradient(135deg,#c84070,#f07090)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <div style={{ width: 36, height: 36, border: "2px solid rgba(255,255,255,0.6)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <div style={{ fontFamily: FONTS.body, fontSize: 6, color: "white", textAlign: "center", letterSpacing: "0.05em" }}>QR<br/>CODE</div>
                      </div>
                    </div>
                    <div style={{ fontFamily: FONTS.body, fontSize: 9, color: "#8a4050", marginTop: 4, letterSpacing: "0.06em" }}>VERIFY ONLINE</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: FONTS.body, fontSize: 11, color: "#3a0818", fontWeight: 600 }}>2025</div>
                    <div style={{ fontFamily: FONTS.body, fontSize: 10, color: "#8a4050", letterSpacing: "0.06em", textTransform: "uppercase", marginTop: 2 }}>Date Issued</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .cert-grid { grid-template-columns: 1fr !important; gap: 48px !important; }
        }
      `}</style>
    </section>
  );
}

// ─── Instructor ───────────────────────────────────────────────────────────────
function Instructor() {
  const [ref, inView] = useScrollReveal();

  const achievements = [
    "15+ years as a master lash artist", "Trained 5,000+ students worldwide",
    "Featured in Vogue, Harper's Bazaar, Elle", "Creator of the Lumière Volume Method",
    "Official educator for 3 premium lash brands", "Guest lecturer at Paris Fashion Week",
  ];

  const team = [
    { name: "Aria Chen", role: "Volume Specialist", avatar: "AC", bg: "#f87096", exp: "8 yrs" },
    { name: "Zara Okafor", role: "Classic & Hybrid", avatar: "ZO", bg: "#c84070", exp: "10 yrs" },
    { name: "Lena Fischer", role: "Business Coach", avatar: "LF", bg: "#e09060", exp: "12 yrs" },
  ];

  return (
    <section id="instructors" style={{
      padding: "120px 24px",
      background: "linear-gradient(160deg, #fff0f4 0%, #fdf8f5 100%)",
      overflow: "hidden", position: "relative",
    }}>
      <BackgroundBlobs section="mid" />
      <div ref={ref} style={{ maxWidth: 1200, margin: "0 auto", position: "relative", zIndex: 1 }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }} animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          style={{ textAlign: "center", marginBottom: 72 }}
        >
          <span className="section-tag" style={{ marginBottom: 20, display: "inline-flex" }}>Your Mentors</span>
          <h2 style={{
            fontFamily: FONTS.display, fontSize: "clamp(36px, 5vw, 60px)", fontWeight: 600,
            color: "#1a0810", lineHeight: 1.1, letterSpacing: "-0.02em",
          }}>
            Learn from the{" "}
            <span className="gradient-text" style={{ fontStyle: "italic" }}>world's best</span>
          </h2>
        </motion.div>

        {/* Lead instructor */}
        <motion.div
          initial={{ opacity: 0, y: 40 }} animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.2 }}
          style={{
            background: "rgba(255,255,255,0.8)", backdropFilter: "blur(20px)",
            border: "1px solid rgba(200,64,112,0.15)",
            borderRadius: 28, padding: "56px",
            boxShadow: "0 16px 60px rgba(180,60,90,0.12)",
            display: "grid", gridTemplateColumns: "240px 1fr", gap: 56, marginBottom: 40,
            alignItems: "center",
          }}
          className="instructor-main"
        >
          {/* Avatar */}
          <div style={{ textAlign: "center" }}>
            <div style={{ position: "relative", display: "inline-block" }}>
              <div style={{
                width: 180, height: 180, borderRadius: "50%", margin: "0 auto 16px",
                background: "linear-gradient(145deg, #f5c0d0, #c84070, #8a2040)",
                display: "flex", alignItems: "center", justifyContent: "center",
                border: "4px solid rgba(200,64,112,0.2)",
                boxShadow: "0 16px 48px rgba(180,60,90,0.3)",
                fontSize: 56, fontFamily: FONTS.display, fontWeight: 600, color: "rgba(255,240,245,0.95)",
              }}>EM</div>
              <div style={{
                position: "absolute", bottom: 24, right: 0,
                background: "linear-gradient(135deg,#c84070,#f07090)",
                borderRadius: 100, padding: "4px 12px",
                fontFamily: FONTS.body, fontSize: 11, fontWeight: 600, color: "white",
                boxShadow: "0 4px 16px rgba(200,64,112,0.4)",
              }}>Lead Artist</div>
            </div>
            <h3 style={{ fontFamily: FONTS.display, fontSize: 26, fontWeight: 600, color: "#1a0810" }}>Elena Moreau</h3>
            <div style={{ fontFamily: FONTS.body, fontSize: 13, color: "#c84070", fontWeight: 500, marginTop: 4 }}>Founder & Master Instructor</div>
            <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 16 }}>
              {["ig", "yt", "in"].map(s => (
                <div key={s} style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: "rgba(200,64,112,0.08)", border: "1px solid rgba(200,64,112,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: FONTS.body, fontSize: 11, fontWeight: 600, color: "#c84070", cursor: "pointer",
                  textTransform: "uppercase",
                }}>{s}</div>
              ))}
            </div>
          </div>

          {/* Bio */}
          <div>
            <div style={{ display: "flex", gap: 24, marginBottom: 32, flexWrap: "wrap" }}>
              {[{ n: "15+", l: "Years" }, { n: "5K+", l: "Students" }, { n: "50+", l: "Awards" }].map((s, i) => (
                <div key={i} style={{
                  background: "linear-gradient(135deg, rgba(200,64,112,0.08), rgba(248,112,150,0.04))",
                  border: "1px solid rgba(200,64,112,0.15)",
                  borderRadius: 16, padding: "16px 24px", textAlign: "center",
                }}>
                  <div style={{ fontFamily: FONTS.display, fontSize: 28, fontWeight: 600, color: "#c84070" }}>{s.n}</div>
                  <div style={{ fontFamily: FONTS.body, fontSize: 11, color: "#8a4050", letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 2 }}>{s.l}</div>
                </div>
              ))}
            </div>

            <p style={{ fontFamily: FONTS.body, fontSize: 16, color: "#4a2028", lineHeight: 1.8, marginBottom: 28, fontWeight: 300 }}>
              Elena began her lash journey in Paris at age 19 and went on to define techniques that are now industry standards. 
              Her approach blends meticulous artistry with practical business savvy — she doesn't just teach you to lash, 
              she teaches you to <em>thrive</em>.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {achievements.map((a, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ width: 18, height: 18, borderRadius: "50%", background: "rgba(200,64,112,0.12)", border: "1px solid rgba(200,64,112,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#c84070" strokeWidth="3"><path d="M5 13l4 4L19 7"/></svg>
                  </div>
                  <span style={{ fontFamily: FONTS.body, fontSize: 13, color: "#4a2028", lineHeight: 1.4 }}>{a}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Supporting team */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }} className="team-grid">
          {team.map((t, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.12 + 0.5 }}
              className="card-hover"
              style={{
                background: "rgba(255,255,255,0.7)", backdropFilter: "blur(10px)",
                border: "1px solid rgba(200,64,112,0.12)",
                borderRadius: 20, padding: "28px 24px", textAlign: "center",
                boxShadow: "0 4px 20px rgba(180,60,90,0.07)",
              }}
            >
              <div style={{
                width: 72, height: 72, borderRadius: "50%", margin: "0 auto 16px",
                background: `linear-gradient(135deg, ${t.bg}, ${t.bg}70)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: FONTS.display, fontSize: 22, fontWeight: 600, color: "white",
              }}>{t.avatar}</div>
              <h4 style={{ fontFamily: FONTS.body, fontSize: 16, fontWeight: 600, color: "#1a0810", marginBottom: 4 }}>{t.name}</h4>
              <div style={{ fontFamily: FONTS.body, fontSize: 13, color: "#c84070", marginBottom: 8 }}>{t.role}</div>
              <div style={{ fontFamily: FONTS.body, fontSize: 12, color: "#8a4050" }}>{t.exp} experience</div>
            </motion.div>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .instructor-main { grid-template-columns: 1fr !important; text-align: center; }
          .team-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}

// ─── Pricing ──────────────────────────────────────────────────────────────────
function Pricing() {
  const [ref, inView] = useScrollReveal();
  const [annual, setAnnual] = useState(false);

  const plans = [
    {
      name: "Starter", price: 97, annualPrice: 79,
      desc: "Perfect for absolute beginners curious about lash artistry",
      color: "#8a4050",
      features: [
        "Foundation & Safety module", "8 HD video lessons", "Downloadable resources",
        "Quiz assessments", "Community forum access", "3-month access",
      ],
      cta: "Get Started",
    },
    {
      name: "Professional", price: 297, annualPrice: 247,
      desc: "Everything you need to launch a successful lash career",
      color: "#c84070", popular: true,
      features: [
        "All 5 complete modules", "52 HD video lessons", "Live Q&A sessions monthly",
        "1-on-1 mentor call (30 min)", "Industry-recognised certificate", "Business launch blueprint",
        "Private student community", "Lifetime access",
      ],
      cta: "Enroll Now",
    },
    {
      name: "Elite", price: 597, annualPrice: 497,
      desc: "For serious artists ready to build a premium 6-figure business",
      color: "#e09060",
      features: [
        "Everything in Professional", "3× 1-on-1 strategy sessions", "Business audit & feedback",
        "Custom branding kit", "Priority support (24h response)", "Early access to new content",
        "Mastermind community access", "Lifetime access + future updates",
      ],
      cta: "Apply for Elite",
    },
  ];

  return (
    <section id="pricing" style={{
      padding: "120px 24px",
      background: "linear-gradient(180deg, #1a0408 0%, #2a0a18 100%)",
      overflow: "hidden", position: "relative",
    }}>
      <BackgroundBlobs section="dark" />

      <div ref={ref} style={{ maxWidth: 1200, margin: "0 auto", position: "relative", zIndex: 1 }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }} animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          style={{ textAlign: "center", marginBottom: 56 }}
        >
          <span className="section-tag" style={{ marginBottom: 20, display: "inline-flex", color: "#f87096", background: "rgba(248,112,150,0.1)", borderColor: "rgba(248,112,150,0.25)" }}>Pricing</span>
          <h2 style={{
            fontFamily: FONTS.display, fontSize: "clamp(36px, 5vw, 60px)", fontWeight: 600,
            color: "rgba(255,240,245,0.95)", lineHeight: 1.1, letterSpacing: "-0.02em", marginBottom: 16,
          }}>
            Invest in your{" "}
            <span style={{ fontStyle: "italic", color: "#f87096" }}>future</span>
          </h2>
          <p style={{ fontFamily: FONTS.body, fontSize: 17, color: "rgba(255,180,200,0.65)", marginBottom: 32 }}>
            One payment. Lifetime skills. Zero regrets.
          </p>

          {/* Toggle */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 14,
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,180,200,0.15)",
            borderRadius: 100, padding: "6px 6px 6px 18px",
          }}>
            <span style={{ fontFamily: FONTS.body, fontSize: 13, color: "rgba(255,200,215,0.8)" }}>Monthly</span>
            <div
              onClick={() => setAnnual(!annual)}
              style={{
                width: 48, height: 26, borderRadius: 13, cursor: "pointer",
                background: annual ? "linear-gradient(135deg,#c84070,#f07090)" : "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,180,200,0.2)",
                position: "relative", transition: "background 0.3s",
              }}
            >
              <div style={{
                position: "absolute", top: 3, left: annual ? 24 : 3,
                width: 18, height: 18, borderRadius: "50%", background: "white",
                transition: "left 0.3s cubic-bezier(0.22,1,0.36,1)",
                boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
              }}/>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontFamily: FONTS.body, fontSize: 13, color: "rgba(255,200,215,0.8)" }}>Annual</span>
              <span style={{ fontFamily: FONTS.body, fontSize: 11, fontWeight: 600, color: "#f87096", background: "rgba(248,112,150,0.15)", border: "1px solid rgba(248,112,150,0.3)", borderRadius: 100, padding: "2px 8px" }}>Save 20%</span>
            </div>
          </div>
        </motion.div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, alignItems: "start" }} className="pricing-grid">
          {plans.map((plan, i) => (
            <motion.div key={plan.name}
              initial={{ opacity: 0, y: 30 }} animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.12 + 0.2 }}
              style={{
                background: plan.popular ? "rgba(200,64,112,0.12)" : "rgba(255,255,255,0.04)",
                backdropFilter: "blur(20px)",
                border: plan.popular ? "1.5px solid rgba(248,112,150,0.45)" : "1px solid rgba(255,180,200,0.1)",
                borderRadius: 24, padding: "36px 32px",
                position: "relative", overflow: "hidden",
                boxShadow: plan.popular ? "0 24px 80px rgba(200,64,112,0.25)" : "none",
                transform: plan.popular ? "scale(1.04)" : "none",
              }}
            >
              {plan.popular && (
                <div style={{
                  position: "absolute", top: 0, left: 0, right: 0,
                  background: "linear-gradient(135deg, #c84070, #f07090)",
                  padding: "8px", textAlign: "center",
                  fontFamily: FONTS.body, fontSize: 11, fontWeight: 600, color: "white", letterSpacing: "0.12em", textTransform: "uppercase",
                }}>Most Popular</div>
              )}

              <div style={{ paddingTop: plan.popular ? 16 : 0 }}>
                <div style={{ fontFamily: FONTS.body, fontSize: 11, fontWeight: 600, color: plan.color, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>{plan.name}</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 8 }}>
                  <span style={{ fontFamily: FONTS.display, fontSize: 48, fontWeight: 600, color: "rgba(255,240,245,0.95)", lineHeight: 1 }}>
                    ${annual ? plan.annualPrice : plan.price}
                  </span>
                  <span style={{ fontFamily: FONTS.body, fontSize: 14, color: "rgba(255,160,180,0.6)" }}>/once</span>
                </div>
                <p style={{ fontFamily: FONTS.body, fontSize: 13, color: "rgba(255,180,200,0.6)", lineHeight: 1.5, marginBottom: 28 }}>{plan.desc}</p>

                <a href="#" className={plan.popular ? "btn-primary" : "btn-ghost"}
                  style={{
                    display: "block", textAlign: "center", width: "100%", marginBottom: 28, fontSize: 14,
                    ...(plan.popular ? {} : { color: "rgba(255,200,215,0.8)", borderColor: "rgba(255,180,200,0.25)" }),
                  }}>
                  {plan.cta}
                </a>

                <div style={{ borderTop: "1px solid rgba(255,180,200,0.1)", paddingTop: 24, display: "flex", flexDirection: "column", gap: 12 }}>
                  {plan.features.map((f, j) => (
                    <div key={j} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <div style={{ width: 18, height: 18, borderRadius: "50%", background: `${plan.color}25`, border: `1px solid ${plan.color}50`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke={plan.color} strokeWidth="3"><path d="M5 13l4 4L19 7"/></svg>
                      </div>
                      <span style={{ fontFamily: FONTS.body, fontSize: 13, color: "rgba(255,200,215,0.75)", lineHeight: 1.4 }}>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Guarantee */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.7 }}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 20,
            marginTop: 48, background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,180,200,0.12)",
            borderRadius: 16, padding: "20px 32px", flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: 32 }}>🛡️</span>
          <div>
            <div style={{ fontFamily: FONTS.body, fontSize: 15, fontWeight: 600, color: "rgba(255,240,245,0.9)" }}>30-Day Money-Back Guarantee</div>
            <div style={{ fontFamily: FONTS.body, fontSize: 13, color: "rgba(255,160,180,0.65)" }}>If you're not completely satisfied, we'll refund every penny. No questions asked.</div>
          </div>
        </motion.div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .pricing-grid { grid-template-columns: 1fr !important; }
          .pricing-grid > div { transform: none !important; }
        }
      `}</style>
    </section>
  );
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────
function FAQ() {
  const [ref, inView] = useScrollReveal();
  const [open, setOpen] = useState(null);

  const faqs = [
    { q: "Do I need any prior experience to enroll?", a: "Absolutely not. Our Foundation module starts from the very beginning — assuming zero knowledge. We guide you through everything from anatomy to your first full set, step by step." },
    { q: "How long do I have access to the course?", a: "Professional and Elite students get lifetime access, including all future updates. Starter students get 3 months of access, which is more than enough time to complete the module." },
    { q: "Can I learn at my own pace?", a: "Yes, completely. All lessons are pre-recorded and available 24/7. There are monthly live Q&A sessions (recorded if you miss them), but the core curriculum is entirely self-paced." },
    { q: "What equipment do I need to practice?", a: "We provide a detailed equipment list inside the course. For the first module, you only need basic supplies (under $50). We recommend practice mannequin heads, which are affordable and reusable." },
    { q: "Is the certificate internationally recognised?", a: "Yes. Our certificates are accepted by salons, spas, and employers in 40+ countries. The program is CPD accredited, which adds weight in most professional contexts." },
    { q: "Do you offer payment plans?", a: "Yes! We offer 3 or 6-month installment plans for all courses. Simply select 'Pay in installments' at checkout. The total cost is the same — we just spread it out for you." },
    { q: "What if I'm not satisfied with the course?", a: "We offer a full 30-day money-back guarantee, no questions asked. If you complete less than 20% of the course and aren't satisfied, we'll refund you completely." },
    { q: "Can I practice on real clients after completing the course?", a: "Yes! By the end of the Professional module, you'll have all the skills needed for real clients. We recommend starting with friends and family to build your portfolio and confidence first." },
  ];

  return (
    <section id="faq" style={{
      padding: "120px 24px",
      background: "linear-gradient(180deg, #fffaf7 0%, #fff0f4 100%)",
      overflow: "hidden", position: "relative",
    }}>
      <div ref={ref} style={{ maxWidth: 800, margin: "0 auto" }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }} animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          style={{ textAlign: "center", marginBottom: 64 }}
        >
          <span className="section-tag" style={{ marginBottom: 20, display: "inline-flex" }}>FAQ</span>
          <h2 style={{
            fontFamily: FONTS.display, fontSize: "clamp(36px, 5vw, 60px)", fontWeight: 600,
            color: "#1a0810", lineHeight: 1.1, letterSpacing: "-0.02em", marginBottom: 16,
          }}>
            Questions?{" "}
            <span className="gradient-text" style={{ fontStyle: "italic" }}>Answered.</span>
          </h2>
          <p style={{ fontFamily: FONTS.body, fontSize: 17, color: "#6a3040", fontWeight: 300 }}>
            Everything you need to know before you start
          </p>
        </motion.div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {faqs.map((faq, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 16 }} animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.06 + 0.2 }}
              style={{
                background: "rgba(255,255,255,0.8)", backdropFilter: "blur(10px)",
                border: `1px solid ${open === i ? "rgba(200,64,112,0.3)" : "rgba(200,64,112,0.1)"}`,
                borderRadius: 16, overflow: "hidden",
                transition: "border-color 0.25s, box-shadow 0.25s",
                boxShadow: open === i ? "0 8px 32px rgba(180,60,90,0.1)" : "none",
              }}
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                style={{
                  width: "100%", padding: "20px 24px", cursor: "pointer",
                  background: "none", border: "none", textAlign: "left",
                  display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16,
                }}
              >
                <span style={{ fontFamily: FONTS.body, fontSize: 15, fontWeight: 600, color: "#1a0810", lineHeight: 1.4 }}>{faq.q}</span>
                <motion.div
                  animate={{ rotate: open === i ? 45 : 0 }}
                  transition={{ duration: 0.25 }}
                  style={{
                    width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                    background: open === i ? "linear-gradient(135deg,#c84070,#f07090)" : "rgba(200,64,112,0.1)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "background 0.25s",
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={open === i ? "white" : "#c84070"} strokeWidth="2.5">
                    <path d="M12 5v14M5 12h14"/>
                  </svg>
                </motion.div>
              </button>
              <AnimatePresence>
                {open === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    style={{ overflow: "hidden" }}
                  >
                    <div style={{ padding: "0 24px 20px", paddingTop: 0 }}>
                      <div style={{ width: "100%", height: 1, background: "rgba(200,64,112,0.08)", marginBottom: 16 }}/>
                      <p style={{ fontFamily: FONTS.body, fontSize: 14, color: "#6a3040", lineHeight: 1.7, fontWeight: 300 }}>{faq.a}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>

        {/* Still have questions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.8 }}
          style={{
            textAlign: "center", marginTop: 52,
            background: "linear-gradient(135deg, rgba(200,64,112,0.06), rgba(248,112,150,0.04))",
            border: "1px solid rgba(200,64,112,0.15)",
            borderRadius: 20, padding: "36px 32px",
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 12 }}>💌</div>
          <h3 style={{ fontFamily: FONTS.display, fontSize: 24, fontWeight: 500, color: "#1a0810", marginBottom: 8 }}>Still have questions?</h3>
          <p style={{ fontFamily: FONTS.body, fontSize: 14, color: "#6a3040", marginBottom: 20 }}>Our team replies within 2 hours, Monday to Friday.</p>
          <a href="mailto:hello@lumiere.academy" className="btn-primary" style={{ fontSize: 14 }}>Chat with us →</a>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  const links = {
    Learn: ["Curriculum", "Instructors", "Certificates", "Free Preview", "Student Stories"],
    Company: ["About Us", "Blog", "Press Kit", "Careers", "Partnerships"],
    Support: ["Help Center", "Contact Us", "Privacy Policy", "Terms of Service", "Refund Policy"],
  };

  return (
    <footer style={{
      background: "linear-gradient(180deg, #0e0208 0%, #0a0106 100%)",
      padding: "80px 24px 40px", overflow: "hidden", position: "relative",
    }}>
      {/* Top glow */}
      <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 600, height: 2, background: "linear-gradient(90deg, transparent, rgba(200,64,112,0.6), transparent)" }}/>

      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 48, marginBottom: 64 }} className="footer-grid">
          {/* Brand */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,#c84070,#f07090)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.8)" }}/>
              </div>
              <div>
                <div style={{ fontFamily: FONTS.display, fontSize: 20, fontWeight: 600, color: "rgba(255,240,245,0.95)" }}>Lumière</div>
                <div style={{ fontFamily: FONTS.body, fontSize: 10, color: "#f87096", letterSpacing: "0.12em", textTransform: "uppercase" }}>Beauty Academy</div>
              </div>
            </div>
            <p style={{ fontFamily: FONTS.body, fontSize: 14, color: "rgba(255,160,180,0.55)", lineHeight: 1.7, maxWidth: 300, fontWeight: 300, marginBottom: 24 }}>
              The world's most comprehensive eyelash extension training platform. Empowering beauty professionals since 2018.
            </p>

            {/* Social */}
            <div style={{ display: "flex", gap: 10 }}>
              {["Instagram", "YouTube", "TikTok", "LinkedIn"].map(s => (
                <div key={s} style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,180,200,0.12)",
                  display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                  transition: "all 0.2s",
                  fontFamily: FONTS.body, fontSize: 9, color: "rgba(255,180,200,0.5)", letterSpacing: "0.04em",
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(200,64,112,0.15)"; e.currentTarget.style.borderColor = "rgba(200,64,112,0.3)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.borderColor = "rgba(255,180,200,0.12)"; }}
                >
                  {s[0]}
                </div>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(links).map(([cat, items]) => (
            <div key={cat}>
              <h4 style={{ fontFamily: FONTS.body, fontSize: 11, fontWeight: 700, color: "rgba(255,200,215,0.5)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 20 }}>{cat}</h4>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 12 }}>
                {items.map(item => (
                  <li key={item}>
                    <a href="#" style={{
                      fontFamily: FONTS.body, fontSize: 14, color: "rgba(255,160,180,0.5)", textDecoration: "none",
                      transition: "color 0.2s",
                    }}
                      onMouseEnter={e => e.target.style.color = "rgba(255,200,215,0.9)"}
                      onMouseLeave={e => e.target.style.color = "rgba(255,160,180,0.5)"}
                    >{item}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Newsletter */}
        <div style={{
          background: "rgba(200,64,112,0.08)", border: "1px solid rgba(200,64,112,0.18)",
          borderRadius: 20, padding: "32px 40px", marginBottom: 48,
          display: "flex", justifyContent: "space-between", alignItems: "center", gap: 32, flexWrap: "wrap",
        }}>
          <div>
            <h4 style={{ fontFamily: FONTS.display, fontSize: 22, fontWeight: 500, color: "rgba(255,240,245,0.9)", marginBottom: 6 }}>
              Get free lash tips weekly
            </h4>
            <p style={{ fontFamily: FONTS.body, fontSize: 13, color: "rgba(255,160,180,0.6)" }}>Join 18,000+ artists who read our newsletter</p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input
              type="email" placeholder="your@email.com"
              style={{
                fontFamily: FONTS.body, fontSize: 14,
                background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,180,200,0.2)",
                borderRadius: 100, padding: "12px 20px", color: "rgba(255,240,245,0.85)",
                outline: "none", minWidth: 220,
              }}
            />
            <button className="btn-primary" style={{ fontSize: 14 }}>Subscribe</button>
          </div>
        </div>

        {/* Bottom */}
        <div style={{ borderTop: "1px solid rgba(255,180,200,0.08)", paddingTop: 28, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <p style={{ fontFamily: FONTS.body, fontSize: 13, color: "rgba(255,120,150,0.35)" }}>
            © 2025 Lumière Beauty Academy. All rights reserved.
          </p>
          <div style={{ display: "flex", gap: 24 }}>
            {["Privacy", "Terms", "Cookies"].map(l => (
              <a key={l} href="#" style={{ fontFamily: FONTS.body, fontSize: 13, color: "rgba(255,120,150,0.35)", textDecoration: "none" }}>{l}</a>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .footer-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 480px) {
          .footer-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </footer>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <>
      <GlobalStyles />
      <Navbar />
      <main>
        <Hero />
        <Curriculum />
        <Testimonials />
        <Certificates />
        <Instructor />
        <Pricing />
        <FAQ />
      </main>
      <Footer />
    </>
  );
}