import { Injectable } from '@angular/core';

export interface ThemePrefs {
  mainColor?: string;
  backgroundColor?: string;
  accentColor?: string;
}

@Injectable({ providedIn: 'root' })
export class ThemeService {
  applyTheme(theme: ThemePrefs) {
    const root = document.documentElement;
    const set = (k: string, v?: string) => {
      if (v) root.style.setProperty(k, v);
    };
    set('--color-primary', theme.mainColor);
    set('--color-bg', theme.backgroundColor);
    // Derive a hover tone (fallback to same color)
    const hover = theme.mainColor ? this.darken(theme.mainColor, 8) : undefined;
    set('--color-primary-hover', hover || theme.mainColor);
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
}

