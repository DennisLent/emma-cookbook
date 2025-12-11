import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { provideIcons } from '@ng-icons/core';
import { ionLogoGithub, ionLogoLinkedin, ionHome, ionAddCircle, ionBook, ionAnalytics, ionReceipt } from '@ng-icons/ionicons';
import { AuthInterceptor } from './auth/auth.interceptor';
import { provideKeycloakInit } from './keycloak-init';
import { APP_INITIALIZER } from '@angular/core';
import { TranslateService } from './core/i18n/translate.service';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }), 
    provideRouter(routes),
    provideHttpClient(withInterceptors([AuthInterceptor])),
    ...provideKeycloakInit,
    {
      provide: APP_INITIALIZER,
      multi: true,
      deps: [TranslateService],
      useFactory: (i18n: TranslateService) => () => i18n.init(),
    },
    provideIcons({
      ionLogoGithub,
      ionLogoLinkedin,
      ionHome,
      ionAddCircle,
      ionBook,
      ionAnalytics,
      ionReceipt
    }),
    {
      provide: MAT_FORM_FIELD_DEFAULT_OPTIONS,
      useValue: { floatLabel: 'always', appearance: 'outline' }
    }
  ]
};
