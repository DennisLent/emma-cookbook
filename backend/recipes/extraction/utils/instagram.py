"""Instagram-specific wrappers around the shared public-video extraction helpers."""

from .public_video import (
    PublicVideoDownloadError,
    download_public_video,
    extract_audio_from_video,
    normalize_transcript_text,
    transcribe_wav_with_vosk,
)


def reel_to_wav(video_url: str) -> str:
    video_path, _ = download_public_video(video_url=video_url, target_dir="/tmp/reels")
    return extract_audio_from_video(video_path)


def transcribe_with_vosk(wav_path: str) -> str:
    return transcribe_wav_with_vosk(wav_path)


def extract_recipe_transcript_with_vosk(video_url: str) -> str:
    return normalize_transcript_text(transcribe_with_vosk(reel_to_wav(video_url)))


class InstagramCheckpointRequired(PublicVideoDownloadError):
    def __init__(self, challenge_url: str = ""):
        super().__init__("authentication_required", "Instagram checkpoint handling is not supported in the public-only importer.")
        self.challenge_url = challenge_url
