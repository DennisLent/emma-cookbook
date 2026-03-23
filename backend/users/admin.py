from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.safestring import mark_safe

from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    model = User
    list_display = (
        "username",
        "display_name",
        "email",
        "role",
        "is_staff",
        "is_superuser",
        "is_active",
    )
    list_filter = ("role", "is_staff", "is_superuser", "is_active", "groups")
    search_fields = ("username", "display_name", "first_name", "last_name", "email")
    ordering = ("username",)
    readonly_fields = ("avatar_preview", "last_login", "date_joined")
    fieldsets = (
        (None, {"fields": ("username", "password")}),
        ("Profile", {
            "fields": (
                "display_name",
                "first_name",
                "last_name",
                "email",
                "bio",
                "avatar",
                "avatar_preview",
            )
        }),
        ("Permissions", {
            "fields": (
                "role",
                "is_active",
                "is_staff",
                "is_superuser",
                "groups",
                "user_permissions",
            )
        }),
        ("Preferences", {
            "fields": ("preferences", "theme", "layout", "widget_whitelist", "favorite_recipe_ids")
        }),
        ("Important dates", {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("username", "password1", "password2"),
        }),
        ("Profile", {
            "classes": ("wide",),
            "fields": ("display_name", "first_name", "last_name", "email", "bio", "avatar"),
        }),
        ("Permissions", {
            "classes": ("wide",),
            "fields": ("role", "is_active", "is_staff", "is_superuser", "groups", "user_permissions"),
        }),
        ("Preferences", {
            "classes": ("wide",),
            "fields": ("preferences", "theme", "layout", "widget_whitelist", "favorite_recipe_ids"),
        }),
    )

    def avatar_preview(self, obj):
        if obj and obj.avatar:
            return mark_safe(
                f"<img src='{obj.avatar.url}' width='50' height='50' "
                "style='object-fit:cover;border-radius:50%;'/>"
            )
        return "-"

    avatar_preview.short_description = "Avatar"
