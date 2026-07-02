// ui.jsx — shared UI primitives for the AI Humanizer app
const { useState, useRef, useEffect } = React;

// ── Icon ─────────────────────────────────────────────────────
function Icon({ name, size = 22, stroke = 'currentColor', sw = 1.8, fill = 'none', style }) {
  const d = ICONS[name];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} style={style}
      stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

// ── Card ─────────────────────────────────────────────────────
function Card({ children, style, onClick, pad = 16 }) {
  return (
    <div onClick={onClick} style={{
      background: 'var(--surface)', borderRadius: 'var(--r-lg)',
      border: '1px solid var(--border)', padding: pad,
      boxShadow: 'var(--shadow-sm)',
      ...(onClick ? { cursor: 'pointer' } : {}),
      ...style,
    }}>{children}</div>
  );
}

// ── Button ───────────────────────────────────────────────────
function Button({ children, onClick, variant = 'primary', size = 'md', icon, full, style, disabled }) {
  const sizes = {
    sm: { h: 38, fs: 14, px: 14, gap: 7 },
    md: { h: 50, fs: 16, px: 18, gap: 9 },
    lg: { h: 56, fs: 17, px: 22, gap: 10 },
  }[size];
  const variants = {
    primary: { background: 'var(--accent)', color: '#fff', border: '1px solid transparent', boxShadow: '0 1px 2px rgba(0,0,0,.12), 0 6px 16px var(--accent-glow)' },
    soft:    { background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid transparent' },
    ghost:   { background: 'transparent', color: 'var(--text)', border: '1px solid var(--border)' },
    dark:    { background: 'var(--text)', color: 'var(--surface)', border: '1px solid transparent' },
  }[variant];
  return (
    <button onClick={onClick} disabled={disabled} style={{
      height: sizes.h, fontSize: sizes.fs, padding: `0 ${sizes.px}px`,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: sizes.gap,
      borderRadius: 'var(--r-md)', fontWeight: 600, fontFamily: 'inherit',
      cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.45 : 1,
      width: full ? '100%' : undefined, letterSpacing: -0.2,
      transition: 'transform .12s ease, filter .12s ease',
      ...variants, ...style,
    }}
      onMouseDown={e => { if (!disabled) e.currentTarget.style.transform = 'scale(0.975)'; }}
      onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
      {icon && <Icon name={icon} size={sizes.fs + 3} sw={2} />}
      {children}
    </button>
  );
}

// ── Segmented control ────────────────────────────────────────
function Segmented({ options, value, onChange, getLabel = o => o, getId = o => o }) {
  return (
    <div style={{
      display: 'flex', background: 'var(--surface-2)', borderRadius: 'var(--r-md)',
      padding: 4, gap: 2, border: '1px solid var(--border)',
    }}>
      {options.map(o => {
        const id = getId(o), active = id === value;
        return (
          <button key={id} onClick={() => onChange(id)} style={{
            flex: 1, height: 38, borderRadius: 'calc(var(--r-md) - 4px)', border: 'none',
            background: active ? 'var(--surface)' : 'transparent',
            color: active ? 'var(--text)' : 'var(--text-muted)',
            fontWeight: active ? 650 : 500, fontSize: 13.5, fontFamily: 'inherit',
            cursor: 'pointer', letterSpacing: -0.1,
            boxShadow: active ? 'var(--shadow-sm)' : 'none',
            transition: 'all .15s ease',
          }}>{getLabel(o)}</button>
        );
      })}
    </div>
  );
}

// ── Risk pill / chip ─────────────────────────────────────────
const RISK = {
  red:   { c: 'var(--risk-red)',   bg: 'var(--risk-red-bg)',   label: 'Likely AI' },
  amber: { c: 'var(--risk-amber)', bg: 'var(--risk-amber-bg)', label: 'Mixed' },
  green: { c: 'var(--risk-green)', bg: 'var(--risk-green-bg)', label: 'Human' },
};
function Chip({ children, color = 'var(--text-muted)', bg = 'var(--surface-2)', style }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 12, fontWeight: 600, color, background: bg,
      padding: '4px 9px', borderRadius: 999, letterSpacing: -0.1, ...style,
    }}>{children}</span>
  );
}

// ── Circular gauge (AI score / readability) ──────────────────
function Gauge({ value, max = 100, size = 132, label, sub, color, track = 'var(--surface-2)', thickness = 11, big }) {
  const r = (size - thickness) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value / max));
  const [anim, setAnim] = useState(0);
  useEffect(() => { const t = setTimeout(() => setAnim(pct), 60); return () => clearTimeout(t); }, [pct]);
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={track} strokeWidth={thickness} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={thickness}
          strokeLinecap="round" strokeDasharray={circ}
          strokeDashoffset={circ * (1 - anim)}
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.4,0,.2,1)' }} />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ fontSize: big ? 38 : 30, fontWeight: 750, color: 'var(--text)', letterSpacing: -1, lineHeight: 1 }}>
          {label !== undefined ? label : `${Math.round(value)}%`}
        </div>
        {sub && <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4, fontWeight: 550 }}>{sub}</div>}
      </div>
    </div>
  );
}

