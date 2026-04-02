from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase


class ChangePasswordApiTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="chef",
            password="OldPass123!",
        )
        self.client.force_authenticate(self.user)

    def test_change_password_updates_user_password(self):
        response = self.client.post(
            "/api/users/me/change-password/",
            {
                "current_password": "OldPass123!",
                "new_password": "NewPass456!",
                "new_password2": "NewPass456!",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("NewPass456!"))

    def test_change_password_rejects_wrong_current_password(self):
        response = self.client.post(
            "/api/users/me/change-password/",
            {
                "current_password": "wrong-password",
                "new_password": "NewPass456!",
                "new_password2": "NewPass456!",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"]["code"], "bad_request")
        self.assertEqual(response.data["error"]["message"], "Request failed.")
        self.assertIn("current_password", response.data["error"]["details"])

    def test_change_password_requires_matching_new_passwords(self):
        response = self.client.post(
            "/api/users/me/change-password/",
            {
                "current_password": "OldPass123!",
                "new_password": "NewPass456!",
                "new_password2": "Mismatch456!",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"]["code"], "bad_request")
        self.assertEqual(response.data["error"]["message"], "Request failed.")
        self.assertIn("new_password", response.data["error"]["details"])
