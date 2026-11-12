#!/usr/bin/env bash
# Publish dist-cdn/ to s3://$BUCKET/$PREFIX/v<version>/ (create-only, resumable) and, when this
# is the highest version of its major, to the mutable v<major>/ alias.
# Usage: BUCKET=… DISTRIBUTION_ID=… pipeline/publish-cdn.sh <version>
# DRY_RUN=1 prints the mutating aws commands; read-only list calls still run.
# Exit codes: 2 bad usage/env, 3 an existing immutable key differs from the local file.
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

# A missing, empty or partial build must never reach S3: `sync --delete` from an empty
# directory would empty the live alias.
if [[ ! -d "$SRC" ]] || [[ ! -f "$SRC/manifest.json" ]] || [[ -z "$(find "$SRC" -type f -print -quit)" ]]; then
  echo "publish-cdn.sh: $SRC is missing, empty or has no manifest.json; run the build first" >&2
  exit 2
fi

# Mutating commands: printed in dry-run, executed otherwise.
run() {
  if [[ "$DRY_RUN" == "1" ]]; then
    echo "aws $*"
  else
    aws "$@"
  fi
}

md5_of() {
  if command -v md5sum >/dev/null 2>&1; then md5sum "$1" | cut -d' ' -f1; else md5 -q "$1"; fi
}

content_type() {
  case "$1" in
    *.js) echo "text/javascript" ;;
    *.css) echo "text/css" ;;
    *.json | *.map) echo "application/json" ;;
    *.md) echo "text/markdown; charset=utf-8" ;;
    *) echo "application/octet-stream" ;;
  esac
}

# Read-only; an AWS error aborts the script (set -e on the assignment).
version_prefix="$PREFIX/v$version/"
existing="$(aws s3api list-objects-v2 --bucket "$BUCKET" --prefix "$version_prefix" \
  --query 'Contents[].[Key,ETag]' --output text)"
[[ "$existing" == "None" ]] && existing=""

# Pass 1: classify every local file; any content mismatch aborts before writing anything.
to_put=()
while IFS= read -r file; do
  rel="${file#"$SRC"/}"
  key="$version_prefix$rel"
  remote_etag="$(printf '%s\n' "$existing" | awk -F'\t' -v k="$key" '$1 == k { gsub(/"/, "", $2); print $2; exit }')"
  if [[ -z "$remote_etag" ]]; then
    to_put+=("$rel")
  elif [[ "$remote_etag" == "$(md5_of "$file")" ]]; then
    echo "skip $key (already uploaded, identical)"
  else
    echo "publish-cdn.sh: $key already exists with different content; refusing to overwrite an immutable version" >&2
    exit 3
  fi
done < <(find "$SRC" -type f | LC_ALL=C sort)

# Pass 2: create-only uploads (--if-none-match makes S3 reject an overwrite).
if ((${#to_put[@]})); then
  for rel in "${to_put[@]}"; do
    run s3api put-object --bucket "$BUCKET" --key "$version_prefix$rel" --body "$SRC/$rel" \
      --if-none-match '*' \
      --cache-control "public, max-age=31536000, immutable" \
      --content-type "$(content_type "$rel")"
  done
fi

# Alias: only the highest version of this major may move it.
prefixes="$(aws s3api list-objects-v2 --bucket "$BUCKET" --prefix "$PREFIX/v$major." --delimiter / \
  --query 'CommonPrefixes[].Prefix' --output text)"
highest="$( { printf '%s\n' "$prefixes" | tr '\t' '\n' | sed -e "s#^$PREFIX/v##" -e 's#/$##'; echo "$version"; } \
  | grep -E '^[0-9]+\.[0-9]+\.[0-9]+$' | sort -V | tail -n 1)"
if [[ "$highest" != "$version" ]]; then
  echo "Alias v$major/ skipped: v$highest is newer than v$version"
  exit 0
fi

run s3 sync "$SRC" "s3://$BUCKET/$PREFIX/v$major/" --delete --cache-control "public, max-age=300"
run cloudfront create-invalidation --distribution-id "$DISTRIBUTION_ID" --paths "/$PREFIX/v$major/*"
