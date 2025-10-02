import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Router } from '@angular/router';
import { KeycloakService } from 'keycloak-angular';

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(
    private http: HttpClient,
    private router: Router,
    private keycloak: KeycloakService,
  ) {}

  async login(opts?: { offline?: boolean }): Promise<void> {
    const scope = opts?.offline ? 'openid profile email offline_access' : 'openid profile email';
    await this.keycloak.login({
      redirectUri: window.location.origin,
      scope,
    });
  }

  async logout(): Promise<void> {
    await this.keycloak.logout(window.location.origin);
  }

  async isAuthenticated(): Promise<boolean> {
    return this.keycloak.isLoggedIn();
  }

  async getAccessToken(): Promise<string | null> {
    const isLogged = await this.keycloak.isLoggedIn();
    if (!isLogged) return null;
    await this.keycloak.updateToken(30).catch(() => this.logout());
    return this.keycloak.getToken();
  }

  isLoggedInSync(): boolean {
    // For simple template checks; may be slightly stale
    return !!this.keycloak.getKeycloakInstance().token;
  }

  getCurrentUser() {
    return this.http.get(`${environment.apiUrl}/users/me/`);
  }

  updateCurrentUser(formData: FormData) {
    return this.http.patch(`${environment.apiUrl}/users/me/`, formData);
  }
}
