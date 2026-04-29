#!/usr/bin/env bash
set -euo pipefail

SSH_HOST="${SSH_HOST:-24.233.2.106}"
SSH_PORT="${SSH_PORT:-13608}"
SSH_USER="${SSH_USER:-root}"
REMOTE_DIR="${REMOTE_DIR:-/data/code/filemanager}"
SERVICE_NAME="${SERVICE_NAME:-filemanager.service}"
REMOTE_PORT="${REMOTE_PORT:-3002}"
RSYNC_DELETE="${RSYNC_DELETE:-0}"

REMOTE="${SSH_USER}@${SSH_HOST}"
SSH_CMD=(ssh -p "${SSH_PORT}")
RSYNC_CMD=(rsync -az)

if [[ "${RSYNC_DELETE}" == "1" ]]; then
  RSYNC_CMD+=(--delete)
fi

RSYNC_CMD+=(
  --exclude ".git/"
  --exclude ".next/"
  --exclude "node_modules/"
  --exclude ".env"
  --exclude "data/"
  --exclude "*.log"
  -e "ssh -p ${SSH_PORT}"
)

echo "Deploying to ${REMOTE}:${REMOTE_DIR}"

command -v rsync >/dev/null 2>&1 || {
  echo "rsync is required but was not found locally." >&2
  exit 1
}

"${SSH_CMD[@]}" "${REMOTE}" "mkdir -p '${REMOTE_DIR}'"

"${RSYNC_CMD[@]}" ./ "${REMOTE}:${REMOTE_DIR}/"

"${SSH_CMD[@]}" "${REMOTE}" \
  "REMOTE_DIR='${REMOTE_DIR}' SERVICE_NAME='${SERVICE_NAME}' REMOTE_PORT='${REMOTE_PORT}' bash -s" <<'REMOTE_SCRIPT'
set -euo pipefail

cd "${REMOTE_DIR}"

echo "Installing dependencies..."
if [[ -f package-lock.json ]]; then
  npm ci
else
  npm install
fi

echo "Building Next.js app..."
npm run build

echo "Restarting ${SERVICE_NAME}..."
systemctl restart "${SERVICE_NAME}"
sleep 2
systemctl is-active --quiet "${SERVICE_NAME}"

echo "Verifying local service..."
curl -fsSI "http://127.0.0.1:${REMOTE_PORT}/login" >/dev/null

tmp_html="$(mktemp)"
trap 'rm -f "${tmp_html}"' EXIT
curl -fsS "http://127.0.0.1:${REMOTE_PORT}/login" -o "${tmp_html}"

assets="$(grep -Eo '/_next/static/[^"'\'' >)]+' "${tmp_html}" | sed 's/\\$//' | sort -u || true)"
if [[ -z "${assets}" ]]; then
  echo "Warning: no _next/static assets found on /login."
else
  while IFS= read -r asset; do
    [[ -z "${asset}" ]] && continue
    curl -fsSI "http://127.0.0.1:${REMOTE_PORT}${asset}" >/dev/null
  done <<< "${assets}"
fi

echo "Deployment finished successfully."
REMOTE_SCRIPT
