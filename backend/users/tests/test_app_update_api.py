from unittest.mock import Mock, patch

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from users.update_checks import is_newer_version, select_latest_version


class UpdateVersionHelpersTests(TestCase):
    def test_select_latest_version_ignores_non_semver_values(self):
        latest = select_latest_version(["main", "v1.2.3", "v1.10.0", "release-candidate"])
        self.assertEqual(latest, "v1.10.0")

    def test_is_newer_version_compares_semver_tags(self):
        self.assertTrue(is_newer_version("v1.2.3", "v1.3.0"))
        self.assertFalse(is_newer_version("v1.3.0", "v1.3.0"))
        self.assertFalse(is_newer_version("dev", "v1.3.0"))


class AppUpdateApiTests(APITestCase):
    def setUp(self):
        self.admin = get_user_model().objects.create_user(
            username="admin",
            password="secret123",
            role="admin",
            is_staff=True,
            is_superuser=True,
        )
        self.user = get_user_model().objects.create_user(username="chef", password="secret123")

    def test_non_superuser_cannot_view_or_modify_update_status(self):
        self.client.force_authenticate(self.user)

        status_response = self.client.get(reverse("app_update_status"))
        check_response = self.client.post(reverse("app_update_check"), {}, format="json")
        dismiss_response = self.client.post(reverse("app_update_dismiss"), {}, format="json")

        self.assertEqual(status_response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(check_response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(dismiss_response.status_code, status.HTTP_403_FORBIDDEN)

    @override_settings(
        APP_VERSION="v1.0.0",
        APP_UPDATE_CHECK_ENABLED=True,
        APP_UPDATE_REPOSITORY="example/emma-cookbook",
    )
    @patch("users.update_checks.requests.get")
    def test_superuser_can_check_for_updates(self, mock_get):
        mock_response = Mock()
        mock_response.json.return_value = [
            {"name": "v1.2.0"},
            {"name": "v1.1.0"},
            {"name": "not-a-release"},
        ]
        mock_response.raise_for_status.return_value = None
        mock_get.return_value = mock_response

        self.client.force_authenticate(self.admin)
        response = self.client.post(reverse("app_update_check"), {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["currentVersion"], "v1.0.0")
        self.assertEqual(response.data["latestVersion"], "v1.2.0")
        self.assertTrue(response.data["updateAvailable"])
        self.assertEqual(response.data["repository"], "example/emma-cookbook")
        self.assertEqual(response.data["releaseUrl"], "https://github.com/example/emma-cookbook/releases")

    @override_settings(
        APP_VERSION="v1.0.0",
        APP_UPDATE_CHECK_ENABLED=True,
        APP_UPDATE_REPOSITORY="example/emma-cookbook",
    )
    @patch("users.update_checks.requests.get")
    def test_superuser_can_dismiss_update_notice(self, mock_get):
        mock_response = Mock()
        mock_response.json.return_value = [{"name": "v1.2.0"}]
        mock_response.raise_for_status.return_value = None
        mock_get.return_value = mock_response

        self.client.force_authenticate(self.admin)
        self.client.post(reverse("app_update_check"), {}, format="json")
        response = self.client.post(reverse("app_update_dismiss"), {"version": "v1.2.0"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["dismissedVersion"], "v1.2.0")
        self.assertFalse(response.data["updateAvailable"])

    @override_settings(APP_VERSION="v1.0.0", APP_UPDATE_CHECK_ENABLED=False, APP_UPDATE_REPOSITORY="")
    def test_status_reflects_disabled_update_checks(self):
        self.client.force_authenticate(self.admin)

        response = self.client.get(reverse("app_update_status"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["updateChecksEnabled"])
