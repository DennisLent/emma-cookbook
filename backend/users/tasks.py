"""Background jobs owned by the users app."""

from celery import shared_task

from .update_checks import check_for_updates


@shared_task
def check_for_app_updates():
    status = check_for_updates()
    return {
        "latest_version": status.latest_version,
        "update_available": status.update_available,
        "last_error": status.last_error,
    }
