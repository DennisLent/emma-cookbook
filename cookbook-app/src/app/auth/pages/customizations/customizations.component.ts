import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../auth/auth.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { TranslateService } from '../../../core/i18n/translate.service';
import { ThemeService } from '../../../core/theme/theme.service';
import { RecipeService } from '../../../recipes/recipes.service';
import { Tag } from '../../../recipes/recipes.model';

type Language = 'en' | 'de' | 'es' | 'fr';

@Component({
  standalone: true,
  selector: 'app-customizations',
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonToggleModule,
    MatInputModule,
    MatFormFieldModule,
    MatRadioModule,
    MatButtonModule,
    MatIconModule,
    TranslatePipe
  ],
  templateUrl: './customizations.component.html',
  styleUrls: ['./customizations.component.scss']
})
export class CustomizationsComponent implements OnInit {
  // segmented sections
  section: 'language' | 'style' = 'language';

  // server-backed user fields
  preferences: any = {};
  theme: { mainColor?: string; backgroundColor?: string; accentColor?: string; mode?: 'light' | 'dark' } = {};

  // transient UI state
  loading = true;
  saving = false;
  error = '';
  success = '';
  tags: Tag[] = [];
  newTag = '';
  tagMessage = '';

  languages: { code: Language; label: string }[] = [
    { code: 'en', label: 'English' },
    { code: 'de', label: 'German' },
    { code: 'es', label: 'Spanish' },
    { code: 'fr', label: 'French' },
  ];

  constructor(
    private auth: AuthService,
    private i18n: TranslateService,
    private themeSvc: ThemeService,
    private recipes: RecipeService
  ) {}

  ngOnInit(): void {
    this.auth.getCurrentUser().subscribe({
      next: (user: any) => {
        this.preferences = user.preferences || {};
        this.theme = {
          mainColor: user.theme?.mainColor || '#2563EB',
          backgroundColor: user.theme?.backgroundColor || '#F8FAFC',
          accentColor: user.theme?.accentColor || '#ff4081',
          mode: (user.theme?.mode as 'light' | 'dark') || 'light',
        };
        const lang = this.preferences?.language as Language | undefined;
        if (lang) this.i18n.setLanguage(lang);
        this.themeSvc.applyTheme(this.theme);
        this.loadTags();
        this.loading = false;
      },
      error: () => {
        this.error = this.i18n.t('status.failedLoadPrefs');
        this.loading = false;
      }
    });
  }

  setSection(s: 'language' | 'style') {
    this.section = s;
    this.success = '';
    this.error = '';
  }

  // Persist a subset of fields
  saveLanguage() {
    this.savePartial({ preferences: this.preferences });
    const lang = this.preferences?.language as Language | undefined;
    if (lang) {
      try {
        // Apply immediately in the UI
        this.i18n.setLanguage(lang);
        // Mirror to document and storage for persistence
        document.documentElement.lang = lang;
        localStorage.setItem('language', lang);
      } catch {}
    }
  }

  saveStyle() {
    this.savePartial({ theme: this.theme });
    try {
      localStorage.setItem('theme', JSON.stringify(this.theme));
    } catch {}
    this.themeSvc.applyTheme(this.theme);
  }

  // Live preview without saving
  previewTheme() {
    this.themeSvc.applyTheme(this.theme);
  }

  // Reset to defaults
  resetTheme() {
    this.theme = { mainColor: '#2563EB', backgroundColor: '#F8FAFC', accentColor: '#ff4081', mode: this.theme.mode || 'light' };
    this.previewTheme();
  }

  // Quick presets
  applyPreset(name: 'ocean' | 'forest' | 'rose' | 'slate' | 'amber') {
    const presets: Record<string, { main: string; bg: string; accent: string }> = {
      ocean: { main: '#1D4ED8', bg: '#EFF6FF', accent: '#06B6D4' },
      forest: { main: '#16A34A', bg: '#F0FDF4', accent: '#84CC16' },
      rose: { main: '#DB2777', bg: '#FFF1F2', accent: '#F97316' },
      slate: { main: '#475569', bg: '#F8FAFC', accent: '#94A3B8' },
      amber: { main: '#D97706', bg: '#FFFBEB', accent: '#E11D48' },
    };
    const p = presets[name];
    if (!p) return;
    this.theme = { ...this.theme, mainColor: p.main, backgroundColor: p.bg, accentColor: p.accent };
    this.previewTheme();
  }

  loadTags() {
    this.recipes.getAllTags().subscribe({
      next: (tags) => this.tags = tags,
      error: () => {}
    });
  }

  addTag() {
    const name = (this.newTag || '').trim();
    this.tagMessage = '';
    if (!name) return;
    if (this.tags.some(t => t.name.toLowerCase() === name.toLowerCase())) {
      this.tagMessage = 'Tag already exists.';
      return;
    }
    this.recipes.createTag(name).subscribe({
      next: (tag) => {
        this.tags = [...this.tags, tag].sort((a, b) => a.name.localeCompare(b.name));
        this.newTag = '';
        this.tagMessage = 'Tag added.';
      },
      error: (err) => {
        this.tagMessage = err.error?.detail || 'Failed to add tag.';
      }
    });
  }

  private savePartial(body: any) {
    this.saving = true;
    this.success = '';
    this.error = '';
    this.auth.updateCurrentUserJson(body).subscribe({
      next: () => {
        this.saving = false;
        this.success = this.i18n.t('status.saved');
      },
      error: () => {
        this.saving = false;
        this.error = this.i18n.t('status.failedSave');
      }
    });
  }
}
