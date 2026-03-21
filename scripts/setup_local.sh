#!/usr/bin/env bash

set -euo pipefail
IFS=$'\n\t'

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="${ROOT_DIR}/backend"
PYTHON_BIN="${PYTHON_BIN:-python3}"

LOCAL_SUPERUSER_USERNAME="${LOCAL_SUPERUSER_USERNAME:-admin}"
LOCAL_SUPERUSER_PASSWORD="${LOCAL_SUPERUSER_PASSWORD:-admin123}"

activate_venv() {
  if [[ -f "${ROOT_DIR}/venv/bin/activate" ]]; then
    echo "[setup] Activating virtualenv from ${ROOT_DIR}/venv"
    # shellcheck disable=SC1091
    source "${ROOT_DIR}/venv/bin/activate"
  fi
}

echo "[setup] Preparing local Cookbook instance with SQLite"
activate_venv

pushd "${BACKEND_DIR}" >/dev/null

export DATABASE_ENGINE=sqlite
export SECRET_KEY="${SECRET_KEY:-dev-secret-key}"
export DEBUG="${DEBUG:-True}"

echo "[setup] Applying migrations"
"${PYTHON_BIN}" manage.py migrate --noinput

echo "[setup] Creating/updating superuser '${LOCAL_SUPERUSER_USERNAME}' and seeding recipe data"
"${PYTHON_BIN}" manage.py seed_internal_data \
  --username "${LOCAL_SUPERUSER_USERNAME}" \
  --password "${LOCAL_SUPERUSER_PASSWORD}" \
  --reset

popd >/dev/null

echo "[setup] Local instance is ready"
echo "[setup] Superuser username: ${LOCAL_SUPERUSER_USERNAME}"
echo "[setup] Superuser password: ${LOCAL_SUPERUSER_PASSWORD}"
echo "[setup] Database: ${BACKEND_DIR}/db.sqlite3"
