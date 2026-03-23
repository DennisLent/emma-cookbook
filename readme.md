# Cookbook

## Local Backend Setup

Use the helper scripts in [scripts/setup_local.sh](/scripts/setup_local.sh) and [scripts/destroy_local.sh](/scripts/destroy_local.sh) to create and reset a disposable local backend instance backed by SQLite.

Create a local instance with a seeded superuser:

```sh
./scripts/setup_local.sh
```

Override the default superuser credentials if needed:

```sh
LOCAL_SUPERUSER_USERNAME=superuser LOCAL_SUPERUSER_PASSWORD=secret ./scripts/setup_local.sh
```

Destroy the local SQLite database and uploaded media so the next setup starts fresh:

```sh
./scripts/destroy_local.sh
```

Video import jobs support public YouTube, Instagram, and TikTok URLs. For local video imports to work end to end, the backend also needs `yt-dlp`, `ffmpeg`, and a Vosk model available.

## Database Backup

The backend exposes admin-only JSON backup and restore endpoints that are used by the frontend Settings page:

- `GET /api/database/export/`
- `POST /api/database/import/`

For shell-based workflows, use:

```sh
./scripts/export_db.sh
./scripts/import_db.sh <backup-file>
```

`export_db.sh` and `import_db.sh` support both the local SQLite setup and the Docker/Postgres setup, based on `DATABASE_ENGINE`.

## Docker Production Setup

Run the interactive Docker bootstrap with:

```sh
./scripts/setup_docker_production.sh
```

It creates a production env file, prepares the Vosk model, optionally imports an existing backup, optionally starts Ollama and pulls a model, bootstraps the Django admin user, and then starts the Docker stack.

## Docker rebuild

When changes are made to the project or to the env file, rebuild the entire stack using:

```
ENV_FILE=.env.production docker compose up --build -d
```
