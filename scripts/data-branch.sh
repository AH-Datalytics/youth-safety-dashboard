#!/usr/bin/env bash
# data-branch.sh - manage the `data` branch that holds the dashboard's refreshed data.
#
# Layout on GitHub:
#   master            code + data/data-ref.json (the pointer to the live data commit)
#   data              ONE parentless commit: the current refreshed files (replaced each run)
#   data-yesterday    the previous `data` snapshot
#   data-last-week    a snapshot 7-13 days old
#   data-last-month   a snapshot 30-59 days old
#   data-next-week, data-next-month   staging slots that feed the two above (do not use)
#
# Commands:
#   publish [master-file ...]   (refresh job) snapshot the files listed in
#                               scripts/data-branch-paths.txt as a new `data` commit, rotate the
#                               restore points, update data/data-ref.json plus any small text
#                               files named as arguments on master, and push it all atomically.
#   status                      show each snapshot and its age.
#   rollback <restore-point>    make a restore point live again: moves `data` back to it and
#                               commits the matching data/data-ref.json to master (one atomic push;
#                               the master push triggers the Vercel deploy).
#   bootstrap                   one-time cut-over: snapshot the data files currently tracked on
#                               master, create a local `data` branch, write data/data-ref.json and
#                               untrack the moved files. Prints the push command; pushes nothing.
#
# Env: DATA_REMOTE (default origin), DATA_COMMIT_MSG (publish), MASTER_BRANCH (default master).
set -euo pipefail

REMOTE="${DATA_REMOTE:-origin}"
MASTER="${MASTER_BRANCH:-master}"
ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"
MANIFEST="scripts/data-branch-paths.txt"
REF_FILE="data/data-ref.json"
WEEK_DAYS=7
MONTH_DAYS=30
NOW="${DATA_NOW:-$(date +%s)}"  # DATA_NOW: tests only

die() { echo "::error::data-branch: $*" >&2; exit 1; }
note() { echo "[data-branch] $*"; }

pathspecs() { sed -e 's/\r$//' -e '/^[[:space:]]*#/d' -e '/^[[:space:]]*$/d' "$MANIFEST"; }

# Fetch every data* branch (shallow; snapshots share most blobs so this is cheap).
fetch_snapshots() {
  git fetch --quiet --no-tags --prune --depth=1 "$REMOTE" "+refs/heads/data*:refs/remotes/$REMOTE/data*"
}
snap() { git rev-parse -q --verify "refs/remotes/$REMOTE/$1^{commit}" 2>/dev/null || true; }
age_days() { echo $(( (NOW - $(git log -1 --format=%ct "$1")) / 86400 )); }

