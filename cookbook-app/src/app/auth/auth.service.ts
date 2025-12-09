import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Router } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import { keycloak } from '../keycloak-init';

export interface RegisterUser {
  username: string;
  password: string;
  password2: string;
  bio?: string;
  avatar?: File | null;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private refreshInFlight: Promise<string | null> | null = null;
  private refreshBackoffUntil = 0;
  constructor(
    private http: HttpClient,
    private router: Router,
  ) {}

  // Unified login that branches by provider
  async login(opts?: { offline?: boolean }): Promise<void> {
    if (environment.authProvider === 'keycloak') {
      const scope = opts?.offline ? 'openid profile email offline_access' : 'openid profile email';
      await (keycloak as any)?.login({ redirectUri: window.location.origin, scope });
      return;
    }
    throw new Error('JWT login requires username/password. Use loginWithPassword instead.');
  }

  // JWT: username/password login
  loginWithPassword(username: string, password: string) {
    const apiUrl = `${environment.apiUrl}/auth`;
    return this.http.post<{ access: string; refresh: string }>(`${apiUrl}/token/`, { username, password });
  }

  register(user: RegisterUser) {
    const form = new FormData();
    form.append('username', user.username);
    form.append('password', user.password);
    form.append('password2', user.password2);
    if (user.bio) form.append('bio', user.bio);
    if (user.avatar) form.append('avatar', user.avatar);
    return this.http.post(`${environment.apiUrl}/auth/register/`, form);
  }

  async logout(): Promise<void> {
    if (environment.authProvider === 'keycloak') {
      await (keycloak as any)?.logout(window.location.origin);
    } else {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      this.router.navigate(['']);
    }
  }

  async isAuthenticated(): Promise<boolean> {
    if (environment.authProvider === 'keycloak') {
      const kc: any = keycloak as any;
      if (!kc) return false;
      if (!kc.token) return false;
      const expired = kc.isTokenExpired ? kc.isTokenExpired(5) : false;
      if (expired) {
        try {
          await kc.updateToken(30);
        } catch {
          return false;
        }
      }
      return !!kc.token;
    }
    const token = this.getAccessTokenSync();
    if (!token) return false;
    return !this.isExpired(token);
  }

  async getAccessToken(): Promise<string | null> {
    if (environment.authProvider === 'keycloak') {
      const kc: any = keycloak as any;
      if (!kc || !kc.token) return null;
      try {
        await kc.updateToken(30);
      } catch {
        await this.logout();
        return null;
      }
      return kc.token as string;
    }
    const token = this.getAccessTokenSync();
    if (!token) return null;
    if (this.isExpired(token)) {
      if (Date.now() < this.refreshBackoffUntil) return null;
      const refresh = this.getRefreshTokenSync();
      if (!refresh) return null;

      if (!this.refreshInFlight) {
        this.refreshInFlight = this.refreshAccessToken().catch(() => {
          // Throttle further attempts and clear invalid tokens
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          this.refreshBackoffUntil = Date.now() + 60_000;
          return null;
        }).finally(() => {
          // allow future refreshes after promise settles
          setTimeout(() => (this.refreshInFlight = null), 0);
        });
      }
      const newToken = await this.refreshInFlight;
      return newToken ?? null;
    }
    return token;
  }

  isLoggedInSync(): boolean {
    if (environment.authProvider === 'keycloak') {
      const kc: any = keycloak as any;
      return !!kc && !!kc.token;
    }
    const t = this.getAccessTokenSync();
    return !!t && !this.isExpired(t);
  }

  getCurrentUser() {
    return this.http.get(`${environment.apiUrl}/users/me/`);
  }

  updateCurrentUser(formData: FormData) {
    return this.http.patch(`${environment.apiUrl}/users/me/`, formData);
  }

  // JSON-based partial update (for preferences or theme)
  updateCurrentUserJson(body: any) {
    return this.http.patch(`${environment.apiUrl}/users/me/`, body);
  }

  // Helpers for JWT mode
  saveTokens(tokens: { access: string; refresh: string }) {
    localStorage.setItem('access_token', tokens.access);
    localStorage.setItem('refresh_token', tokens.refresh);
  }

  getAccessTokenSync(): string | null {
    return localStorage.getItem('access_token');
  }

  getRefreshTokenSync(): string | null {
    return localStorage.getItem('refresh_token');
  }

  private decode(token: string): any | null {
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch {
      return null;
    }
  }

  private isExpired(token: string): boolean {
    const payload = this.decode(token);
    if (!payload || !payload.exp) return true;
    return Date.now() / 1000 >= payload.exp;
    }

  private async refreshAccessToken(): Promise<string> {
    const refresh = this.getRefreshTokenSync();
    if (!refresh) throw new Error('No refresh token');
    const apiUrl = `${environment.apiUrl}/auth/token/refresh/`;
    const res = await lastValueFrom(this.http.post<{ access: string }>(apiUrl, { refresh }));
    if (!res?.access) throw new Error('No access token');
    this.saveTokens({ access: res.access, refresh });
    return res.access;
  }
}
