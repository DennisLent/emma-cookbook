import urllib.error
from types import SimpleNamespace
from unittest.mock import patch

import jwt
from django.test import TestCase, override_settings
from jwt import ExpiredSignatureError, InvalidTokenError
from jwt.exceptions import PyJWKClientError
from rest_framework import exceptions
from rest_framework.test import APIRequestFactory

from cookbook.authentication import OIDCAuthentication


class OIDCAuthenticationTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.auth = OIDCAuthentication()

    def make_request(self, authorization_header):
        return self.factory.get("/api/users/me/", HTTP_AUTHORIZATION=authorization_header)

    @override_settings(AUTH_PROVIDER="jwt")
    def test_authenticate_returns_none_when_keycloak_is_disabled(self):
        request = self.make_request("Bearer token-value")
        self.assertIsNone(self.auth.authenticate(request))

    @override_settings(AUTH_PROVIDER="keycloak")
    def test_authenticate_returns_none_without_bearer_header(self):
        request = self.factory.get("/api/users/me/")
        self.assertIsNone(self.auth.authenticate(request))

    @override_settings(AUTH_PROVIDER="keycloak")
    def test_authenticate_rejects_missing_token_value(self):
        request = self.make_request("Bearer")

        with self.assertRaisesMessage(exceptions.AuthenticationFailed, "Invalid Authorization header"):
            self.auth.authenticate(request)

    @override_settings(AUTH_PROVIDER="keycloak")
    def test_authenticate_rejects_extra_header_parts(self):
        request = self.make_request("Bearer token extra")

        with self.assertRaisesMessage(exceptions.AuthenticationFailed, "Invalid Authorization header"):
            self.auth.authenticate(request)

    @override_settings(AUTH_PROVIDER="keycloak", KEYCLOAK_ISSUER="https://issuer.example/realms/cookbook")
    @patch("cookbook.authentication.jwt.decode", return_value={"iss": "https://other-issuer.example"})
    def test_authenticate_ignores_token_from_other_issuer(self, _mock_decode):
        request = self.make_request("Bearer token-value")
        self.assertIsNone(self.auth.authenticate(request))

    @override_settings(AUTH_PROVIDER="keycloak")
    @patch("cookbook.authentication.jwt.decode", side_effect=Exception("bad token"))
    def test_authenticate_ignores_unparseable_unverified_token(self, _mock_decode):
        request = self.make_request("Bearer token-value")
        self.assertIsNone(self.auth.authenticate(request))

    @override_settings(
        AUTH_PROVIDER="keycloak",
        KEYCLOAK_ISSUER="https://issuer.example/realms/cookbook",
        KEYCLOAK_CLIENT_ID="cookbook-web",
        KEYCLOAK_ADMIN_ROLE="cookbook-admin",
    )
    @patch.object(OIDCAuthentication, "_decode_token")
    @patch("cookbook.authentication.jwt.decode", return_value={"iss": "https://issuer.example/realms/cookbook"})
    def test_authenticate_creates_admin_user_from_keycloak_claims(self, _mock_unverified_decode, mock_decode_token):
        mock_decode_token.return_value = {
            "sub": "kc-user-1",
            "preferred_username": "kc-admin",
            "email": "admin@example.com",
            "given_name": "Key",
            "family_name": "Cloak",
            "realm_access": {"roles": ["cookbook-admin"]},
            "resource_access": {"cookbook-web": {"roles": ["editor"]}},
        }
        request = self.make_request("Bearer token-value")

        user, token = self.auth.authenticate(request)

        self.assertEqual(token, "token-value")
        self.assertEqual(user.username, "kc-admin")
        self.assertEqual(user.email, "admin@example.com")
        self.assertEqual(user.first_name, "Key")
        self.assertEqual(user.last_name, "Cloak")
        self.assertEqual(user.role, "admin")
        self.assertTrue(user.is_staff)

    @override_settings(
        KEYCLOAK_ISSUER="https://issuer.example/realms/cookbook",
        KEYCLOAK_AUDIENCE="cookbook-web",
        KEYCLOAK_JWKS_URL="https://issuer.example/jwks",
    )
    @patch("cookbook.authentication.jwt.decode")
    @patch("cookbook.authentication.PyJWKClient")
    def test_decode_token_uses_jwks_client(self, mock_jwk_client_class, mock_jwt_decode):
        mock_jwk_client = mock_jwk_client_class.return_value
        mock_jwk_client.get_signing_key_from_jwt.return_value = SimpleNamespace(key="public-key")
        mock_jwt_decode.return_value = {
            "sub": "kc-user-1",
            "aud": "cookbook-web",
            "iss": "https://issuer.example/realms/cookbook",
            "iat": 1,
            "exp": 9999999999,
        }

        payload = self.auth._decode_token("signed-token")

        self.assertEqual(payload["sub"], "kc-user-1")
        mock_jwk_client_class.assert_called_once_with("https://issuer.example/jwks")
        mock_jwk_client.get_signing_key_from_jwt.assert_called_once_with("signed-token")
        mock_jwt_decode.assert_called_once()

    @override_settings(KEYCLOAK_ISSUER="", KEYCLOAK_AUDIENCE="", KEYCLOAK_JWKS_URL="")
    def test_decode_token_requires_oidc_settings(self):
        with self.assertRaisesMessage(exceptions.AuthenticationFailed, "OIDC settings are not configured"):
            self.auth._decode_token("token-value")

    @override_settings(
        KEYCLOAK_ISSUER="https://issuer.example/realms/cookbook",
        KEYCLOAK_AUDIENCE="cookbook-web",
        KEYCLOAK_JWKS_URL="https://issuer.example/jwks",
    )
    @patch("cookbook.authentication.PyJWKClient")
    def test_decode_token_translates_expired_signature_error(self, mock_jwk_client_class):
        mock_jwk_client_class.return_value.get_signing_key_from_jwt.return_value = SimpleNamespace(key="public-key")

        with patch("cookbook.authentication.jwt.decode", side_effect=ExpiredSignatureError()):
            with self.assertRaisesMessage(exceptions.AuthenticationFailed, "Token expired"):
                self.auth._decode_token("signed-token")

    @override_settings(
        KEYCLOAK_ISSUER="https://issuer.example/realms/cookbook",
        KEYCLOAK_AUDIENCE="cookbook-web",
        KEYCLOAK_JWKS_URL="https://issuer.example/jwks",
    )
    @patch("cookbook.authentication.PyJWKClient")
    def test_decode_token_translates_invalid_verification_errors(self, mock_jwk_client_class):
        mock_jwk_client_class.return_value.get_signing_key_from_jwt.return_value = SimpleNamespace(key="public-key")

        for error in (
            InvalidTokenError("bad token"),
            PyJWKClientError("jwks failed"),
            urllib.error.URLError("network failed"),
        ):
            with self.subTest(error=type(error).__name__):
                with patch("cookbook.authentication.jwt.decode", side_effect=error):
                    with self.assertRaisesMessage(exceptions.AuthenticationFailed, "OIDC token verification failed"):
                        self.auth._decode_token("signed-token")

    @override_settings(KEYCLOAK_CLIENT_ID="cookbook-web", KEYCLOAK_ADMIN_ROLE="cookbook-admin")
    def test_get_or_create_user_from_claims_maps_realm_and_client_roles(self):
        user = self.auth._get_or_create_user_from_claims(
            {
                "sub": "user-123",
                "preferred_username": "chef",
                "email": "chef@example.com",
                "given_name": "Chef",
                "family_name": "Example",
                "realm_access": {"roles": ["viewer"]},
                "resource_access": {"cookbook-web": {"roles": ["cookbook-admin"]}},
            }
        )

        self.assertEqual(user.username, "chef")
        self.assertEqual(user.email, "chef@example.com")
        self.assertEqual(user.first_name, "Chef")
        self.assertEqual(user.last_name, "Example")
        self.assertEqual(user.role, "admin")
        self.assertTrue(user.is_staff)

    def test_get_or_create_user_from_claims_requires_username(self):
        with self.assertRaisesMessage(exceptions.AuthenticationFailed, "Token missing username"):
            self.auth._get_or_create_user_from_claims({"sub": None, "email": None})
