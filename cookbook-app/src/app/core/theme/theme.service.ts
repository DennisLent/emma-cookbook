import { Injectable } from '@angular/core';

export interface ThemePrefs {
  mainColor?: string;
  backgroundColor?: string;
  accentColor?: string;
  mode?: 'light' | 'dark';
}

@Injectable({ providedIn: 'root' })
export class ThemeService {
  applyTheme(theme: ThemePrefs) {
    const root = document.documentElement;
    // Theme mode (light/dark)
    if (theme.mode === 'dark') {
      root.setAttribute('data-theme', 'dark');
    } else {
      root.removeAttribute('data-theme');
    }
    const set = (k: string, v?: string) => {
      if (v) root.style.setProperty(k, v);
    };
    const baseBg = theme.backgroundColor || '#F8FAFC';
    const primary = theme.mainColor || '#2563EB';
    const accent = theme.accentColor || '#ff4081';

    set('--color-primary', primary);
    set('--color-accent', accent);
    // Accessible on-primary text based on contrast
    const onPrimary = this.textOn(primary) === '#0F172A' ? '#0F172A' : '#FFFFFF';
    set('--mdc-theme-on-primary', onPrimary);

    if (theme.mode === 'dark') {
      const darkBg = this.darken(baseBg, 165);
      const surface = this.lighten(darkBg, 12);
      set('--color-bg', darkBg);
      set('--color-surface', surface);
      set('--color-text', '#E5E7EB');
      set('--color-muted', '#9CA3AF');
      set('--color-border', this.lighten(darkBg, 22));
    } else {
      // Light mode derived tokens from chosen background
      const surface = this.lighten(baseBg, 8);
      set('--color-bg', baseBg);
      set('--color-surface', surface);
      set('--color-text', this.textOn(baseBg));
      set('--color-muted', this.mutedOn(baseBg));
      set('--color-border', this.darken(baseBg, 18));
    }
    // Derive a hover tone (fallback to same color)
    const hover = primary ? this.darken(primary, 8) : undefined;
    set('--color-primary-hover', hover || primary);
  }

  private darken(hex: string, amount = 10): string {
    const m = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
    if (!m) return hex;
    const clamp = (n: number) => Math.max(0, Math.min(255, n));
    const r = clamp(parseInt(m[1], 16) - amount);
    const g = clamp(parseInt(m[2], 16) - amount);
    const b = clamp(parseInt(m[3], 16) - amount);
    return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
  }

  private lighten(hex: string, amount = 10): string {
    const m = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
    if (!m) return hex;
    const clamp = (n: number) => Math.max(0, Math.min(255, n));
    const r = clamp(parseInt(m[1], 16) + amount);
    const g = clamp(parseInt(m[2], 16) + amount);
    const b = clamp(parseInt(m[3], 16) + amount);
    return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
  }

  private textOn(bg: string): string {
    // YIQ contrast
    const m = bg.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
    if (!m) return '#0F172A';
    const r = parseInt(m[1], 16), g = parseInt(m[2], 16), b = parseInt(m[3], 16);
    const yiq = (r*299 + g*587 + b*114) / 1000;
    return yiq >= 150 ? '#0F172A' : '#E5E7EB';
  }

  private mutedOn(bg: string): string {
    const base = this.textOn(bg) === '#0F172A' ? '#475569' : '#9CA3AF';
    return base;
  }
}
