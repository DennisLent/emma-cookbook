import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { AuthService } from '../../../auth/auth.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { TranslateService } from '../../../core/i18n/translate.service';
import { ThemeService } from '../../../core/theme/theme.service';

type Language = 'en' | 'de' | 'es' | 'fr';

@Component({
  standalone: true,
  selector: 'app-customizations',
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatInputModule,
    MatRadioModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    TranslatePipe,
    DragDropModule
  ],
  templateUrl: './customizations.component.html',
  styleUrls: ['./customizations.component.scss']
})
export class CustomizationsComponent implements OnInit {
  // segmented sections
  section: 'language' | 'style' | 'recipes' = 'language';

  // server-backed user fields
  preferences: any = {};
  theme: { mainColor?: string; backgroundColor?: string; accentColor?: string; mode?: 'light' | 'dark' } = {};
  layout: { recipeView?: 'grid' | 'list'; recipeDetailColumns?: 1 | 2 } = {};

  // Recipe layout builder
  readonly DEFAULT_RECIPE_DETAIL: string[] = ['image','title','description','meta','ingredients','steps','comments'];
  layoutActive: string[] = [];
  layoutAvailable: string[] = ['tags','author','nutrition'];

  // transient UI state
  loading = true;
  saving = false;
  error = '';
  success = '';

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
        this.layout = {
          recipeView: user.layout?.recipeView || 'grid',
          recipeDetailColumns: (user.layout?.recipeDetailColumns as 1|2) || 2
        };
        const savedDetail = (user.layout?.recipeDetail as string[] | undefined);
        this.layoutActive = Array.isArray(savedDetail) && savedDetail.length
          ? [...savedDetail]
          : [...this.DEFAULT_RECIPE_DETAIL];
        const lang = this.preferences?.language as Language | undefined;
        if (lang) this.i18n.setLanguage(lang);
        this.themeSvc.applyTheme(this.theme);
        this.loading = false;
      },
      error: () => {
        this.error = this.i18n.t('status.failedLoadPrefs');
        this.loading = false;
      }
    });
  }

  setSection(s: 'language' | 'style' | 'recipes') {
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

  saveRecipes() {
    const layout = { ...this.layout, recipeDetail: this.layoutActive };
    this.savePartial({ layout });
    try {
      localStorage.setItem('layout_recipe_detail', JSON.stringify(this.layoutActive));
      if (this.layout.recipeDetailColumns)
        localStorage.setItem('layout_recipe_detail_columns', String(this.layout.recipeDetailColumns));
    } catch {}
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

  // Drag & drop handlers
  dropActive(event: CdkDragDrop<string[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(this.layoutActive, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
    }
  }

  dropAvailable(event: CdkDragDrop<string[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(this.layoutAvailable, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
    }
  }

  resetLayout() {
    this.layoutActive = [...this.DEFAULT_RECIPE_DETAIL];
    this.layoutAvailable = ['tags','author','nutrition'];
  }
}
