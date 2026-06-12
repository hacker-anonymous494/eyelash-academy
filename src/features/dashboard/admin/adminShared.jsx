/**
 * adminShared.js — Admin design tokens, layout primitives, and micro-components
 * One import gives every admin page consistent tokens + helpers.
 */

// ─── Design tokens ─────────────────────────────────────────────────────────────
export const A = {
  // Canvas
  bg: '#f7f5f6',           // warm near-white
  sidebar: '#0f0a10',      // near-black
  sidebarBorder: 'rgba(232,112,144,0.14)',
  sidebarText: 'rgba(255,240,245,0.80)',
  sidebarMuted: 'rgba(255,180,210,0.42)',
  sidebarHover: 'rgba(255,255,255,0.05)',
  sidebarActive: 'rgba(232,112,144,0.13)',
  sidebarActiveRail: '#e87090',
  sidebarWidth: 232,

  // Cards
  card: 'rgba(255,255,255,0.97)',
  cardBorder: 'rgba(210,150,170,0.18)',
  cardShadow: '0 1px 12px rgba(180,60,90,0.06)',
  cardShadowHover: '0 6px 28px rgba(180,60,90,0.13)',
  cardRadius: 14,

  // Accent
  rose: '#c84070',
  roseLight: '#f0a0b8',
  roseDark: '#8a2040',
  roseGrad: 'linear-gradient(135deg,#c84070,#f07090)',
  roseBg: 'rgba(200,64,112,0.07)',
  roseBorder: 'rgba(200,64,112,0.18)',

  // Semantic
  green: '#2ecc71',
  greenBg: 'rgba(46,204,113,0.1)',
  greenBorder: 'rgba(46,204,113,0.25)',
  gold: '#d4a030',
  goldBg: 'rgba(212,160,48,0.1)',
  blue: '#3498db',
  blueBg: 'rgba(52,152,219,0.1)',
  red: '#e74c3c',
  redBg: 'rgba(231,76,60,0.08)',

  // Typography
  textPrimary: '#1a0810',
  textSecondary: '#6a3848',
  textMuted: '#9a6878',
  fontDisplay: "'Cormorant Garamond','Playfair Display',Georgia,serif",
  fontBody: "'DM Sans',system-ui,sans-serif",
  fontMono: "'DM Mono','Fira Mono',monospace",
};

// ─── Global CSS ────────────────────────────────────────────────────────────────
export const adminGlobalCSS = `
  *, *::before, *::after { box-sizing: border-box; }
  body { font-family: ${A.fontBody}; }
  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(200,64,112,0.2); border-radius: 3px; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes sk-shimmer { 0%{background-position:100% 0} 100%{background-position:-100% 0} }
  @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  .admin-card-hover { transition: box-shadow 0.2s, transform 0.2s; }
  .admin-card-hover:hover { box-shadow: ${A.cardShadowHover}; transform: translateY(-2px); }
  @media (max-width: 768px) {
    .admin-hide-mobile { display: none !important; }
    .admin-full-mobile { width: 100% !important; }
  }
`;

// ─── Spinner ────────────────────────────────────────────────────────────────────
export function Spinner({ size = 36, color = A.rose }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      border: `3px solid ${color}22`, borderTop: `3px solid ${color}`,
      animation: 'spin 0.7s linear infinite', flexShrink: 0,
    }} />
  );
}

// ─── Skeleton ───────────────────────────────────────────────────────────────────
export function Skeleton({ width = '100%', height = 20, radius = 7, style = {} }) {
  return (
    <div style={{
      width, height, borderRadius: radius,
      background: 'linear-gradient(90deg,#f4e8ee 25%,#fdf5f8 50%,#f4e8ee 75%)',
      backgroundSize: '300% 100%',
      animation: 'sk-shimmer 1.6s ease-in-out infinite',
      ...style,
    }} />
  );
}

// ─── Badge ──────────────────────────────────────────────────────────────────────
export function Badge({ children, color = A.rose, bg, border }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      fontFamily: A.fontBody, fontSize: 10, fontWeight: 700,
      letterSpacing: '0.08em', textTransform: 'uppercase',
      color: color || A.rose,
      background: bg || `${color}15`,
      border: `1px solid ${border || `${color}30`}`,
      borderRadius: 100, padding: '3px 9px',
    }}>
      {children}
    </span>
  );
}

