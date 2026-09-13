#!/usr/bin/env bash
# Raise Linux inotify limits so Next.js + Expo can watch a pnpm monorepo.
# Requires sudo once.
set -euo pipefail

CONF=/etc/sysctl.d/99-inotify-watches.conf

sudo tee "$CONF" >/dev/null <<'EOF'
# Monorepo file watchers (Next.js + Expo/Metro)
fs.inotify.max_user_watches = 1048576
fs.inotify.max_user_instances = 1024
fs.inotify.max_queued_events = 65536
EOF

sudo sysctl -p "$CONF"
echo
echo "Now:"
echo "  max_user_watches=$(cat /proc/sys/fs/inotify/max_user_watches)"
echo "  max_user_instances=$(cat /proc/sys/fs/inotify/max_user_instances)"
echo "  max_queued_events=$(cat /proc/sys/fs/inotify/max_queued_events)"
echo
echo "Re-run: pnpm run dev:all   (or pnpm run dev:native)"
