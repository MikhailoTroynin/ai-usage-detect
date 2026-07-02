export type ColorScheme = 'light' | 'dark';

export const ACCENTS = ['#5E6AD2', '#2F9E68', '#7C5CDB', '#E8833A', '#2F7BE0', '#111827'];
export const DEFAULT_ACCENT = ACCENTS[0];

export const RADII = { lg: 18, md: 13 };

function hexToRgb(hex: string) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const int = parseInt(full, 16);
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}

export function withAlpha(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export interface Theme {
  scheme: ColorScheme;
  accent: string;
  bg: string;
  surface: string;
  surface2: string;
  text: string;
  textMuted: string;
  textFaint: string;
  border: string;
  borderStrong: string;
  shadowOpacity: number;
  tabbarBg: string;
  riskRed: string; riskRedBg: string;
  riskAmber: string; riskAmberBg: string;
  riskGreen: string; riskGreenBg: string;
  accentSoft: string;
  accentGlow: string;
  radii: typeof RADII;
}

export function buildTheme(scheme: ColorScheme, accent: string = DEFAULT_ACCENT): Theme {
  if (scheme === 'dark') {
    return {
      scheme, accent,
      bg: '#0E0E12', surface: '#18181D', surface2: '#25252C',
      text: '#F3F3F6', textMuted: '#9696A2', textFaint: '#5E5E68',
      border: 'rgba(255,255,255,0.09)', borderStrong: 'rgba(255,255,255,0.24)',
      shadowOpacity: 0.35,
      tabbarBg: 'rgba(18,18,22,0.92)',
      riskRed: '#FF6166', riskRedBg: 'rgba(229,72,77,0.16)',
      riskAmber: '#E0A33A', riskAmberBg: 'rgba(216,135,11,0.17)',
      riskGreen: '#3DBE83', riskGreenBg: 'rgba(47,158,104,0.17)',
      accentSoft: withAlpha(accent, 0.22),
      accentGlow: withAlpha(accent, 0.4),
      radii: RADII,
    };
  }
  return {
    scheme, accent,
    bg: '#F4F4F7', surface: '#FFFFFF', surface2: '#F0F0F4',
    text: '#1A1A1F', textMuted: '#6B6B77', textFaint: '#A2A2AE',
    border: 'rgba(0,0,0,0.075)', borderStrong: 'rgba(0,0,0,0.18)',
    shadowOpacity: 0.06,
    tabbarBg: 'rgba(255,255,255,0.92)',
    riskRed: '#E5484D', riskRedBg: '#FCEBEC',
    riskAmber: '#C7820C', riskAmberBg: '#FAF1DF',
    riskGreen: '#2F9E68', riskGreenBg: '#E7F5EE',
    accentSoft: withAlpha(accent, 0.12),
    accentGlow: withAlpha(accent, 0.28),
    radii: RADII,
  };
}
