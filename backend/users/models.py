from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    bio = models.TextField(blank=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)

    # Don't use email because no smtp is envisioned
    email = models.EmailField(blank=True)
    preferences = models.JSONField(default=dict, blank=True)

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


    def __str__(self):
        return self.username
