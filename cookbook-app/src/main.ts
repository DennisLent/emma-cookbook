import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { NgModule } from '@angular/core';
import { MaterialModule } from './app/material/material.module';

// Initialize language attribute and theme from saved preference
try {
  const savedLang = localStorage.getItem('language');
  if (savedLang) {
    document.documentElement.lang = savedLang;
  }
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    const t = JSON.parse(savedTheme);
    const root = document.documentElement;
    if (t.mode === 'dark') {
      root.setAttribute('data-theme', 'dark');
    } else {
      root.removeAttribute('data-theme');
    }
    if (t.mainColor) {
      root.style.setProperty('--color-primary', t.mainColor);
      // crude hover derivation: identical if not computable here
      root.style.setProperty('--color-primary-hover', t.mainColor);
    }
    if (t.backgroundColor) {
      root.style.setProperty('--color-bg', t.backgroundColor);
    }
    if (t.accentColor) {
      root.style.setProperty('--color-accent', t.accentColor);
    }
  }
} catch {}

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
