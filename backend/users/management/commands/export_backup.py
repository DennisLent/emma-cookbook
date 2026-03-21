from pathlib import Path

from django.core.management.base import BaseCommand

from cookbook.db_backup import export_backup_data


class Command(BaseCommand):
    help = "Export application backup data as JSON."

    def add_arguments(self, parser):
        parser.add_argument("output_path", help="Path to write the JSON backup to.")

    def handle(self, *args, **options):
        output_path = Path(options["output_path"]).expanduser().resolve()
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_bytes(export_backup_data())
        self.stdout.write(self.style.SUCCESS(f"Backup exported to {output_path}"))
