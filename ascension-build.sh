#!/usr/bin/env bash
# Ascension Awaits — local verification and release gate runner.
# Does not edit source, commit, merge, deploy, or touch production databases.
set -Eeuo pipefail
IFS=$'\n\t'

DEFAULT_REPO='/tmp/aa-m18-repo-rMw9w7'
REPO="${ASCENSION_REPO:-$DEFAULT_REPO}"
BRANCH="${ASCENSION_BRANCH:-feat/canonical-taskboard-turn-m18}"
REPORT_DIR=''
PARITY_CMD="${ASCENSION_PARITY_CMD:-}"
POSTGRES_CMD="${ASCENSION_POSTGRES_CMD:-}"
BROWSER_CMD="${ASCENSION_BROWSER_CMD:-}"
PUSH=0; APPROVE_PUSH=0; RUN_TESTS=1
usage() {
 cat <<'HELP'
Usage: ./ascension-build.sh [options]

  --repo PATH         Local Git checkout (default: $ASCENSION_REPO or /tmp/aa-m18-repo-rMw9w7)
  --branch NAME       Required local branch (default: feat/canonical-taskboard-turn-m18)
  --report-dir PATH   Report directory (default: /tmp/ascension-build-reports/<checkout-name>)
  --parity-cmd CMD    Explicit full recovered-browser differential command
  --postgres-cmd CMD  Explicit disposable PostgreSQL persistence test command
  --browser-cmd CMD   Explicit AVCC authenticated browser acceptance command
  --skip-unit-tests   Do not execute repository Node tests (blocks push)
  --push              Push current HEAD to origin only if ALL checks pass
  --approve-push      Required with --push; explicit authorization safeguard
  --help              Show this help

Commands supplied with --*-cmd are executed via 'bash -lc' from the repo root.
Use only trusted commands. Missing parity/PostgreSQL/browser commands mean NOT_RUN,
not success. Real release checks are deliberately NOT synthesized by this script.
No merge or deployment operations are implemented.
HELP
}
while (($#)); do
 case "$1" in
  --repo|--branch|--report-dir|--parity-cmd|--postgres-cmd|--browser-cmd)
   if (($# < 2)); then echo "Missing value for $1" >&2; exit 2; fi
   key="$1"; value="$2"; shift 2
   case "$key" in
    --repo) REPO="$value";; --branch) BRANCH="$value";; --report-dir) REPORT_DIR="$value";;
    --parity-cmd) PARITY_CMD="$value";; --postgres-cmd) POSTGRES_CMD="$value";;
    --browser-cmd) BROWSER_CMD="$value";;
   esac;;
  --push) PUSH=1; shift;;
  --approve-push) APPROVE_PUSH=1; shift;;
  --skip-unit-tests) RUN_TESTS=0; shift;;
  --help|-h) usage; exit 0;;
  *) echo "Unknown option: $1" >&2; usage >&2; exit 2;;
 esac
done
command -v git >/dev/null || { echo 'git is required' >&2; exit 2; }
command -v node >/dev/null || { echo 'Node.js is required' >&2; exit 2; }
[[ -d "$REPO/.git" || -f "$REPO/.git" ]] || { echo "Not a Git checkout: $REPO" >&2; exit 2; }
REPO="$(cd "$REPO" && pwd -P)"
cd "$REPO"
ACTIVE="$(git symbolic-ref --quiet --short HEAD || true)"
[[ "$ACTIVE" == "$BRANCH" ]] || { echo "Wrong branch: '$ACTIVE', expected '$BRANCH'" >&2; exit 2; }
HEAD="$(git rev-parse --verify HEAD)"
DIRTY=0
[[ -z "$(git status --porcelain)" ]] || DIRTY=1
if [[ -z "$REPORT_DIR" ]]; then REPORT_DIR="/tmp/ascension-build-reports/$(basename "$REPO")"; fi
mkdir -p "$REPORT_DIR"
REPORT_DIR="$(cd "$REPORT_DIR" && pwd -P)"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
RUN_DIR="$(mktemp -d "$REPORT_DIR/${STAMP}-XXXXXX")"
SUMMARY="$RUN_DIR/report.txt"
printf 'Ascension Awaits build-gate report\nUTC: %s\nRepository: %s\nBranch: %s\nCommit: %s\nNode: %s\nDirty working tree: %s\n\n' \
 "$STAMP" "$REPO" "$ACTIVE" "$HEAD" "$(node --version)" "$DIRTY" > "$SUMMARY"
