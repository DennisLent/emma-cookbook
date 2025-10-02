import { APP_INITIALIZER, Provider } from '@angular/core';
import { KeycloakService } from 'keycloak-angular';
import { environment } from '../environments/environment';

function initializeKeycloak(keycloak: KeycloakService) {
  return () => keycloak.init({
    config: {
      url: environment.keycloak.url,
      realm: environment.keycloak.realm,
      clientId: environment.keycloak.clientId,
    },
    initOptions: {
      pkceMethod: 'S256',
      onLoad: 'check-sso',
      silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html',
    },
    bearerExcludedUrls: [],
    enableBearerInterceptor: false,
  });
}

export const provideKeycloakInit: Provider[] = [
  {
    provide: APP_INITIALIZER,
    useFactory: initializeKeycloak,
    multi: true,
    deps: [KeycloakService],
  },
];

