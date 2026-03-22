from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from recipes.extraction.utils import validate_public_video_url
from recipes.models import RecipeImportJob


class RecipeImportJobApiTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username="chef", password="secret123")
        self.client.force_authenticate(self.user)

    @patch("recipes.extraction.utils.validate_public_video_url", return_value="instagram")
    @patch("recipes.tasks.process_recipe_import_job.delay")
    def test_create_recipe_import_job_queues_background_task(self, delay_mock, validate_mock):
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(
                reverse("recipe-import-job-list"),
                {"url": "https://www.instagram.com/reel/abc123/"},
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertEqual(RecipeImportJob.objects.count(), 1)

        job = RecipeImportJob.objects.get()
        self.assertEqual(job.status, RecipeImportJob.STATUS_QUEUED)
        self.assertEqual(job.progress_stage, RecipeImportJob.STAGE_QUEUED)
        self.assertEqual(job.platform, "instagram")
        delay_mock.assert_called_once_with(job.pk)
        validate_mock.assert_called_once()

    def test_create_recipe_import_job_rejects_unsupported_host(self):
        response = self.client.post(
            reverse("recipe-import-job-list"),
            {"url": "https://example.com/video/123"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"]["code"], "unsupported_host")

    @patch("recipes.tasks.process_recipe_import_job.delay")
    def test_create_recipe_import_job_accepts_youtube_url(self, delay_mock):
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(
                reverse("recipe-import-job-list"),
                {"url": "https://www.youtube.com/watch?v=HILQ80TNyCk"},
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        job = RecipeImportJob.objects.get()
        self.assertEqual(job.platform, RecipeImportJob.PLATFORM_YOUTUBE)
        delay_mock.assert_called_once_with(job.pk)

    def test_retrieve_recipe_import_job_is_scoped_to_request_user(self):
        other_user = get_user_model().objects.create_user(username="other", password="secret123")
        job = RecipeImportJob.objects.create(
            user=other_user,
            source_url="https://www.tiktok.com/@cook/video/123",
            platform=RecipeImportJob.PLATFORM_TIKTOK,
        )

        response = self.client.get(reverse("recipe-import-job-detail", args=[job.pk]))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class RecipeImportJobTaskTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username="task-user", password="secret123")

    @patch("recipes.tasks.extract_recipe_from_transcript")
    @patch("recipes.tasks.transcribe_wav_with_vosk", return_value="mix flour with eggs and bake for twenty minutes " * 5)
    @patch("recipes.tasks.extract_audio_from_video")
    @patch("recipes.tasks.download_public_video")
    def test_process_recipe_import_job_marks_job_done(
        self,
        download_mock,
        extract_audio_mock,
        transcribe_mock,
        extract_recipe_mock,
    ):
        job = RecipeImportJob.objects.create(
            user=self.user,
            source_url="https://www.instagram.com/reel/abc123/",
            platform=RecipeImportJob.PLATFORM_INSTAGRAM,
        )

        def fake_download(_url, target_dir):
            video_path = f"{target_dir}/clip.mp4"
            with open(video_path, "wb") as handle:
                handle.write(b"video")
            return video_path, 5

        def fake_audio(video_path):
            audio_path = video_path.replace(".mp4", ".wav")
            with open(audio_path, "wb") as handle:
                handle.write(b"audio")
            return audio_path

        download_mock.side_effect = fake_download
        extract_audio_mock.side_effect = fake_audio
        extract_recipe_mock.return_value = {
            "title": "Test Recipe",
            "description": "https://www.instagram.com/reel/abc123/",
            "instructions": "Mix\nBake",
            "ingredients_data": [{"ingredient": "Flour", "amount": "1 cup"}],
            "tags": [],
            "image": None,
        }

        from recipes.tasks import process_recipe_import_job

        process_recipe_import_job.run(job.pk)

        job.refresh_from_db()
        self.assertEqual(job.status, RecipeImportJob.STATUS_DONE)
        self.assertEqual(job.progress_stage, RecipeImportJob.STAGE_DONE)
        self.assertEqual(job.file_size_bytes, 5)
        self.assertTrue(job.media_file.name)
        self.assertTrue(job.audio_file.name)
        self.assertEqual(job.extracted_recipe["title"], "Test Recipe")
        transcribe_mock.assert_called_once()

    @patch("recipes.tasks.download_public_video")
    def test_process_recipe_import_job_marks_job_failed(self, download_mock):
        job = RecipeImportJob.objects.create(
            user=self.user,
            source_url="https://www.tiktok.com/@cook/video/123",
            platform=RecipeImportJob.PLATFORM_TIKTOK,
        )
        from recipes.extraction.utils import PublicVideoDownloadError
        from recipes.tasks import process_recipe_import_job

        download_mock.side_effect = PublicVideoDownloadError("authentication_required", "Private video")

        with self.assertRaises(PublicVideoDownloadError):
            process_recipe_import_job.run(job.pk)

        job.refresh_from_db()
        self.assertEqual(job.status, RecipeImportJob.STATUS_FAILED)
        self.assertEqual(job.progress_stage, RecipeImportJob.STAGE_DOWNLOADING)
        self.assertEqual(job.error_code, "authentication_required")


class PublicVideoValidationTests(APITestCase):
    @override_settings(
        RECIPE_IMPORT_ALLOWED_HOSTS=[
            "instagram.com",
            "www.instagram.com",
            "m.instagram.com",
            "tiktok.com",
            "www.tiktok.com",
            "m.tiktok.com",
            "vm.tiktok.com",
            "youtube.com",
            "www.youtube.com",
            "m.youtube.com",
            "youtu.be",
        ]
    )
    def test_validate_public_video_url_accepts_youtube_hosts(self):
        self.assertEqual(
            validate_public_video_url("https://www.youtube.com/watch?v=HILQ80TNyCk"),
            "youtube",
        )
        self.assertEqual(
            validate_public_video_url("https://youtu.be/HILQ80TNyCk"),
            "youtube",
        )
