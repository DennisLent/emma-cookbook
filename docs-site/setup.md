---
title: Setup
nav_order: 3
---

# Setup

emma-cookbook supports two main setup styles. For local development on your own machine, SQLite is the easiest and recommended default. For a fuller deployment that runs the complete stack in containers, the supported path uses Docker with PostgreSQL.

## Local Setup On Your Machine Or For Dev

If you just want to get the project running quickly, this is the easiest place to start.

Use the helper script:

```sh
./scripts/setup_local.sh
```

That creates a local SQLite-backed backend, runs migrations, and creates or updates a superuser for you. The database is stored in `backend/db.sqlite3`.

If you want to choose your own local admin credentials, you can pass them in like this:

```sh
LOCAL_SUPERUSER_USERNAME=admin LOCAL_SUPERUSER_PASSWORD=change-me ./scripts/setup_local.sh
```

If you want to wipe the local data and start fresh again, use:

```sh
./scripts/destroy_local.sh
```

If you want both frontend and backend running together during development, use:

```sh
./scripts/run.sh
```

That launcher reads from `dev_env` by default, starts the Django backend on `http://127.0.0.1:8000`, starts the frontend on `http://127.0.0.1:8080`, and runs migrations before the backend comes up.

SQLite is the recommended default for day-to-day development because it is quick to reset and avoids Docker or PostgreSQL state drift while you are iterating.

## Docker Setup

If you want a more production-style deployment, use Docker. In that setup, emma-cookbook runs with PostgreSQL, Redis, the Django backend, Celery worker and beat services, and the frontend container.

The easiest path is the interactive setup script:

```sh
./scripts/setup_docker_production.sh
```

That script helps you create a production env file, prepare the Vosk model, optionally import an existing backup, optionally start Ollama, bootstrap the Django admin user, and start the Docker stack.

The repo expects an env file such as `.env.production` for Docker-based deployments. The most important values to review are:

- `SECRET_KEY`
- `DEBUG`
- `ALLOWED_HOSTS`
- `CORS_ALLOWED_ORIGINS`
- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_HOST`
- `POSTGRES_PORT`
- `EMMA_BACKEND_IMAGE`
- `EMMA_FRONTEND_IMAGE`
- `EMMA_VERSION`
- `APP_UPDATE_REPOSITORY`
- `DJANGO_SUPERUSER_USERNAME`
- `DJANGO_SUPERUSER_PASSWORD`
- `SEED_INTERNAL_DATA`
- `OLLAMA_HOST`
- `OLLAMA_DEFAULT_MODEL`
- `VOSK_MODEL_PATH`

If `SEED_INTERNAL_DATA=1`, container startup runs `seed_internal_data` after migrations. That command creates or updates the configured superuser and seeds the internal starter recipe dataset for that account. If recipe data already exists, it skips reseeding unless you run the command manually with `--force` or `--reset`.

If you prefer managing things yourself after the first setup, you can use Docker Compose directly:

```sh
ENV_FILE=.env.production docker compose pull
ENV_FILE=.env.production docker compose up -d
```

If your deployment uses locally built images instead of published ones, rebuild with:

```sh
ENV_FILE=.env.production docker compose up --build -d
```

To update a deployment that uses published release images, run:

```sh
ENV_FILE=.env.production ./scripts/update_docker_production.sh v1.2.3
```
