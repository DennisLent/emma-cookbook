#!/usr/bin/env bash

set -euo pipefail
IFS=$'\n\t'

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE_PATH="${ENV_FILE:-${ROOT_DIR}/.env.production}"
VERSION_TAG="${1:-}"

read_env_value() {
  local key="$1"
  local value
  value="$(grep -E "^${key}=" "${ENV_FILE_PATH}" | tail -n 1 | cut -d '=' -f 2-)"
  printf '%s' "${value}"
}

if [[ ! -f "${ENV_FILE_PATH}" ]]; then
  echo "Environment file not found: ${ENV_FILE_PATH}" >&2
  exit 1
fi

if [[ -n "${VERSION_TAG}" ]]; then
  EMMA_VERSION="${VERSION_TAG}"
fi

echo "Using environment file: ${ENV_FILE_PATH}"
if [[ -n "${VERSION_TAG}" ]]; then
  echo "Target version: ${VERSION_TAG}"
fi

EMMA_BACKEND_IMAGE="${EMMA_BACKEND_IMAGE:-$(read_env_value EMMA_BACKEND_IMAGE)}"
EMMA_FRONTEND_IMAGE="${EMMA_FRONTEND_IMAGE:-$(read_env_value EMMA_FRONTEND_IMAGE)}"
EMMA_VERSION="${EMMA_VERSION:-$(read_env_value EMMA_VERSION)}"
EMMA_GIT_SHA="${EMMA_GIT_SHA:-$(read_env_value EMMA_GIT_SHA)}"

ENV_FILE="${ENV_FILE_PATH}" \
EMMA_BACKEND_IMAGE="${EMMA_BACKEND_IMAGE}" \
EMMA_FRONTEND_IMAGE="${EMMA_FRONTEND_IMAGE}" \
EMMA_VERSION="${EMMA_VERSION}" \
EMMA_GIT_SHA="${EMMA_GIT_SHA}" \
docker compose pull backend worker beat frontend

ENV_FILE="${ENV_FILE_PATH}" \
EMMA_BACKEND_IMAGE="${EMMA_BACKEND_IMAGE}" \
EMMA_FRONTEND_IMAGE="${EMMA_FRONTEND_IMAGE}" \
EMMA_VERSION="${EMMA_VERSION}" \
EMMA_GIT_SHA="${EMMA_GIT_SHA}" \
docker compose up -d backend worker beat frontend

echo "emma-cookbook services updated."
