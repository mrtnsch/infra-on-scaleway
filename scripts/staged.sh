#!/usr/bin/env bash
# Prints the files in $STAGED that live under the current mise config root, made
# relative to it, existing-on-disk only, optionally filtered by extension.
#
#   staged.sh              # everything under this config root
#   staged.sh .tf .hcl     # only these extensions
set -euo pipefail
[ -n "${STAGED:-}" ] || exit 0

prefix="${MISE_CONFIG_ROOT#"$MISE_MONOREPO_ROOT"/}/"

for f in $STAGED; do
  case "$f" in
    "$prefix"*) rel="${f#"$prefix"}" ;;
    *) continue ;;
  esac
  [ -f "$MISE_MONOREPO_ROOT/$f" ] || continue
  if [ "$#" -gt 0 ]; then
    for ext in "$@"; do
      if [ "${rel%"$ext"}" != "$rel" ]; then
        printf '%s\n' "$rel"
        break
      fi
    done
  else
    printf '%s\n' "$rel"
  fi
done