// ── Linear progress / meter ──────────────────────────────────
function Meter({ value, max = 100, color = 'var(--accent)', track = 'var(--surface-2)', h = 8 }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div style={{ height: h, background: track, borderRadius: 999, overflow: 'hidden', width: '100%' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 999, transition: 'width .8s cubic-bezier(.4,0,.2,1)' }} />
    </div>
  );
}

// ── Bottom sheet ─────────────────────────────────────────────
function Sheet({ open, onClose, children, title }) {
  const [mounted, setMounted] = useState(open);
  useEffect(() => {
    if (open) { setMounted(true); return; }
    const id = setTimeout(() => setMounted(false), 380);
    return () => clearTimeout(id);
  }, [open]);
  if (!mounted) return null;
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 200, display: 'flex', flexDirection: 'column',
      justifyContent: 'flex-end',
      pointerEvents: open ? 'auto' : 'none',
    }}>
      <div onClick={onClose}
        style={{
          position: 'absolute', inset: 0, background: 'rgba(0,0,0,.4)',
          opacity: open ? 1 : 0, transition: 'opacity .28s ease', backdropFilter: 'blur(2px)',
        }} />
      <div style={{
        position: 'relative', background: 'var(--surface)',
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        padding: '12px 18px calc(20px + env(safe-area-inset-bottom))',
        transform: open ? 'translateY(0)' : 'translateY(110%)',
        transition: 'transform .34s cubic-bezier(.32,.72,0,1)',
        boxShadow: '0 -8px 40px rgba(0,0,0,.18)', maxHeight: '78%', overflow: 'auto',
      }}>
        <div style={{ width: 38, height: 5, borderRadius: 999, background: 'var(--border-strong)', margin: '0 auto 14px' }} />
        {title && <div style={{ fontSize: 19, fontWeight: 700, marginBottom: 14, letterSpacing: -0.4 }}>{title}</div>}
        {children}
      </div>
    </div>
  );
}

// ── Tab bar ──────────────────────────────────────────────────
function TabBar({ current, onNav, onHumanize }) {
  const tabs = [
    { id: 'home',     icon: 'home',   label: 'Home' },
    { id: 'detector', icon: 'detect', label: 'Detect' },
    { id: 'humanize', icon: 'wand',   label: 'Humanize', center: true },
    { id: 'stats',    icon: 'chart',  label: 'Metrics' },
    { id: 'profile',  icon: 'user',   label: 'Account' },
  ];
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 100,
      paddingBottom: 22, paddingTop: 10, display: 'flex', justifyContent: 'space-around',
      alignItems: 'flex-end',
      background: 'var(--tabbar-bg)', backdropFilter: 'blur(20px) saturate(180%)',
      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      borderTop: '1px solid var(--border)',
    }}>
      {tabs.map(t => {
        if (t.center) {
          return (
            <button key={t.id} onClick={onHumanize} style={{
              border: 'none', background: 'var(--accent)', width: 54, height: 54,
              borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', cursor: 'pointer', marginBottom: 2,
              boxShadow: '0 4px 14px var(--accent-glow), 0 2px 4px rgba(0,0,0,.12)',
              transition: 'transform .12s ease',
            }}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.92)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
              <Icon name="wand" size={26} sw={1.9} />
            </button>
          );
        }
        const active = current === t.id;
        return (
          <button key={t.id} onClick={() => onNav(t.id)} style={{
            border: 'none', background: 'transparent', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            width: 58, color: active ? 'var(--accent)' : 'var(--text-faint)',
            transition: 'color .15s ease',
          }}>
            <Icon name={t.icon} size={24} sw={active ? 2.1 : 1.8} />
            <span style={{ fontSize: 10, fontWeight: active ? 650 : 500, letterSpacing: -0.1 }}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── Screen header (large title style, custom) ────────────────
function Header({ title, sub, trailing, onBack }) {
  return (
    <div style={{ padding: '8px 20px 14px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
      {onBack && (
        <button onClick={onBack} style={{
          border: '1px solid var(--border)', background: 'var(--surface)', width: 38, height: 38,
          borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', flexShrink: 0, color: 'var(--text)', marginTop: 2,
        }}><Icon name="chevL" size={20} /></button>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 28, fontWeight: 760, letterSpacing: -0.8, color: 'var(--text)', lineHeight: 1.1 }}>{title}</div>
        {sub && <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 5, letterSpacing: -0.1 }}>{sub}</div>}
      </div>
      {trailing}
    </div>
  );
}

// ── Scroll container that clears status bar + tab bar ─────────
function Screen({ children, pb = 110, pt = 60, scroll = true }) {
  return (
    <div data-scroll style={{
      height: '100%', overflowY: scroll ? 'auto' : 'hidden',
      paddingTop: pt, paddingBottom: pb, WebkitOverflowScrolling: 'touch',
    }}>{children}</div>
  );
}

Object.assign(window, {
  Icon, Card, Button, Segmented, Chip, RISK, Gauge, Meter, Sheet, TabBar, Header, Screen,
});
