export type Theme = 'dark' | 'light';

interface ThemeTokens {
  surface: string;
  surfaceRaised: string;
  surfaceHover: string;
  border: string;
  borderSubtle: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  accent: string;
  accentSubtle: string;
  chipBg: string;
  chipHostBg: string;
  chipHostText: string;
  bubbleOther: string;
  bubbleMine: string;
  inputBg: string;
  inputBorder: string;
  handoffWarn: string;
  shadow: string;
}

export const tokens: Record<Theme, ThemeTokens> = {
  dark: {
    surface: '#181818',
    surfaceRaised: 'rgba(255,255,255,0.03)',
    surfaceHover: 'rgba(255,255,255,0.04)',
    border: 'rgba(255,255,255,0.08)',
    borderSubtle: 'rgba(255,255,255,0.06)',
    text: '#ffffff',
    textSecondary: 'rgba(255,255,255,0.6)',
    textTertiary: 'rgba(255,255,255,0.4)',
    accent: '#ff0033',
    accentSubtle: 'rgba(255,0,51,0.12)',
    chipBg: 'rgba(255,255,255,0.06)',
    chipHostBg: 'rgba(255,193,7,0.12)',
    chipHostText: '#ffc107',
    bubbleOther: '#2a2a2a',
    bubbleMine: '#ff0033',
    inputBg: '#232323',
    inputBorder: '#2e2e2e',
    handoffWarn: '#ff9800',
    shadow: '0 0 24px rgba(0,0,0,0.4)',
  },
  light: {
    surface: '#ffffff',
    surfaceRaised: '#f7f7f7',
    surfaceHover: 'rgba(0,0,0,0.04)',
    border: 'rgba(0,0,0,0.08)',
    borderSubtle: 'rgba(0,0,0,0.06)',
    text: '#0f0f0f',
    textSecondary: 'rgba(0,0,0,0.6)',
    textTertiary: 'rgba(0,0,0,0.4)',
    accent: '#ff0033',
    accentSubtle: 'rgba(255,0,51,0.12)',
    chipBg: 'rgba(0,0,0,0.06)',
    chipHostBg: 'rgba(245,158,11,0.15)',
    chipHostText: '#b45309',
    bubbleOther: '#f1f1f1',
    bubbleMine: '#ff0033',
    inputBg: '#ffffff',
    inputBorder: 'rgba(0,0,0,0.15)',
    handoffWarn: '#d97706',
    shadow: '0 0 24px rgba(0,0,0,0.15)',
  },
};

export const radii = { sm: 4, md: 8, lg: 12, xl: 14, full: 999 } as const;
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;
