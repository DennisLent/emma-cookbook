from django.core.management.base import BaseCommand

from users.management.seed_helpers import populate_database_for_user


class Command(BaseCommand):
    help = "Populate the recipe database for an existing user."

    def add_arguments(self, parser):
        parser.add_argument("username", help="Existing username that will own the seeded recipes")
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Clear existing recipe-related data before seeding.",
        )

    def handle(self, *args, **options):
        username = options["username"]
        reset = options["reset"]
        created_recipes = populate_database_for_user(username=username, stdout=self.stdout, reset=reset)
        self.stdout.write(self.style.SUCCESS(f"Seeded {len(created_recipes)} recipes for '{username}'"))