# Build a tree of the manifest files (plus a README and a vercel.json that stops
# Vercel from building this branch) in a throwaway index. Prints the tree id.
build_tree() {
  local idx specs spec matches files=() blob
  idx="$(mktemp)"; rm -f "$idx"
  mapfile -t specs < <(pathspecs)
  # Expand with shell globbing, not git pathspecs: git will not look inside an ignored
  # directory (data/generated/*/ is gitignored) for a wildcard, even with -f, and then
  # silently adds nothing. A line that matches no file is an error, never an empty commit.
  for spec in "${specs[@]}"; do
    matches=( $(compgen -G "$spec" || true) )
    (( ${#matches[@]} )) || { echo "::error::data-branch: no files match '$spec'" >&2; return 1; }
    files+=( "${matches[@]}" )
  done
  GIT_INDEX_FILE="$idx" git add -f -- "${files[@]}"
  blob="$(printf '%s\n' '{ "git": { "deploymentEnabled": false } }' | git hash-object -w --stdin)"
  GIT_INDEX_FILE="$idx" git update-index --add --cacheinfo "100644,$blob,vercel.json"
  blob="$(printf '%s\n' \
    '# Refreshed dashboard data (written by the refresh job)' '' \
    'Do not commit here. Each refresh replaces this branch with a single new commit.' \
    'master pins the live snapshot in data/data-ref.json. See scripts/data-branch.sh.' \
    | git hash-object -w --stdin)"
  GIT_INDEX_FILE="$idx" git update-index --add --cacheinfo "100644,$blob,README.md"
  GIT_INDEX_FILE="$idx" git write-tree
  rm -f "$idx"
}

new_commit() { # tree, subject
  git commit-tree "$1" -m "$2" \
    -m "Built from $MASTER $(git rev-parse --short HEAD)${GITHUB_RUN_ID:+ by run $GITHUB_SERVER_URL/$GITHUB_REPOSITORY/actions/runs/$GITHUB_RUN_ID}"
}

# Write data/data-ref.json describing a data commit.
write_ref_file() { # commit
  local c="$1"
  {
    printf '{\n  "commit": "%s",\n  "created": "%s",\n  "files": {\n' \
      "$c" "$(git log -1 --format=%cI "$c")"
    git ls-tree -r "$c" | awk -F'\t' '$2 ~ /^data\// { split($1, m, " "); printf "%s    \"%s\": \"%s\"", sep, $2, m[3]; sep=",\n" } END { printf "\n" }'
    printf '  }\n}\n'
  } > "$REF_FILE"
}

# Push refspecs atomically; when master moved underneath us, rebase and retry.
push_atomic() { # lease, refspecs...
  local lease="$1"; shift
  local attempt
  for attempt in 1 2 3 4 5; do
    if git push --atomic --no-verify "$lease" "$REMOTE" "$@"; then return 0; fi
    note "push rejected (attempt $attempt); rebasing on $REMOTE/$MASTER"
    git pull --rebase --no-edit "$REMOTE" "$MASTER" || die "rebase onto $MASTER failed"
    sleep $(( attempt * 3 ))
  done
  die "push failed after 5 attempts (nothing was changed on GitHub: the push is atomic)"
}

cmd_publish() {
  [[ -f "$MANIFEST" ]] || die "missing $MANIFEST"
  fetch_snapshots
  local old tree new specs=() lease
  old="$(snap data)"
  tree="$(build_tree)"

  if [[ -n "$old" && "$(git rev-parse "$old^{tree}")" == "$tree" ]]; then
    note "data unchanged since $(git log -1 --format=%cs "$old")"
    new="$old"
  else
    new="$(new_commit "$tree" "data: refresh $(date -u +%F)")"
    specs+=("$new:refs/heads/data")
    if [[ -n "$old" ]]; then
      # Restore points. Ages come from each snapshot's own commit date, so a skipped or
      # failed night does not throw the schedule off: it only changes which copy is kept.
      specs+=("+$old:refs/heads/data-yesterday")
      rotate() { # staging target days
        local s; s="$(snap "$1")"
        if [[ -z "$s" ]]; then
          specs+=("+$old:refs/heads/$1")
        elif (( $(age_days "$s") >= $3 )); then
          specs+=("+$s:refs/heads/$2" "+$old:refs/heads/$1")
          note "$2 -> snapshot of $(git log -1 --format=%cs "$s")"
        fi
      }
      rotate data-next-week data-last-week "$WEEK_DAYS"
      rotate data-next-month data-last-month "$MONTH_DAYS"
    fi
  fi

  write_ref_file "$new"
  git add -- "$REF_FILE" "$@"
  if ! git diff --staged --quiet; then
    git commit -q -m "${DATA_COMMIT_MSG:-chore: data refresh $(date -u +%F)}"
    specs+=("HEAD:refs/heads/$MASTER")
  fi
  if (( ${#specs[@]} == 0 )); then note "nothing to publish"; return 0; fi

  # Lease: refuse to replace `data` if someone moved it since we looked (e.g. a rollback).
  lease="--force-with-lease=refs/heads/data:${old}"
  push_atomic "$lease" "${specs[@]}"
  note "published data $(git rev-parse --short "$new")"
}

cmd_status() {
  fetch_snapshots
  local name s
  for name in data data-yesterday data-last-week data-last-month data-next-week data-next-month; do
    s="$(snap "$name")"
    if [[ -z "$s" ]]; then printf '%-16s (none)\n' "$name"; continue; fi
    printf '%-16s %s  %s  (%s days old)\n' "$name" "$(git rev-parse --short "$s")" "$(git log -1 --format=%cs "$s")" "$(age_days "$s")"
  done
  if [[ -f "$REF_FILE" ]]; then
    printf '%-16s %s  (pinned by %s on this checkout)\n' "live" "$(sed -n 's/.*"commit": "\([0-9a-f]\{7\}\).*/\1/p' "$REF_FILE")" "$REF_FILE"
  fi
}

cmd_rollback() {
  local point="${1:-}" target old
  [[ "$point" =~ ^data-(yesterday|last-week|last-month)$ ]] || die "usage: rollback data-yesterday|data-last-week|data-last-month"
  [[ "$(git symbolic-ref --short HEAD)" == "$MASTER" ]] || die "check out $MASTER first"
  git diff --quiet && git diff --staged --quiet || die "working tree has changes"
  git pull --ff-only --quiet "$REMOTE" "$MASTER"
  fetch_snapshots
  target="$(snap "$point")"; [[ -n "$target" ]] || die "$point does not exist"
  old="$(snap data)"
  write_ref_file "$target"
  git add -- "$REF_FILE"
  git commit -q -m "data: roll back live data to $point ($(git log -1 --format=%cs "$target"))"
  push_atomic "--force-with-lease=refs/heads/data:${old}" "$target:refs/heads/data" "HEAD:refs/heads/$MASTER"
  note "live data now $(git log -1 --format=%cs "$target") snapshot. Vercel deploys from the $MASTER push."
  note "If the refresh itself is broken, pause it: gh workflow disable refresh-data.yml"
}

cmd_bootstrap() {
  [[ -f "$MANIFEST" ]] || die "missing $MANIFEST"
  git fetch --quiet --no-tags "$REMOTE" "+refs/heads/data:refs/remotes/$REMOTE/data" 2>/dev/null && \
    die "$REMOTE already has a data branch; bootstrap is one-time"
  local tree new specs
  tree="$(build_tree)"
  new="$(new_commit "$tree" "data: initial snapshot from $MASTER $(git rev-parse --short HEAD)")"
  git branch -f data "$new"
  write_ref_file "$new"
  mapfile -t specs < <(pathspecs)
  git rm -r -q --cached --ignore-unmatch -- "${specs[@]}"
  git add -- "$REF_FILE"
  note "local branch 'data' = $(git rev-parse --short "$new") ($(git ls-tree -r "$new" | wc -l) files)"
  note "staged on $(git symbolic-ref --short HEAD): data/data-ref.json + untracking the moved files (they stay on disk)."
  note "Next: git commit -m 'chore: move refreshed data to the data branch' && git push --atomic $REMOTE data $MASTER"
}

case "${1:-}" in
  publish) shift; cmd_publish "$@" ;;
  status) cmd_status ;;
  rollback) shift; cmd_rollback "$@" ;;
  bootstrap) cmd_bootstrap ;;
  *) sed -n '2,30p' "$0"; exit 2 ;;
esac
