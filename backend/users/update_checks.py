"""Release-check helpers that compare the running app version to Git tags."""

import re
from typing import Iterable

import requests
from django.conf import settings
from django.utils import timezone

from .models import AppUpdateStatus


SEMVER_PATTERN = re.compile(r"^v?(\d+)\.(\d+)\.(\d+)$")


def parse_version(value: str | None) -> tuple[int, int, int] | None:
    normalized = (value or "").strip()
    match = SEMVER_PATTERN.fullmatch(normalized)
    if not match:
        return None
    return tuple(int(part) for part in match.groups())


def select_latest_version(values: Iterable[str]) -> str | None:
    candidates = []
    for value in values:
        parsed = parse_version(value)
        if parsed is not None:
            candidates.append((parsed, value))

    if not candidates:
        return None

    candidates.sort(key=lambda item: item[0], reverse=True)
    return candidates[0][1]


def is_newer_version(current_version: str, latest_version: str | None) -> bool:
    current = parse_version(current_version)
    latest = parse_version(latest_version)
    if current is None or latest is None:
        return False
    return latest > current


def get_update_status() -> AppUpdateStatus:
    status = AppUpdateStatus.get_solo()
    if status:
        return status

    return AppUpdateStatus.objects.create(
        latest_version="",
        update_available=False,
        release_url="",
        last_error="",
        dismissed_version="",
    )


def _build_tags_api_url(repository: str) -> str:
    return f"https://api.github.com/repos/{repository}/tags"


def check_for_updates() -> AppUpdateStatus:
    status = get_update_status()
    status.current_version = settings.APP_VERSION
    status.repository = settings.APP_UPDATE_REPOSITORY

    if not settings.APP_UPDATE_CHECK_ENABLED:
        status.update_available = False
        status.last_error = "Update checks are disabled."
        status.last_checked_at = timezone.now()
        status.save(
            update_fields=[
                "current_version",
                "repository",
                "update_available",
                "last_error",
                "last_checked_at",
                "updated_at",
            ]
        )
        return status

    repository = (settings.APP_UPDATE_REPOSITORY or "").strip()
    if not repository:
        status.update_available = False
        status.last_error = "APP_UPDATE_REPOSITORY is not configured."
        status.last_checked_at = timezone.now()
        status.save(
            update_fields=[
                "current_version",
                "repository",
                "update_available",
                "last_error",
                "last_checked_at",
                "updated_at",
            ]
        )
        return status

    try:
        response = requests.get(
            _build_tags_api_url(repository),
            params={"per_page": settings.APP_UPDATE_CHECK_TAG_LIMIT},
            headers={"Accept": "application/vnd.github+json"},
            timeout=settings.APP_UPDATE_CHECK_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        payload = response.json()
    except Exception as exc:
        status.update_available = False
        status.last_error = f"Update check failed: {exc}"
        status.last_checked_at = timezone.now()
        status.save(
            update_fields=[
                "current_version",
                "repository",
                "update_available",
                "last_error",
                "last_checked_at",
                "updated_at",
            ]
        )
        return status

    latest_version = select_latest_version(
        str(entry.get("name") or "").strip()
        for entry in payload
        if isinstance(entry, dict)
    )

    if latest_version is None:
        status.update_available = False
        status.last_error = "No stable version tags were found in the configured repository."
        status.last_checked_at = timezone.now()
        status.save(
            update_fields=[
                "current_version",
                "repository",
                "update_available",
                "last_error",
                "last_checked_at",
                "updated_at",
            ]
        )
        return status

    status.latest_version = latest_version
    status.release_url = f"https://github.com/{repository}/releases"
    status.last_error = ""
    status.last_checked_at = timezone.now()
    status.update_available = is_newer_version(settings.APP_VERSION, latest_version) and latest_version != status.dismissed_version
    status.save(
        update_fields=[
            "current_version",
            "repository",
            "latest_version",
            "release_url",
            "last_error",
            "last_checked_at",
            "update_available",
            "updated_at",
        ]
    )
    return status


def dismiss_update(version: str | None = None) -> AppUpdateStatus:
    status = get_update_status()
    dismissed_version = (version or status.latest_version or "").strip()
    status.dismissed_version = dismissed_version
    status.update_available = bool(
        status.latest_version
        and status.latest_version != dismissed_version
        and is_newer_version(status.current_version or settings.APP_VERSION, status.latest_version)
    )
    status.save(update_fields=["dismissed_version", "update_available", "updated_at"])
    return status
