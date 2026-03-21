from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from cookbook.db_backup import import_backup_data


class Command(BaseCommand):
    help = "Import application backup data from JSON."

    def add_arguments(self, parser):
        parser.add_argument("input_path", help="Path to the JSON backup file.")

    def handle(self, *args, **options):
        input_path = Path(options["input_path"]).expanduser().resolve()
        if not input_path.is_file():
            raise CommandError(f"Backup file not found: {input_path}")

        counts = import_backup_data(input_path.read_bytes())
        self.stdout.write(self.style.SUCCESS(f"Backup imported from {input_path}"))
        for model_label, count in counts.items():
            self.stdout.write(f"{model_label}: {count}")
