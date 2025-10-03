import { APP_INITIALIZER, Provider } from '@angular/core';
import { environment } from '../environments/environment';
import Keycloak from 'keycloak-js';

export let keycloak: any = null;

function initializeKeycloak() {
  return () => {
    if (environment.authProvider !== 'keycloak') return Promise.resolve(true);

    keycloak = new (Keycloak as any)({
      url: environment.keycloak.url,
      realm: environment.keycloak.realm,
      clientId: environment.keycloak.clientId,
    });

    return (keycloak as any)
      .init({
        pkceMethod: 'S256',
        onLoad: 'check-sso',
        silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html',
      })
      .catch(() => true as any);
  };
}

export const provideKeycloakInit: Provider[] = [
  {
    provide: APP_INITIALIZER,
    useFactory: initializeKeycloak,
    multi: true,
    deps: [],
  },
];
