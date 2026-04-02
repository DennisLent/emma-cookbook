"""Import/export helpers for JSON-based application backups."""

import json
from dataclasses import dataclass

from django.apps import apps
from django.core import serializers
from django.core.management.color import no_style
from django.db import connection, transaction


@dataclass(frozen=True)
class BackupModelSpec:
    model_label: str

    @property
    def model(self):
        return apps.get_model(self.model_label)


BACKUP_MODELS = [
    BackupModelSpec("users.User"),
    BackupModelSpec("recipes.Tag"),
    BackupModelSpec("recipes.Ingredient"),
    BackupModelSpec("recipes.IngredientAlias"),
    BackupModelSpec("recipes.Recipe"),
    BackupModelSpec("recipes.RecipeIngredient"),
    BackupModelSpec("recipes.RecipeStep"),
    BackupModelSpec("recipes.Rating"),
    BackupModelSpec("recipes.Comment"),
    BackupModelSpec("recipes.Collection"),
    BackupModelSpec("recipes.CollectionRecipe"),
    BackupModelSpec("recipes.RecipeImportJob"),
]

BACKUP_MODEL_LABELS = {spec.model_label.lower() for spec in BACKUP_MODELS}


def export_backup_data() -> bytes:
    payload = []
    for spec in BACKUP_MODELS:
        queryset = spec.model.objects.all().order_by("pk")
        payload.extend(json.loads(serializers.serialize("json", queryset)))

    return json.dumps(payload, indent=2).encode("utf-8")


def import_backup_data(raw_bytes: bytes) -> dict[str, int]:
    fixture = json.loads(raw_bytes.decode("utf-8"))
    if not isinstance(fixture, list):
        raise ValueError("Backup payload must be a JSON array.")

    for entry in fixture:
        model_label = str(entry.get("model", "")).lower()
        if model_label not in BACKUP_MODEL_LABELS:
            raise ValueError(f"Unsupported model in backup payload: {entry.get('model')}")

    deserialized = list(serializers.deserialize("json", json.dumps(fixture)))

    with transaction.atomic():
        _clear_backup_models()
        for record in deserialized:
            record.save()
        _reset_backup_sequences()

    counts: dict[str, int] = {}
    for spec in BACKUP_MODELS:
        counts[spec.model_label] = spec.model.objects.count()
    return counts


def _clear_backup_models() -> None:
    for spec in reversed(BACKUP_MODELS):
        spec.model.objects.all().delete()


def _reset_backup_sequences() -> None:
    sql_statements = connection.ops.sequence_reset_sql(no_style(), [spec.model for spec in BACKUP_MODELS])
    if not sql_statements:
        return

    with connection.cursor() as cursor:
        for statement in sql_statements:
            cursor.execute(statement)
