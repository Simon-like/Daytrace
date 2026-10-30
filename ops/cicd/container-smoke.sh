#!/usr/bin/env bash
set -euo pipefail

API_IMAGE="${1:?API image is required}"
SITE_IMAGE="${2:?site image is required}"
REVISION_OUTPUT="${3:?content revision output is required}"
SUFFIX="${GITHUB_RUN_ID:-local}-$$"
NETWORK="daytrace-release-$SUFFIX"
API="daytrace-api-$SUFFIX"
SITE="daytrace-site-$SUFFIX"
WORK="$(mktemp -d)"
cleanup() {
  docker rm -f "$SITE" "$API" >/dev/null 2>&1 || true
  docker network rm "$NETWORK" >/dev/null 2>&1 || true
  rm -rf "$WORK"
}
trap cleanup EXIT

[[ "$(docker image inspect --format '{{.Config.User}}' "$API_IMAGE")" == "node" ]]
[[ "$(docker image inspect --format '{{.Config.User}}' "$SITE_IMAGE")" == "node" ]]
docker network create "$NETWORK" >/dev/null
docker run -d --name "$API" --network "$NETWORK" --read-only --tmpfs /tmp \
  -e API_HOST=0.0.0.0 -e API_PORT=3001 -e CONTENT_ROOT=/data/content "$API_IMAGE" >/dev/null
for attempt in $(seq 1 30); do
  if docker exec "$API" node -e "fetch('http://127.0.0.1:3001/api/v1/health/ready').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))" >/dev/null 2>&1; then
    break
  fi
  if [[ "$attempt" == "30" ]]; then docker logs "$API"; exit 1; fi
  sleep 2
done
docker run -d --name "$SITE" --network "$NETWORK" --read-only --tmpfs /tmp -p 127.0.0.1::3000 \
  -e API_INTERNAL_ORIGIN="http://$API:3001" -e HOSTNAME=0.0.0.0 -e PORT=3000 "$SITE_IMAGE" >/dev/null
SITE_PORT="$(docker port "$SITE" 3000/tcp | sed -E 's/.*:([0-9]+)$/\1/')"
for attempt in $(seq 1 30); do
  if curl --fail --silent --max-time 2 "http://127.0.0.1:$SITE_PORT/" -o "$WORK/home.html"; then
    break
  fi
  if [[ "$attempt" == "30" ]]; then docker logs "$SITE"; exit 1; fi
  sleep 2
done
grep -q '合成样本：一次可验证的发布检查' "$WORK/home.html"
! grep -Eq 'PRIVATE_|DRAFT_' "$WORK/home.html"
ASSET_PATH="$(grep -oE '/_next/static/[^" ]+\.css' "$WORK/home.html" | head -n 1)"
[[ -n "$ASSET_PATH" ]]
curl --fail --silent --show-error --max-time 10 "http://127.0.0.1:$SITE_PORT$ASSET_PATH" -o /dev/null
docker exec "$API" node -e "fetch('http://127.0.0.1:3001/api/v1/records?scope=owner').then(r=>{if(r.status!==401)process.exit(1)}).catch(()=>process.exit(1))"
REVISION="$(docker exec "$API" node -e "fetch('http://127.0.0.1:3001/api/v1/health/ready').then(r=>r.json()).then(v=>console.log(v.contentRevision)).catch(()=>process.exit(1))")"
[[ "$REVISION" =~ ^sha256:[0-9a-f]{64}$ ]]
mkdir -p "$(dirname "$REVISION_OUTPUT")"
printf '%s\n' "$REVISION" > "$REVISION_OUTPUT"
echo "Container smoke passed with public content $REVISION."