// ─── Card ───────────────────────────────────────────────────────────────────────
export function Card({ children, style = {}, hover = false, onClick }) {
  return (
    <div
      onClick={onClick}
      className={hover ? 'admin-card-hover' : ''}
      style={{
        background: A.card, border: `1px solid ${A.cardBorder}`,
        borderRadius: A.cardRadius, boxShadow: A.cardShadow,
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ─── Page header ────────────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, action }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      gap: 16, marginBottom: 28, flexWrap: 'wrap',
    }}>
      <div>
        <h1 style={{
          fontFamily: A.fontDisplay, fontSize: 'clamp(24px,3.5vw,34px)',
          fontWeight: 600, color: A.textPrimary, margin: 0, lineHeight: 1.15,
        }}>{title}</h1>
        {subtitle && (
          <p style={{ fontFamily: A.fontBody, fontSize: 13, color: A.textMuted, margin: '5px 0 0' }}>
            {subtitle}
          </p>
        )}
      </div>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </div>
  );
}

// ─── Button ─────────────────────────────────────────────────────────────────────
export function Btn({ children, onClick, variant = 'primary', size = 'md', disabled, loading, style = {}, type = 'button' }) {
  const sizes = { sm: '7px 16px', md: '10px 22px', lg: '13px 28px' };
  const fontSizes = { sm: 12, md: 13, lg: 15 };
  const base = {
    display: 'inline-flex', alignItems: 'center', gap: 7, border: 'none',
    borderRadius: 100, cursor: disabled || loading ? 'not-allowed' : 'pointer',
    fontFamily: A.fontBody, fontWeight: 600, fontSize: fontSizes[size],
    padding: sizes[size], transition: 'all 0.2s', lineHeight: 1.2,
    opacity: disabled ? 0.55 : 1, ...style,
  };
  const variants = {
    primary: {
      background: A.roseGrad, color: 'white',
      boxShadow: disabled ? 'none' : '0 3px 12px rgba(200,64,112,0.32)',
    },
    ghost: {
      background: 'transparent', color: A.rose,
      border: `1px solid ${A.roseBorder}`,
    },
    danger: {
      background: 'rgba(231,76,60,0.1)', color: A.red,
      border: '1px solid rgba(231,76,60,0.25)',
    },
    success: {
      background: 'linear-gradient(135deg,#27ae60,#2ecc71)', color: 'white',
      boxShadow: '0 3px 12px rgba(46,204,113,0.32)',
    },
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled || loading}
      style={{ ...base, ...variants[variant] }}
      onMouseEnter={e => { if (!disabled && !loading) e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}
    >
      {loading && <Spinner size={14} color={variant === 'primary' ? 'rgba(255,255,255,0.8)' : A.rose} />}
      {children}
    </button>
  );
}

// ─── Form field ─────────────────────────────────────────────────────────────────
export function Field({ label, hint, children, required }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{
        display: 'flex', alignItems: 'center', gap: 4,
        fontFamily: A.fontBody, fontSize: 12.5, fontWeight: 600,
        color: A.textSecondary, marginBottom: 6, letterSpacing: '0.01em',
      }}>
        {label}
        {required && <span style={{ color: A.rose, fontSize: 11 }}>*</span>}
      </label>
      {children}
      {hint && <p style={{ fontFamily: A.fontBody, fontSize: 11, color: A.textMuted, margin: '4px 0 0' }}>{hint}</p>}
    </div>
  );
}

// ─── Input ──────────────────────────────────────────────────────────────────────
export function Input({ value, onChange, type = 'text', placeholder, disabled, style = {}, onFocus, onBlur, rows, maxLength }) {
  const base = {
    width: '100%', fontFamily: A.fontBody, fontSize: 13.5, color: A.textPrimary,
    background: disabled ? 'rgba(0,0,0,0.03)' : 'white',
    border: `1px solid ${A.cardBorder}`, borderRadius: 9,
    padding: '9px 13px', outline: 'none',
    cursor: disabled ? 'not-allowed' : 'text',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxSizing: 'border-box', resize: rows ? 'vertical' : undefined,
    ...style,
  };
  const handleFocus = e => {
    e.target.style.borderColor = 'rgba(200,64,112,0.5)';
    e.target.style.boxShadow = '0 0 0 3px rgba(200,64,112,0.08)';
    onFocus?.();
  };
  const handleBlur = e => {
    e.target.style.borderColor = A.cardBorder;
    e.target.style.boxShadow = 'none';
    onBlur?.();
  };
  if (rows) {
    return <textarea value={value} onChange={onChange} placeholder={placeholder} disabled={disabled} rows={rows} maxLength={maxLength} style={base} onFocus={handleFocus} onBlur={handleBlur} />;
  }
  return <input type={type} value={value} onChange={onChange} placeholder={placeholder} disabled={disabled} maxLength={maxLength} style={base} onFocus={handleFocus} onBlur={handleBlur} />;
}

