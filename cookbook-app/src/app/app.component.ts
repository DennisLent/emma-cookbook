import { Component, OnInit } from '@angular/core';
import { LayoutComponent } from './core/layout/layout.component';
import { AuthService } from './auth/auth.service';
import { TranslateService } from './core/i18n/translate.service';
import { ThemeService } from './core/theme/theme.service';

@Component({
  selector: 'app-root',
  imports: [
    LayoutComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  title = 'cookbook-app';
  constructor(
    private auth: AuthService,
    private i18n: TranslateService,
    private theme: ThemeService
  ) {}

  ngOnInit(): void {
    try {
      if (this.auth.isLoggedInSync()) {
        this.auth.getCurrentUser().subscribe({
          next: (user: any) => {
            const lang = user?.preferences?.language;
            if (lang) this.i18n.setLanguage(lang);
            const th = user?.theme;
            if (th) this.theme.applyTheme(th);
          },
          error: () => {
            // Ignore if not authorized
          }
        });
      }
    } catch {}
  }
}
