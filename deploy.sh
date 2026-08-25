#!/usr/bin/env bash
# Builds the frontend and drops it into pb_public/, which PocketBase serves
# directly from disk — no restart needed for a frontend-only change.
#
# Only Docker is required on the host: the Vite build runs inside a
# throwaway container (the `web-build` stage of ./Dockerfile), so Node
# never needs to be installed on the LXC itself.
#
# Usage: ./deploy.sh

set -euo pipefail
cd "$(dirname "$0")"

echo "Building frontend..."
docker build --target web-build -t revise-web-build -f Dockerfile .

echo "Copying build output into pb_public/..."
cid=$(docker create revise-web-build)
rm -rf pb_public/*
docker cp "$cid:/web/dist/." pb_public/
docker rm "$cid" > /dev/null

echo "Done. pb_public/ updated — PocketBase serves it immediately."
echo "(If you changed the PocketBase version or docker-compose.yml, run"
echo " 'docker compose -f infra/docker-compose.yml up -d --build' too.)"
