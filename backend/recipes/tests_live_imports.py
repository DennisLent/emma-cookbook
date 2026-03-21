import os
from types import SimpleNamespace
from unittest import SkipTest
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase


RUN_LIVE_IMPORT_SMOKE_TESTS = os.getenv("RUN_LIVE_IMPORT_SMOKE_TESTS") == "1"

YOUTUBE_RECIPE_URL = "https://www.youtube.com/watch?v=HILQ80TNyCk"
TIKTOK_RECIPE_URL = "https://www.tiktok.com/@feelgoodfoodie/video/7619151208376290590"
INSTAGRAM_RECIPE_URL = "https://www.instagram.com/reel/C4mM4oqsKP-/"


def fake_ollama_chat(*_args, **_kwargs):
    return SimpleNamespace(
        message=SimpleNamespace(
            content=(
                '{"title":"Smoke Test Recipe","ingredients":[{"name":"salt","amount":"1 tsp"}],'
                '"instructions":["Mix everything together","Cook until finished"]}'
            )
        )
    )


@override_settings(CELERY_TASK_ALWAYS_EAGER=True, CELERY_TASK_EAGER_PROPAGATES=False)
class LiveRecipeImportSmokeTests(APITestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        if not RUN_LIVE_IMPORT_SMOKE_TESTS:
            raise SkipTest("Live import smoke tests are disabled unless RUN_LIVE_IMPORT_SMOKE_TESTS=1.")

    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="live-import-user",
            password="StrongPass123!",
        )
        self.client.force_authenticate(self.user)

    @patch("recipes.extraction.utils.llm.ollama.chat", side_effect=fake_ollama_chat)
    def test_youtube_recipe_preview_live_smoke(self, _ollama_chat):
        response = self.client.post(
            "/api/recipes/preview/youtube/",
            {"video_url": YOUTUBE_RECIPE_URL},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        payload = response.json()
        self.assertEqual(payload["title"], "Smoke Test Recipe")
        self.assertTrue(payload["ingredients_data"])
        self.assertIn("Cook until finished", payload["instructions"])

    @patch("recipes.extraction.utils.llm.ollama.chat", side_effect=fake_ollama_chat)
    def test_tiktok_recipe_import_job_live_smoke(self, _ollama_chat):
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(
                "/api/recipe-import-jobs/",
                {"url": TIKTOK_RECIPE_URL},
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        payload = response.json()

        detail = self.client.get(f"/api/recipe-import-jobs/{payload['id']}/")
        self.assertEqual(detail.status_code, status.HTTP_200_OK)
        detail_payload = detail.json()
        self.assertEqual(detail_payload["status"], "done")
        self.assertEqual(detail_payload["platform"], "tiktok")
        self.assertEqual(detail_payload["result"]["title"], "Smoke Test Recipe")
        self.assertTrue(detail_payload["mediaUrl"])
        self.assertTrue(detail_payload["audioUrl"])
        self.assertTrue(detail_payload["transcript"])

    @patch("recipes.extraction.utils.llm.ollama.chat", side_effect=fake_ollama_chat)
    def test_instagram_recipe_import_job_live_smoke(self, _ollama_chat):
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(
                "/api/recipe-import-jobs/",
                {"url": INSTAGRAM_RECIPE_URL},
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        payload = response.json()

        detail = self.client.get(f"/api/recipe-import-jobs/{payload['id']}/")
        self.assertEqual(detail.status_code, status.HTTP_200_OK)
        detail_payload = detail.json()

        self.assertIn(detail_payload["status"], {"done", "failed"})
        if detail_payload["status"] == "done":
            self.assertEqual(detail_payload["result"]["title"], "Smoke Test Recipe")
            self.assertTrue(detail_payload["transcript"])
        else:
            self.assertIn(detail_payload["errorCode"], {"authentication_required", "download_failed", "unexpected_error"})
