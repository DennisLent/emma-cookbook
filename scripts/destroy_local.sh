#!/usr/bin/env bash

set -euo pipefail
IFS=$'\n\t'

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="${ROOT_DIR}/backend"
SQLITE_DB_PATH="${BACKEND_DIR}/db.sqlite3"
MEDIA_DIR="${BACKEND_DIR}/media"

echo "[destroy] Removing local SQLite database and media"

if [[ -f "${SQLITE_DB_PATH}" ]]; then
  rm -f "${SQLITE_DB_PATH}"
  echo "[destroy] Removed ${SQLITE_DB_PATH}"
else
  echo "[destroy] No SQLite database found at ${SQLITE_DB_PATH}"
fi

if [[ -d "${MEDIA_DIR}" ]]; then
  rm -rf "${MEDIA_DIR}"
  echo "[destroy] Removed ${MEDIA_DIR}"
else
  echo "[destroy] No media directory found at ${MEDIA_DIR}"
fi

echo "[destroy] Local Cookbook instance purged"
