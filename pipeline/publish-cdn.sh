#!/usr/bin/env bash
# Publish dist-cdn/ to s3://$BUCKET/$PREFIX/v<version>/ (immutable) and the v<major>/ alias.
# Usage: BUCKET=… DISTRIBUTION_ID=… pipeline/publish-cdn.sh <version>
# DRY_RUN=1 prints the mutating aws commands instead of running them.
set -euo pipefail

version="${1:-}"
if [[ ! "$version" =~ ^([0-9]+)\.[0-9]+\.[0-9]+$ ]]; then
  echo "usage: publish-cdn.sh <version>  (e.g. 1.2.3, no leading v)" >&2
  exit 2
fi
major="${BASH_REMATCH[1]}"

PREFIX="${PREFIX:-web-components}"
DRY_RUN="${DRY_RUN:-0}"
SRC="${SRC:-dist-cdn}"

if [[ "$DRY_RUN" != "1" ]]; then
  missing=()
  [[ -n "${BUCKET:-}" ]] || missing+=(BUCKET)
  [[ -n "${DISTRIBUTION_ID:-}" ]] || missing+=(DISTRIBUTION_ID)
  if ((${#missing[@]})); then
    echo "publish-cdn.sh: required environment variable(s) not set: ${missing[*]}" >&2
    exit 2
  fi
fi
BUCKET="${BUCKET:-<bucket>}"
DISTRIBUTION_ID="${DISTRIBUTION_ID:-<distribution-id>}"

# Print in dry-run mode, run otherwise.
run() {
  if [[ "$DRY_RUN" == "1" ]]; then
    echo "aws $*"
  else
    aws "$@"
  fi
}

# 1. Version folders are immutable: refuse to touch an existing one.
#    (`aws s3 ls` exits 1 when nothing matches, hence `|| true`.)
existing="$(aws s3 ls "s3://$BUCKET/$PREFIX/v$version/" || true)"
if [[ -n "$existing" ]]; then
  echo "publish-cdn.sh: s3://$BUCKET/$PREFIX/v$version/ already exists; refusing to overwrite an immutable version" >&2
  exit 3
fi

# 2. Immutable exact-version copy.
run s3 cp "$SRC" "s3://$BUCKET/$PREFIX/v$version/" --recursive \
  --cache-control "public, max-age=31536000, immutable"

# 3. Mutable major alias.
run s3 sync "$SRC" "s3://$BUCKET/$PREFIX/v$major/" --delete \
  --cache-control "public, max-age=300"

# 4. Only the alias needs invalidating.
run cloudfront create-invalidation --distribution-id "$DISTRIBUTION_ID" \
  --paths "/$PREFIX/v$major/*"
