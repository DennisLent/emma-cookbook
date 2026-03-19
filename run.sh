#!/usr/bin/env bash

set -euo pipefail
IFS=$'\n\t'

# Config
DJANGO_DIR="backend"
FRONTEND_DIR="cookbook-app"
DJANGO_PORT=8000
FRONTEND_PORT=8080
ENV_FILE=${ENV_FILE:-dev_env}

activate_venv() {
  if [[ -f "venv/bin/activate" ]]; then
    echo "[backend] Activating virtualenv..."
    # shellcheck disable=SC1091
    source venv/bin/activate
  fi
}

start_backend() {
  echo ">>> Starting Django backend in ./${DJANGO_DIR}"

  activate_venv

  if [[ -f "${ENV_FILE}" ]]; then
    echo "[backend] Loading environment from ${ENV_FILE}..."
    set -a
    # shellcheck disable=SC1090
    source "${ENV_FILE}"
    set +a
  fi

  echo "[backend] Installing Python deps..."
  python3 -m pip install -r requirements.txt

  pushd "${DJANGO_DIR}" >/dev/null

  echo "[backend] Applying migrations..."
  python3 manage.py makemigrations
  python3 manage.py migrate

  echo "[backend] Running server on http://127.0.0.1:${DJANGO_PORT}/"
  python3 manage.py runserver "${DJANGO_PORT}"

  popd >/dev/null
}


start_frontend() {
  echo ">>> Starting frontend in ./${FRONTEND_DIR}"
  pushd "${FRONTEND_DIR}" >/dev/null

  echo "[frontend] Installing NPM deps (only if needed)..."
  npm install

  echo "[frontend] Running Vite dev environment on http://127.0.0.1:${FRONTEND_PORT}/"
  npm run dev -- --host 127.0.0.1 --port "${FRONTEND_PORT}"

  popd >/dev/null
}


echo "Launching cookbook..."

start_backend &

sleep 3

start_frontend

wait
