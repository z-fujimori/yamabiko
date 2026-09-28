#!/usr/bin/env bash
set -euo pipefail
site_dir="$(cd "$(dirname "$0")/.." && pwd)"
remote="git@github.com:z-fujimori/yamabiko.git"
branch="codex/project-site"
publish_dir="$(mktemp -d "${TMPDIR:-/tmp}/yamabiko-pages.XXXXXX")"
trap 'rm -rf "$publish_dir"' EXIT

git init -q -b "$branch" "$publish_dir"
git -C "$publish_dir" remote add origin "$remote"
if [ -n "$(git ls-remote --heads "$remote" "$branch")" ]; then
  git -C "$publish_dir" fetch --depth=1 origin "$branch"
  git -C "$publish_dir" reset --hard FETCH_HEAD
fi
rsync -a --delete --exclude=.git/ "$site_dir/dist/" "$publish_dir/"
git -C "$publish_dir" add --all
if git -C "$publish_dir" diff --cached --quiet; then
  printf '%s\n' 'Site is already up to date.'
  exit 0
fi
git -C "$publish_dir" commit -m "Publish Yamabiko project site"
git -C "$publish_dir" push origin "HEAD:refs/heads/$branch"
