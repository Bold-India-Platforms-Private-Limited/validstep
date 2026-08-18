#!/usr/bin/env bash
# Builds the main validstep frontend and the workspace module frontend separately (they
# are two independent Vite projects with their own dependencies — this is what keeps the
# workspace module "separable": it never shares a package.json or a node_modules tree
# with the main app), then nests the workspace build under frontend/dist/workspace/ so a
# single Cloudflare Pages deployment (output dir: frontend/dist) serves both.
#
# Point Cloudflare Pages' build command at this script instead of `npm run build`, with
# output directory `frontend/dist`. Everything else about the Pages project (custom
# domain, env vars for the main app) stays as-is.
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "==> Installing + building validstep frontend"
npm --prefix "$ROOT_DIR/frontend" ci
npm --prefix "$ROOT_DIR/frontend" run build

echo "==> Installing + building workspace frontend"
npm --prefix "$ROOT_DIR/workspace/frontend" ci
npm --prefix "$ROOT_DIR/workspace/frontend" run build

echo "==> Nesting workspace build under frontend/dist/workspace"
rm -rf "$ROOT_DIR/frontend/dist/workspace"
cp -r "$ROOT_DIR/workspace/frontend/dist" "$ROOT_DIR/frontend/dist/workspace"

echo "==> Done. frontend/dist is ready to deploy (validstep.com/ + validstep.com/workspace/)."
