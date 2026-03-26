from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import User


class UserSerializer(serializers.ModelSerializer):
    avatar = serializers.ImageField(required=False)
    name = serializers.CharField(source='display_name', required=False)
    avatarUrl = serializers.SerializerMethodField()
    prefs = serializers.SerializerMethodField()
    isSuperuser = serializers.BooleanField(source='is_superuser', read_only=True)
    theme = serializers.JSONField(required=False)
    layout = serializers.JSONField(required=False)
    widget_whitelist = serializers.JSONField(required=False)
    favorite_recipe_ids = serializers.JSONField(required=False)

    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'email',
            'display_name',
            'name',
            'avatarUrl',
            'prefs',
            'isSuperuser',
            'first_name',
            'last_name',
            'bio',
            'avatar',
            'preferences',
            'favorite_recipe_ids',
            'role',
            'theme',
            'layout',
            'widget_whitelist',
        ]
        read_only_fields = ['id', 'username', 'role']

    def get_avatarUrl(self, obj):
        return obj.avatar.url if obj.avatar else None

    def get_prefs(self, obj):
        return obj.preferences.get("prefs", {})


class UserRegisterSerializer(serializers.ModelSerializer):
    # require username + password
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, label="Confirm password")
    name = serializers.CharField(source='display_name', required=False, allow_blank=True)

    # optional
    email = serializers.EmailField(required=False, allow_blank=True)
    avatar = serializers.ImageField(required=False, allow_null=True)
    bio = serializers.CharField(required=False, allow_blank=True)
    preferences = serializers.JSONField(required=False)
    theme = serializers.JSONField(required=False)
    layout = serializers.JSONField(required=False)
    widget_whitelist = serializers.JSONField(required=False)

    class Meta:
        model = User
        fields = [
            'username', 'password', 'password2',
            'email', 'display_name', 'name',
            'bio', 'avatar', 'preferences',
            'theme', 'layout', 'widget_whitelist'
        ]

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Passwords do not match."})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password2')
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user
