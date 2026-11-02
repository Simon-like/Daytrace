#!/usr/bin/env bash
set -euo pipefail

MANIFEST="${1:?release manifest path is required}"
: "${DEPLOY_MODE:?required}" "${DEPLOY_DIRECTORY:?required}" "${DEPLOY_CONTENT_ROOT:?required}" "${PUBLIC_ORIGIN:?required}"
[[ "$DEPLOY_MODE" =~ ^(staging|production|rollback)$ ]]
[[ "$DEPLOY_DIRECTORY" =~ ^/[A-Za-z0-9._/-]+$ ]]
[[ "$DEPLOY_CONTENT_ROOT" =~ ^/[A-Za-z0-9._/-]+$ ]]
for command in docker jq curl flock; do command -v "$command" >/dev/null; done
docker info >/dev/null
[[ -d "$DEPLOY_CONTENT_ROOT/public" && -d "$DEPLOY_CONTENT_ROOT/private" ]]
RELEASE_ID="$(jq -er '.releaseId' "$MANIFEST")"
[[ "$RELEASE_ID" =~ ^[a-z0-9][a-z0-9.-]{2,127}$ ]]
RELEASE_DIR="$(cd "$(dirname "$MANIFEST")" && pwd)"
[[ "$RELEASE_DIR" == "$DEPLOY_DIRECTORY/.incoming/$RELEASE_ID" ]]
[[ "$(jq -er '.schemaVersion' "$MANIFEST")" == "daytrace.release/v1" ]]
API_IMAGE="$(jq -er '.images.api | test("^[^ ]+@sha256:[0-9a-f]{64}$")' "$MANIFEST" >/dev/null && jq -r '.images.api' "$MANIFEST")"
SITE_IMAGE="$(jq -er '.images.site | test("^[^ ]+@sha256:[0-9a-f]{64}$")' "$MANIFEST" >/dev/null && jq -r '.images.site' "$MANIFEST")"
CURRENT="$DEPLOY_DIRECTORY/current"
PROJECT="daytrace-${DEPLOY_MODE/production/production}"
if [[ "$DEPLOY_MODE" == "rollback" ]]; then PROJECT="daytrace-production"; fi
mkdir -p "$DEPLOY_DIRECTORY"
exec 9>"$DEPLOY_DIRECTORY/.deploy.lock"
flock -w 60 9
PREVIOUS="$(readlink -f "$CURRENT" 2>/dev/null || true)"
if [[ -n "$PREVIOUS" && ! -f "$PREVIOUS/release.env" ]]; then
  echo "Current release pointer is invalid; refusing to replace it." >&2
  exit 1
fi
{
  printf 'API_IMAGE=%s\n' "$API_IMAGE"
  printf 'SITE_IMAGE=%s\n' "$SITE_IMAGE"
  printf 'CONTENT_ROOT=%s\n' "$DEPLOY_CONTENT_ROOT"
  printf 'SITE_BIND=%s\n' "${SITE_BIND:-127.0.0.1}"
  printf 'SITE_PORT=%s\n' "${SITE_PORT:-3000}"
} > "$RELEASE_DIR/release.env"
chmod 600 "$RELEASE_DIR/release.env"

compose_for() {
  local directory="$1"
  shift
  docker compose --project-name "$PROJECT" --env-file "$directory/release.env" -f "$directory/compose.deploy.yaml" "$@"
}

verify_release() {
  local directory="$1"
  local attempt
  for attempt in $(seq 1 24); do
    if compose_for "$directory" exec -T api node -e "fetch('http://127.0.0.1:3001/api/v1/health/ready').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))" >/dev/null 2>&1; then
      break
    fi
    if [[ "$attempt" == "24" ]]; then return 1; fi
    sleep 5
  done
  for attempt in $(seq 1 24); do
    if curl --fail --silent --show-error --max-time 20 "$PUBLIC_ORIGIN/" -o "$RELEASE_DIR/public-smoke.html"; then
      break
    fi
    if [[ "$attempt" == "24" ]]; then return 1; fi
    sleep 5
  done
  grep -qi '<html' "$RELEASE_DIR/public-smoke.html"
  curl --fail --silent --show-error --max-time 20 "$PUBLIC_ORIGIN/api/v1/health/ready" -o /dev/null
  local owner_status
  owner_status="$(curl --silent --output /dev/null --write-out '%{http_code}' --max-time 20 "$PUBLIC_ORIGIN/api/v1/records?scope=owner")"
  [[ "$owner_status" == "401" ]]
  rm -f "$RELEASE_DIR/public-smoke.html"
}

restore_previous() {
  if [[ -z "$PREVIOUS" ]]; then
    compose_for "$RELEASE_DIR" down --remove-orphans || true
    return 1
  fi
  compose_for "$PREVIOUS" up -d --remove-orphans && verify_release "$PREVIOUS" || return 1
  ln -sfn "$PREVIOUS" "$CURRENT.restore"
  mv -Tf "$CURRENT.restore" "$CURRENT"
}

if ! compose_for "$RELEASE_DIR" pull api site; then
  echo "Image pull failed; existing services were not stopped." >&2
  exit 1
fi
if ! compose_for "$RELEASE_DIR" up -d --remove-orphans || ! verify_release "$RELEASE_DIR"; then
  echo "Candidate verification failed; attempting to restore the previous complete release." >&2
  if ! restore_previous; then
    echo "Automatic restoration failed or no previous release exists; manual intervention is required." >&2
    exit 1
  fi
  echo "Previous release restored and verified; candidate was not promoted." >&2
  exit 1
fi

ln -sfn "$RELEASE_DIR" "$CURRENT.next"
mv -Tf "$CURRENT.next" "$CURRENT"
SCHEMA="daytrace.deployment-evidence/v1"
if [[ "$DEPLOY_MODE" == "staging" ]]; then SCHEMA="daytrace.staging-evidence/v1"; fi
jq -n \
  --arg schemaVersion "$SCHEMA" \
  --arg status verified \
  --arg releaseId "$RELEASE_ID" \
  --arg gitSha "$(jq -r '.source.gitSha' "$MANIFEST")" \
  --arg verifiedAt "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --arg environment "$DEPLOY_MODE" \
  --argjson images "$(jq '.images' "$MANIFEST")" \
  '{schemaVersion:$schemaVersion,status:$status,releaseId:$releaseId,gitSha:$gitSha,images:$images,environment:$environment,verifiedAt:$verifiedAt}' \
  > "$RELEASE_DIR/evidence.json"
echo "Release $RELEASE_ID verified; $CURRENT now references this complete image pair."