// ─── Select ─────────────────────────────────────────────────────────────────────
export function Select({ value, onChange, children, style = {} }) {
  return (
    <select value={value} onChange={onChange} style={{
      width: '100%', fontFamily: A.fontBody, fontSize: 13.5, color: A.textPrimary,
      background: 'white', border: `1px solid ${A.cardBorder}`,
      borderRadius: 9, padding: '9px 13px', outline: 'none',
      cursor: 'pointer', boxSizing: 'border-box', ...style,
    }}>
      {children}
    </select>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────────
export function Empty({ emoji = '📭', title, body, action }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '60px 32px', textAlign: 'center',
      background: A.card, border: `1px solid ${A.cardBorder}`, borderRadius: A.cardRadius,
    }}>
      <div style={{
        width: 72, height: 72, borderRadius: 20, marginBottom: 18,
        background: A.roseBg, border: `1px solid ${A.roseBorder}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
      }}>{emoji}</div>
      <h3 style={{ fontFamily: A.fontDisplay, fontSize: 22, fontWeight: 600, color: A.textPrimary, margin: '0 0 8px' }}>{title}</h3>
      {body && <p style={{ fontFamily: A.fontBody, fontSize: 13.5, color: A.textMuted, margin: '0 0 22px', maxWidth: 320, lineHeight: 1.6 }}>{body}</p>}
      {action}
    </div>
  );
}

// ─── Toast ───────────────────────────────────────────────────────────────────────
export function Toast({ msg, type = 'success', onDismiss }) {
  if (!msg) return null;
  const colors = {
    success: { bg: '#f0fdf4', border: A.greenBorder, text: '#15803d' },
    error: { bg: '#fef2f2', border: 'rgba(231,76,60,0.3)', text: '#dc2626' },
    info: { bg: '#eff6ff', border: 'rgba(59,130,246,0.3)', text: '#1d4ed8' },
  };
  const c = colors[type] || colors.success;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      padding: '10px 16px', background: c.bg, border: `1px solid ${c.border}`,
      borderRadius: 10, fontFamily: A.fontBody, fontSize: 13, color: c.text, marginBottom: 16,
    }}>
      <span>{msg}</span>
      {onDismiss && <button onClick={onDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.text, fontSize: 16, lineHeight: 1, padding: 0 }}>×</button>}
    </div>
  );
}

// ─── Stat card ───────────────────────────────────────────────────────────────────
export function StatCard({ label, value, icon, accent, subtext, loading }) {
  return (
    <Card style={{ padding: '20px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 11,
          background: accent || A.roseBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, flexShrink: 0,
        }}>{icon}</div>
      </div>
      {loading ? <Skeleton height={32} radius={6} style={{ marginBottom: 8 }} /> : (
        <p style={{ fontFamily: A.fontDisplay, fontSize: 32, fontWeight: 600, color: A.textPrimary, margin: '0 0 4px', lineHeight: 1 }}>{value ?? '—'}</p>
      )}
      <p style={{ fontFamily: A.fontBody, fontSize: 12, color: A.textMuted, margin: 0, letterSpacing: '0.01em' }}>{label}</p>
      {subtext && <p style={{ fontFamily: A.fontBody, fontSize: 11, color: A.textMuted, margin: '6px 0 0', paddingTop: 6, borderTop: `1px solid ${A.cardBorder}` }}>{subtext}</p>}
    </Card>
  );
}

// ─── Table helpers ────────────────────────────────────────────────────────────────
export function Table({ headers, rows, loading, emptyMsg = 'No data' }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: A.fontBody, fontSize: 13 }}>
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} style={{
                padding: '10px 16px', textAlign: 'left',
                fontFamily: A.fontBody, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
                textTransform: 'uppercase', color: A.textMuted,
                borderBottom: `1px solid ${A.cardBorder}`, whiteSpace: 'nowrap',
                background: 'rgba(200,64,112,0.02)',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            [...Array(5)].map((_, i) => (
              <tr key={i}>
                {headers.map((_, j) => (
                  <td key={j} style={{ padding: '12px 16px' }}>
                    <Skeleton height={16} />
                  </td>
                ))}
              </tr>
            ))
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length} style={{ padding: '48px 16px', textAlign: 'center', color: A.textMuted, fontSize: 14 }}>
                {emptyMsg}
              </td>
            </tr>
          ) : rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: `1px solid ${A.cardBorder}` }}
              onMouseEnter={e => e.currentTarget.style.background = A.roseBg}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {row}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Td({ children, style = {} }) {
  return <td style={{ padding: '12px 16px', color: A.textPrimary, verticalAlign: 'middle', ...style }}>{children}</td>;
}

// ─── CSV export helper ────────────────────────────────────────────────────────────
export function exportCSV(rows, filename) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map(row => headers.map(h => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(','))
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}