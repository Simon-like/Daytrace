#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
: "${DEPLOY_MODE:?staging, production, or rollback is required}"
: "${DEPLOY_HOST:?required}" "${DEPLOY_USER:?required}" "${DEPLOY_SSH_KEY:?required}"
: "${DEPLOY_HOST_KEY:?required}" "${DEPLOY_DIRECTORY:?required}" "${DEPLOY_CONTENT_ROOT:?required}"
: "${PUBLIC_ORIGIN:?required}" "${RELEASE_MANIFEST:?required}"
[[ "$DEPLOY_MODE" =~ ^(staging|production|rollback)$ ]]
[[ "$DEPLOY_DIRECTORY" =~ ^/[A-Za-z0-9._/-]+$ ]]
[[ "$DEPLOY_CONTENT_ROOT" =~ ^/[A-Za-z0-9._/-]+$ ]]
[[ "$PUBLIC_ORIGIN" =~ ^https?://[A-Za-z0-9.:-]+(/[A-Za-z0-9._/-]*)?$ ]]
RELEASE_ID="$(jq -er '.releaseId | select(test("^[a-z0-9][a-z0-9.-]{2,127}$"))' "$RELEASE_MANIFEST")"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
chmod 700 "$WORK"
printf '%s\n' "$DEPLOY_SSH_KEY" > "$WORK/id"
printf '%s\n' "$DEPLOY_HOST_KEY" > "$WORK/known_hosts"
chmod 600 "$WORK/id" "$WORK/known_hosts"
SSH=(ssh -i "$WORK/id" -o BatchMode=yes -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes -o UserKnownHostsFile="$WORK/known_hosts" -p "${DEPLOY_PORT:-22}" "$DEPLOY_USER@$DEPLOY_HOST")
SCP=(scp -i "$WORK/id" -o BatchMode=yes -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes -o UserKnownHostsFile="$WORK/known_hosts" -P "${DEPLOY_PORT:-22}")
INCOMING="$DEPLOY_DIRECTORY/.incoming/$RELEASE_ID"
"${SSH[@]}" "mkdir -p '$INCOMING'"
"${SCP[@]}" "$RELEASE_MANIFEST" "$DEPLOY_USER@$DEPLOY_HOST:$INCOMING/manifest.json"
"${SCP[@]}" "$ROOT/host-deploy.sh" "$DEPLOY_USER@$DEPLOY_HOST:$INCOMING/host-deploy.sh"
"${SCP[@]}" "$ROOT/compose.deploy.yaml" "$DEPLOY_USER@$DEPLOY_HOST:$INCOMING/compose.deploy.yaml"
"${SSH[@]}" "DEPLOY_MODE='$DEPLOY_MODE' DEPLOY_DIRECTORY='$DEPLOY_DIRECTORY' DEPLOY_CONTENT_ROOT='$DEPLOY_CONTENT_ROOT' PUBLIC_ORIGIN='$PUBLIC_ORIGIN' SITE_BIND='${SITE_BIND:-127.0.0.1}' SITE_PORT='${SITE_PORT:-3000}' bash '$INCOMING/host-deploy.sh' '$INCOMING/manifest.json'"
"${SCP[@]}" "$DEPLOY_USER@$DEPLOY_HOST:$INCOMING/evidence.json" "$WORK/evidence.json"
if [[ -n "${EVIDENCE_OUTPUT:-}" ]]; then
  mkdir -p "$(dirname "$EVIDENCE_OUTPUT")"
  cp "$WORK/evidence.json" "$EVIDENCE_OUTPUT"
fi
