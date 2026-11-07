#!/usr/bin/env bash
# Runs every time the Codespace starts: brings the Switch server up.
set -euo pipefail
cd "$(dirname "$0")/switch"
for i in $(seq 1 30); do docker info >/dev/null 2>&1 && break; sleep 2; done
docker compose up -d
echo "Switch server starting on http://localhost:8000"

# Agent controller: runs the agents placed on this machine. Codespaces has no
# systemd, so start it in the background. It's enrolled once from the Gateway's
# Machines page (see deploy/CODESPACES.md).
CTL="$HOME/.switch-controller/agent-controller.mjs"
if [ -f "$CTL" ] && [ -d "$HOME/.local/state/switch/agent-controller" ]; then
  if ! pgrep -f "^node .*agent-controller.mjs run" >/dev/null; then
    for i in $(seq 1 30); do curl -sf -o /dev/null http://localhost:8000/ && break; sleep 2; done
    setsid nohup node "$CTL" run --shared-host-bundle "$HOME/.switch-controller/shared-host.mjs" \
      >> "$HOME/.switch-controller/controller.log" 2>&1 < /dev/null &
    echo "Agent controller started (log: ~/.switch-controller/controller.log)"
  fi
fi
