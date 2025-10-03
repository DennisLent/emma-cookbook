export const environment = {
  production: true,
  apiUrl: '/api',
  authProvider: 'keycloak',
  keycloak: {
    url: 'https://keycloak.example.com',
    realm: 'cookbook',
    clientId: 'cookbook-web'
  }
};
