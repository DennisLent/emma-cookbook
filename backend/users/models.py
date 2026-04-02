"""User-account and deployment-status models for the application."""

from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    display_name = models.CharField(max_length=255, blank=True)
    bio = models.TextField(blank=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)

    # Don't use email because no smtp is envisioned
    email = models.EmailField(blank=True)
    preferences = models.JSONField(default=dict, blank=True)
    favorite_recipe_ids = models.JSONField(default=list, blank=True)

    # Role flag for clarity
    ROLE_CHOICES = (
        ("admin", "admin"),
        ("user", "user"),
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="user")

    # Per-user UI customization
    theme = models.JSONField(default=dict, blank=True)
    layout = models.JSONField(default=dict, blank=True)
    widget_whitelist = models.JSONField(default=list, blank=True)

    def save(self, *args, **kwargs):
        if not self.display_name:
            full_name = self.get_full_name().strip()
            self.display_name = full_name or self.username
        super().save(*args, **kwargs)

    def __str__(self):
        return self.username


class AppUpdateStatus(models.Model):
    current_version = models.CharField(max_length=64, blank=True)
    latest_version = models.CharField(max_length=64, blank=True)
    repository = models.CharField(max_length=255, blank=True)
    release_url = models.URLField(blank=True)
    update_available = models.BooleanField(default=False)
    last_checked_at = models.DateTimeField(null=True, blank=True)
    last_error = models.TextField(blank=True)
    dismissed_version = models.CharField(max_length=64, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "App update status"
        verbose_name_plural = "App update status"

    @classmethod
    def get_solo(cls):
        return cls.objects.order_by("pk").first()

    def __str__(self):
        return "App update status"
