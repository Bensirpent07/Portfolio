#!/usr/bin/env bash
set -Eeuo pipefail

# Uses real rsync in disposable directories. Service and HTTP calls are mocked.
command -v rsync >/dev/null || { echo 'Install rsync to run deployment checks.' >&2; exit 1; }
deploy_script=$(realpath "$(dirname "$0")/deploy.sh")
suite_root=$(mktemp -d /tmp/portfolio-deploy-tests.XXXXXXXX)
trap 'rm -rf -- "$suite_root"' EXIT
mkdir -p "$suite_root/bin"

cat > "$suite_root/bin/sudo" <<'MOCK'
#!/usr/bin/env bash
set -eu
if [[ "${1:-} ${2:-}" == '-n -l' ]]; then
  exit "$TEST_DENY_SUDO"
fi
[[ "$*" == '-n /usr/bin/systemctl restart portfolio-test.service' ]] || exit 99
printf 'restart\n' >> "$TEST_EVENTS"
if [[ "$TEST_INTERRUPT" == 1 && ! -e "$TEST_RESTART_MARKER" ]]; then
  touch "$TEST_RESTART_MARKER"
  kill -TERM "$PPID"
  exit 0
fi
if [[ "$TEST_FAIL_RESTART" == 1 && ! -e "$TEST_RESTART_MARKER" ]]; then
  touch "$TEST_RESTART_MARKER"
  exit 1
fi
MOCK
cat > "$suite_root/bin/curl" <<'MOCK'
#!/usr/bin/env bash
if [[ "$*" == *'--write-out'* ]]; then
  printf '%s' "$TEST_API_STATUS"
else
  [[ "$TEST_FAIL_WEB" == 0 ]]
fi
MOCK
cat > "$suite_root/bin/sleep" <<'MOCK'
#!/usr/bin/env bash
exit 0
MOCK
chmod +x "$suite_root/bin/"*
export PATH="$suite_root/bin:$PATH"
export API_SERVICE=portfolio-test.service

new_case() {
  case_root="$suite_root/$1"
  export WEB_ROOT="$case_root/live-web" API_ROOT="$case_root/live-api"
  export BACKUP_ROOT="$case_root/backups" TEST_EVENTS="$case_root/events"
  export TEST_RESTART_MARKER="$case_root/restart-failed"
  export TEST_DENY_SUDO=0 TEST_FAIL_RESTART=0 TEST_API_STATUS=405 TEST_FAIL_WEB=0 TEST_INTERRUPT=0
  mkdir -p "$WEB_ROOT/.well-known/acme-challenge" "$API_ROOT/logs" "$case_root/release/web" "$case_root/release/api"
  printf 'certificate challenge' > "$WEB_ROOT/.well-known/acme-challenge/token"
  printf 'old website' > "$WEB_ROOT/index.html"
  printf 'stale asset' > "$WEB_ROOT/old.js"
  printf 'old API' > "$API_ROOT/old.dll"
  printf 'server configuration' > "$API_ROOT/appsettings.json"
  printf 'server environment' > "$API_ROOT/.env"
  printf 'existing log' > "$API_ROOT/logs/server.log"
  printf 'new website' > "$case_root/release/web/index.html"
  printf 'new asset' > "$case_root/release/web/new.js"
  printf '#!/usr/bin/env bash\nexit 0\n' > "$case_root/release/api/benkuhman"
  chmod +x "$case_root/release/api/benkuhman"
  printf 'new API' > "$case_root/release/api/new.dll"
  printf 'build configuration' > "$case_root/release/api/appsettings.json"
  tar -czf "$case_root/release.tar.gz" -C "$case_root/release" web api
}

run_deploy() {
  bash "$deploy_script" "$case_root/release.tar.gz" 0123456789abcdef0123456789abcdef01234567 > "$case_root/output.log" 2>&1
}

assert_rolled_back() {
  [[ "$(cat "$WEB_ROOT/index.html")" == 'old website' ]]
  [[ -f "$WEB_ROOT/old.js" && ! -e "$WEB_ROOT/new.js" ]]
  [[ -f "$API_ROOT/old.dll" && ! -e "$API_ROOT/new.dll" ]]
  [[ "$(cat "$API_ROOT/appsettings.json")" == 'server configuration' ]]
  [[ "$(cat "$WEB_ROOT/.well-known/acme-challenge/token")" == 'certificate challenge' ]]
}

new_case success
mkdir -p "$BACKUP_ROOT/manual-backup"
for number in {1..6}; do
  mkdir -p "$BACKUP_ROOT/20200101T00000${number}Z-aaaaaaaaaaaa.AAAA000${number}"
done
run_deploy || { cat "$case_root/output.log"; exit 1; }
[[ "$(cat "$WEB_ROOT/index.html")" == 'new website' ]]
[[ -f "$WEB_ROOT/new.js" && ! -e "$WEB_ROOT/old.js" ]]
[[ -f "$API_ROOT/new.dll" && ! -e "$API_ROOT/old.dll" && -x "$API_ROOT/benkuhman" ]]
[[ "$(cat "$API_ROOT/appsettings.json")" == 'server configuration' ]]
[[ "$(cat "$API_ROOT/.env")" == 'server environment' ]]
[[ "$(cat "$API_ROOT/logs/server.log")" == 'existing log' ]]
[[ "$(cat "$WEB_ROOT/.well-known/acme-challenge/token")" == 'certificate challenge' ]]
[[ "$(wc -l < "$TEST_EVENTS")" == 1 ]]
[[ -n "$(find "$BACKUP_ROOT" -path '*/web/old.js' -print -quit)" ]]
[[ "$(find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d | wc -l)" == 6 ]]
[[ -d "$BACKUP_ROOT/manual-backup" ]]
echo 'PASS: deploy updates both components, preserves server configuration, and saves a backup'
echo 'PASS: retention keeps five automatic backups and preserves unrelated directories'

new_case no-permission
export TEST_DENY_SUDO=1
if run_deploy; then echo 'Expected the permission check to fail.' >&2; exit 1; fi
assert_rolled_back
[[ ! -d "$BACKUP_ROOT" && ! -e "$TEST_EVENTS" ]]
echo 'PASS: missing restart permission leaves production untouched'

for scenario in restart-failure api-health-failure web-health-failure interrupted-deployment; do
  new_case "$scenario"
  case "$scenario" in
    restart-failure) export TEST_FAIL_RESTART=1 ;;
    api-health-failure) export TEST_API_STATUS=503 ;;
    web-health-failure) export TEST_FAIL_WEB=1 ;;
    interrupted-deployment) export TEST_INTERRUPT=1 ;;
  esac
  if run_deploy; then echo "Expected $scenario to fail." >&2; exit 1; fi
  assert_rolled_back
  [[ "$(wc -l < "$TEST_EVENTS")" == 2 ]]
  echo "PASS: $scenario restores both components and restarts the previous API"
done

new_case incomplete-release
rm "$case_root/release/api/benkuhman"
tar -czf "$case_root/release.tar.gz" -C "$case_root/release" web api
if run_deploy; then echo 'Expected an incomplete release to fail.' >&2; exit 1; fi
assert_rolled_back
[[ ! -d "$BACKUP_ROOT" && ! -e "$TEST_EVENTS" ]]
echo 'PASS: an incomplete release leaves production untouched'
