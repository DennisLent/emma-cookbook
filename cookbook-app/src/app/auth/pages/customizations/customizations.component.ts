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
    TranslatePipe
  ],
  templateUrl: './customizations.component.html',
  styleUrls: ['./customizations.component.scss']
})
export class CustomizationsComponent implements OnInit {
  // segmented sections
  section: 'language' | 'style' | 'recipes' = 'language';

  // server-backed user fields
  preferences: any = {};
  theme: { mainColor?: string; backgroundColor?: string; accentColor?: string } = {};
  layout: { recipeView?: 'grid' | 'list' } = {};

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
          mainColor: user.theme?.mainColor || '#3f51b5',
          backgroundColor: user.theme?.backgroundColor || '#ffffff',
          accentColor: user.theme?.accentColor || '#ff4081',
        };
        this.layout = { recipeView: user.layout?.recipeView || 'grid' };
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

  saveRecipes() {
    this.savePartial({ layout: this.layout });
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
