from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Creates or updates a Django superuser."

    def add_arguments(self, parser):
        parser.add_argument("username", help="Username for the superuser")
        parser.add_argument("password", help="Password for the superuser")

    def handle(self, *args, **options):
        username = options["username"]
        password = options["password"]

        user_model = get_user_model()
        user, created = user_model.objects.get_or_create(
            username=username,
            defaults={
                "display_name": username,
                "first_name": username,
            },
        )

        user.is_superuser = True
        user.is_staff = True
        user.is_active = True
        user.role = "admin"
        user.set_password(password)
        user.save()

        verb = "Created" if created else "Updated"
        self.stdout.write(self.style.SUCCESS(f"{verb} superuser '{username}'"))
