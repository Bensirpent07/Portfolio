#!/usr/bin/env bash
set -Eeuo pipefail

archive=${1:?Usage: deploy.sh release.tar.gz commit-sha}
revision=${2:?Usage: deploy.sh release.tar.gz commit-sha}
[[ "$revision" =~ ^[a-f0-9]{40}$ ]] || { echo 'Invalid commit SHA.' >&2; exit 1; }

# Overrides allow a rehearsal against disposable directories and services.
web_root=${WEB_ROOT:-/var/www/benkuhman}
api_root=${API_ROOT:-/var/www/ai-chat}
service=${API_SERVICE:-ai-chat.service}
api_health_url=${API_HEALTH_URL:-http://127.0.0.1:5000/api/chat/stream}
backup_root=${BACKUP_ROOT:-$HOME/.local/state/portfolio-deploy/backups}

for command in rsync curl tar sudo; do
  command -v "$command" >/dev/null || { echo "Missing command: $command" >&2; exit 1; }
done
[[ -f "$archive" ]] || { echo 'Release archive is missing.' >&2; exit 1; }
[[ -d "$web_root" && -d "$api_root" ]] || { echo 'Both deployment directories must already exist.' >&2; exit 1; }
web_root=$(realpath "$web_root")
api_root=$(realpath "$api_root")
[[ "$web_root" != / && "$api_root" != / && "$web_root" != "$api_root" ]] || exit 1
[[ "$web_root/" != "$api_root/"* && "$api_root/" != "$web_root/"* ]] || exit 1
[[ -w "$web_root" && -w "$api_root" ]] || { echo 'Deployment directories are not writable.' >&2; exit 1; }
# Verify the exact permission before touching the running website or API.
sudo -n -l /usr/bin/systemctl restart "$service" >/dev/null

umask 077
staging=$(mktemp -d /tmp/portfolio-release.XXXXXXXX)
trap 'rm -rf -- "$staging"' EXIT
tar -xzf "$archive" -C "$staging" --no-same-owner
[[ -f "$staging/web/index.html" && -x "$staging/api/benkuhman" ]] || { echo 'Release is incomplete.' >&2; exit 1; }

mkdir -p "$backup_root"
chmod 700 "$backup_root"
backup=$(mktemp -d "$backup_root/$(date -u +%Y%m%dT%H%M%SZ)-${revision:0:12}.XXXXXXXX")
cp -a -- "$web_root" "$backup/web"
cp -a -- "$api_root" "$backup/api"
echo "Backup saved on the Droplet: $backup"

rollback() {
  local failure=${1:-$?}
  trap - ERR
  trap '' INT TERM HUP
  set +e
  echo 'Deployment failed; restoring the previous website and API.' >&2
  rsync -a --checksum --delete --exclude='/.well-known/' "$backup/web/" "$web_root/"
  local web_status=$?
  rsync -a --checksum --delete "$backup/api/" "$api_root/"
  local api_status=$?
  sudo -n /usr/bin/systemctl restart "$service"
  local service_status=$?
  if (( web_status != 0 || api_status != 0 || service_status != 0 )); then
    echo "Rollback needs manual attention. Backup: $backup" >&2
  fi
  exit "$failure"
}
trap rollback ERR
trap 'rollback 130' INT
trap 'rollback 143' TERM HUP

# Preserve server-only configuration, environment files, and application logs.
rsync -a --checksum --delete --delay-updates --chmod=D755,F644 --exclude='/.well-known/' "$staging/web/" "$web_root/"
rsync -a --checksum --delete --delay-updates \
  --exclude='/appsettings*.json' --exclude='/.env*' --exclude='/logs/' \
  "$staging/api/" "$api_root/"
sudo -n /usr/bin/systemctl restart "$service"

# A GET must return 405 for the POST-only API endpoint; no paid API call is made.
healthy=false
for attempt in {1..15}; do
  status=$(curl --silent --output /dev/null --write-out '%{http_code}' --max-time 5 "$api_health_url" || true)
  if [[ "$status" == 405 ]]; then healthy=true; break; fi
  sleep 2
done
[[ "$healthy" == true ]]
curl --fail --silent --show-error --max-time 15 \
  --resolve benkuhman.com:443:127.0.0.1 https://benkuhman.com/ >/dev/null

trap - ERR INT TERM HUP
echo "Deployed $revision successfully."

# Keep the five latest automatic backups; unrelated directories are untouched.
mapfile -t backups < <(find "$backup_root" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | sort -r)
automatic_backups=0
for old_backup in "${backups[@]}"; do
  if [[ "$old_backup" =~ ^[0-9]{8}T[0-9]{6}Z-[a-f0-9]{12}\.[a-zA-Z0-9]+$ ]]; then
    automatic_backups=$((automatic_backups + 1))
    if (( automatic_backups > 5 )); then
      rm -rf -- "$backup_root/$old_backup" || echo "Could not remove old backup: $old_backup" >&2
    fi
  fi
done