# Prevent extra reports inside the checkout from triggering a false dirty state:
# dirty status was measured before report creation, and push requires a clean tree.
log() { printf '%s\n' "$*" | tee -a "$SUMMARY"; }
run_check() {
 local label="$1" command="$2" logfile="$3"; local rc=0
 if [[ -z "$command" ]]; then log "$label: NOT_RUN (no command supplied)"; return 3; fi
 log "$label: RUNNING"
 (cd "$REPO" && bash -lc "$command") > "$logfile" 2>&1 || rc=$?
 if ((rc==0)); then log "$label: PASS"; else log "$label: FAIL (exit $rc)"; fi
 return "$rc"
}
UNIT_STATUS=NOT_RUN; PARITY_STATUS=NOT_RUN; PG_STATUS=NOT_RUN; BROWSER_STATUS=NOT_RUN
if ((RUN_TESTS)); then
 if [[ -d tests ]] && compgen -G 'tests/*.test.mjs' >/dev/null; then
  if run_check 'Unit/repository tests' 'node --test tests/*.test.mjs' "$RUN_DIR/unit-tests.log"; then UNIT_STATUS=PASS; else UNIT_STATUS=FAIL; fi
 else log 'Unit/repository tests: FAIL (tests/*.test.mjs missing)'; UNIT_STATUS=FAIL; fi
else log 'Unit/repository tests: NOT_RUN (skipped)'; fi
if [[ -n "$PARITY_CMD" ]]; then
 if run_check 'Full-state recovered-browser parity' "$PARITY_CMD" "$RUN_DIR/parity.log"; then PARITY_STATUS=PASS; else PARITY_STATUS=FAIL; fi
else log 'Full-state recovered-browser parity: NOT_RUN'; fi
if [[ -n "$POSTGRES_CMD" ]]; then
 if run_check 'Disposable PostgreSQL acceptance' "$POSTGRES_CMD" "$RUN_DIR/postgres.log"; then PG_STATUS=PASS; else PG_STATUS=FAIL; fi
else log 'Disposable PostgreSQL acceptance: NOT_RUN'; fi
if [[ -n "$BROWSER_CMD" ]]; then
 if run_check 'Authenticated AVCC browser acceptance' "$BROWSER_CMD" "$RUN_DIR/browser.log"; then BROWSER_STATUS=PASS; else BROWSER_STATUS=FAIL; fi
else log 'Authenticated AVCC browser acceptance: NOT_RUN'; fi
READY=0
if [[ "$UNIT_STATUS/$PARITY_STATUS/$PG_STATUS/$BROWSER_STATUS" == 'PASS/PASS/PASS/PASS' && "$DIRTY" == 0 ]]; then READY=1; fi
if ((READY)); then log 'Local release gates: PASS (four supplied checks, clean checkout)'; else log 'Local release gates: HOLD (missing/failed checks or dirty checkout)'; fi
log "Report: $SUMMARY"
if ((PUSH)); then
 if (( ! APPROVE_PUSH )); then log 'Push: REFUSED (missing --approve-push)'; exit 2; fi
 if (( ! READY )); then log 'Push: REFUSED (release gates not passed)'; exit 1; fi
 if [[ "$BRANCH" == main || "$BRANCH" == master ]]; then log 'Push: REFUSED (protected base branch)'; exit 2; fi
 if ! git remote get-url origin >/dev/null 2>&1; then log 'Push: REFUSED (origin missing)'; exit 2; fi
 if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then log 'Push: REFUSED (new source modifications)'; exit 1; fi
 if git push origin "HEAD:refs/heads/$BRANCH" > "$RUN_DIR/push.log" 2>&1; then log 'Push: SUCCESS (staging branch only)'; else log 'Push: FAILED'; exit 1; fi
else log 'Push: NOT_REQUESTED'; fi
((READY)) || exit 1
