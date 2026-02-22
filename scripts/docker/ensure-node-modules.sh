#!/bin/sh
set -eu

APP_DIR="${APP_DIR:-/app}"
INSTALL_CMD="${INSTALL_CMD:-npm ci}"
LOCK_FILE="${LOCK_FILE:-$APP_DIR/package-lock.json}"
MARKER_FILE="$APP_DIR/node_modules/.lock-hash"

hash_lock() {
  if [ -f "$LOCK_FILE" ]; then
    # sha256sum is available in debian-based node images
    sha256sum "$LOCK_FILE" | awk '{print $1}'
  else
    echo ""
  fi
}

ensure_node_modules() {
  cur_hash="$(hash_lock)"
  prev_hash=""
  if [ -f "$MARKER_FILE" ]; then
    prev_hash="$(cat "$MARKER_FILE" 2>/dev/null || true)"
  fi

  need_install=0

  if [ ! -d "$APP_DIR/node_modules" ]; then
    need_install=1
  else
    # Consider it empty if it only contains dot entries
    if [ -z "$(ls -A "$APP_DIR/node_modules" 2>/dev/null || true)" ]; then
      need_install=1
    fi
  fi

  if [ "$cur_hash" != "$prev_hash" ]; then
    need_install=1
  fi

  if [ "$need_install" -eq 1 ]; then
    echo "[ensure-node-modules] Installing dependencies (lock hash changed or node_modules missing)"
    (cd "$APP_DIR" && sh -lc "$INSTALL_CMD")
    mkdir -p "$APP_DIR/node_modules"
    printf "%s" "$cur_hash" > "$MARKER_FILE"
  fi
}

ensure_node_modules

exec "$@"
