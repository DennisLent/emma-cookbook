from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.safestring import mark_safe
from .models import User

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    model = User
    list_display = (
        'username', 'first_name', 'last_name', 'role', 'is_staff', 'is_active'
    )
    # Include bio, avatar, and preferences in both edit and add forms
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Extra Info', {
            'fields': (
                'bio', 'avatar', 'preferences', 'role', 'theme', 'layout', 'widget_whitelist', 'avatar_preview'
            )
        }),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Extra Info', {
            'fields': (
                'bio', 'avatar', 'preferences', 'role', 'theme', 'layout', 'widget_whitelist'
            )
        }),
    )
    # Optional: show avatar thumbnail in list
    readonly_fields = ('avatar_preview',)

    def avatar_preview(self, obj):
        if obj.avatar:
            return mark_safe(f"<img src='{obj.avatar.url}' width='50' height='50' style='object-fit:cover;border-radius:50%;'/>")
        return "-"
    avatar_preview.short_description = 'Avatar'
