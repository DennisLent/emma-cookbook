from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Creates or updates a standard Django user."

    def add_arguments(self, parser):
        parser.add_argument("username", help="Username for the user")
        parser.add_argument("password", help="Password for the user")

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

        user.is_superuser = False
        user.is_staff = False
        user.is_active = True
        user.role = "user"
        user.set_password(password)
        user.save()

        verb = "Created" if created else "Updated"
        self.stdout.write(self.style.SUCCESS(f"{verb} user '{username}'"))
