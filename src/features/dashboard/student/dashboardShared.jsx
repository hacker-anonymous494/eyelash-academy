// ─── Shared design tokens & micro-components for the Student Dashboard ───────
// Import these in each page:  import { S, Skeleton, PageShell } from './dashboardShared';

import { motion } from 'framer-motion';

// ── Tokens ────────────────────────────────────────────────────────────────────
export const S = {
  // Canvas
  canvasBg: '#faf8f7',
  // Cards
  cardBg: 'rgba(255,255,255,0.94)',
  cardBorder: 'rgba(210,150,170,0.2)',
  cardShadow: '0 2px 16px rgba(180,60,90,0.06)',
  cardShadowHover: '0 8px 32px rgba(180,60,90,0.13)',
  cardRadius: 16,
  cardRadiusSm: 10,
  // Accent
  rose: '#c84070',
  roseLight: '#f0a0b8',
  roseDark: '#8a2040',
  roseBg: 'rgba(200,64,112,0.07)',
  roseBorder: 'rgba(200,64,112,0.18)',
  roseGrad: 'linear-gradient(135deg, #c84070 0%, #f07090 100%)',
  // Semantic colours
  green: '#2ecc71',
  greenBg: 'rgba(46,204,113,0.1)',
  gold: '#d4a030',
  goldBg: 'rgba(212,160,48,0.1)',
  blue: '#3498db',
  blueBg: 'rgba(52,152,219,0.1)',
  // Text
  textPrimary: '#1a0810',
  textSecondary: '#6a3848',
  textMuted: '#9a6878',
  // Typography
  fontDisplay: "'Cormorant Garamond', 'Playfair Display', Georgia, serif",
  fontBody: "'DM Sans', system-ui, sans-serif",
};

// ── Animation helpers ─────────────────────────────────────────────────────────
export const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1], delay },
});

export const stagger = (i) => fadeUp(i * 0.07);

// ── Skeleton ──────────────────────────────────────────────────────────────────
export function Skeleton({ width = '100%', height = 20, radius = 8, style = {} }) {
  return (
    <div style={{
      width, height, borderRadius: radius,
      background: 'linear-gradient(90deg, #f4e8ee 25%, #fdf5f8 50%, #f4e8ee 75%)',
      backgroundSize: '300% 100%',
      animation: 'sk-shimmer 1.6s ease-in-out infinite',
      flexShrink: 0,
      ...style,
    }} />
  );
}

// ── Section title ─────────────────────────────────────────────────────────────
export function SectionTitle({ children, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
      <h2 style={{
        fontFamily: S.fontDisplay, fontSize: 22, fontWeight: 600,
        color: S.textPrimary, margin: 0, lineHeight: 1.2,
      }}>
        {children}
      </h2>
      {action}
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
export function EmptyState({ emoji = '🌸', title, body, cta }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '52px 24px', textAlign: 'center',
      background: S.cardBg, border: `1px solid ${S.cardBorder}`,
      borderRadius: S.cardRadius, boxShadow: S.cardShadow,
    }}>
      <div style={{
        width: 72, height: 72, borderRadius: 20, marginBottom: 20,
        background: `linear-gradient(135deg, rgba(200,64,112,0.1), rgba(248,112,150,0.06))`,
        border: S.roseBorder, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 30,
      }}>{emoji}</div>
      <h3 style={{ fontFamily: S.fontDisplay, fontSize: 22, fontWeight: 600, color: S.textPrimary, margin: '0 0 8px' }}>{title}</h3>
      <p style={{ fontFamily: S.fontBody, fontSize: 14, color: S.textMuted, margin: '0 0 24px', maxWidth: 320, lineHeight: 1.6 }}>{body}</p>
      {cta}
    </div>
  );
}

// ── Tag / badge ───────────────────────────────────────────────────────────────
export function Tag({ children, color = S.rose }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      fontFamily: S.fontBody, fontSize: 10, fontWeight: 600,
      letterSpacing: '0.08em', textTransform: 'uppercase',
      color, background: `${color}15`, border: `1px solid ${color}30`,
      borderRadius: 100, padding: '3px 10px',
    }}>
      {children}
    </span>
  );
}

// ── Page shell (padding + max-width + entrance animation) ─────────────────────
export function PageShell({ children, maxWidth = 1100 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      style={{
        minHeight: '100%',
        padding: 'clamp(20px, 4vw, 40px)',
        maxWidth,
        margin: '0 auto',
        width: '100%',
      }}
    >
      {children}
    </motion.div>
  );
}

// ── Global keyframes (injected once) ─────────────────────────────────────────
export const globalCSS = `
  @keyframes sk-shimmer { 0%{background-position:100% 0} 100%{background-position:-100% 0} }
  @keyframes pulse-dot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(.85)} }
  * { box-sizing: border-box; }
  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(200,64,112,0.2); border-radius: 3px; }
  @media (max-width: 768px) {
    .dash-grid-12 { grid-template-columns: 1fr !important; }
    .dash-hide-mobile { display: none !important; }
  }
`;