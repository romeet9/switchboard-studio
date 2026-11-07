#!/usr/bin/env bash
# Runs every time the Codespace starts: brings the Switch server up.
set -euo pipefail
cd "$(dirname "$0")/switch"
for i in $(seq 1 30); do docker info >/dev/null 2>&1 && break; sleep 2; done
docker compose up -d
echo "Switch server starting on http://localhost:8000"
