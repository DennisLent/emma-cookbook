import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import en from './translations/en';
import es from './translations/es';

export type LangCode = 'en' | 'es' | 'de' | 'fr';

type Dict = Record<string, string>;
const DICTS: Record<Exclude<LangCode, 'de' | 'fr'>, Dict> = { en, es } as const;

@Injectable({ providedIn: 'root' })
export class TranslateService {
  private currentLang$ = new BehaviorSubject<LangCode>('en');

  init() {
    const saved = (localStorage.getItem('language') as LangCode | null) || 'en';
    this.setLanguage(saved);
  }

  langChanges() {
    return this.currentLang$.asObservable();
  }

  get current() {
    return this.currentLang$.value;
  }

  setLanguage(lang: LangCode) {
    // Fallback unsupported languages to English for now
    const supported: LangCode = (['en', 'es'] as LangCode[]).includes(lang) ? lang : 'en';
    this.currentLang$.next(supported);
    try {
      document.documentElement.lang = supported;
      localStorage.setItem('language', supported);
    } catch {}
  }

  t(key: string): string {
    const lang = this.current;
    const dict = (DICTS as any)[lang] as Dict | undefined;
    if (dict && key in dict) return dict[key];
    const enStr = (en as any)[key];
    return enStr || key;
  }
}

