from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase


class AppVersionApiTests(APITestCase):
    @override_settings(APP_NAME="EMMA", APP_VERSION="v1.2.3", APP_GIT_SHA="abc123def456")
    def test_app_version_endpoint_returns_runtime_metadata(self):
        response = self.client.get(reverse("app_version"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data,
            {
                "appName": "EMMA",
                "version": "v1.2.3",
                "gitSha": "abc123def456",
            },
        )
