#!/usr/bin/env bash
#
# ship-ios.sh — build the iOS app and publish it to TestFlight in one command.
#
#   npm run ship:ios
#
# What it does, in order:
#   1. Sanity-checks you're on a clean `main` (so you ship what's merged).
#   2. Reads the highest SemVer git tag — the SINGLE SOURCE OF TRUTH for the
#      version (CI cuts these from merged PR titles) — and exports it as
#      APP_VERSION. app.config.ts stamps that into the build. The version is
#      never written to app.json, so it cannot drift.
#   3. Runs a quick typecheck (a failed build wastes EAS minutes).
#   4. `eas build` (production) with `--auto-submit` → uploads to TestFlight.
#      buildNumber is managed remotely by EAS (eas.json appVersionSource: remote)
#      and auto-increments on their servers, so there is NOTHING to commit here.
#
# This is NOT automatic — you run it by hand. It does not touch the public App
# Store (TestFlight only; a public release is still a separate manual
# Submit-for-Review).
#
# Prereqs (one-time, already set up for this project):
#   - eas-cli installed (script falls back to `npx eas-cli`)
#   - `eas login` (Expo account: mtengineer)
#   - Apple App Store Connect API key lives on EAS servers (not in the repo)
#   - EAS remote buildNumber initialized once: `eas build:version:set`
#
set -euo pipefail
cd "$(dirname "$0")/.."

# --- 1. clean main ----------------------------------------------------------
branch="$(git rev-parse --abbrev-ref HEAD)"
if [ "$branch" != "main" ]; then
  echo "✗ You're on '$branch', not 'main'. Ship from main so you build what's merged." >&2
  exit 1
fi
if [ -n "$(git status --porcelain)" ]; then
  echo "✗ Working tree is dirty. Commit or stash first." >&2
  exit 1
fi

# --- 2. resolve version from the latest tag (single source of truth) --------
# Highest SemVer tag — the same source CI uses (.github/scripts/next-version.sh).
# app.config.ts reads APP_VERSION; nothing is written to app.json, so the
# version can't drift no matter how the build is invoked.
version="$(git tag --list --sort=-v:refname | grep -E '^[0-9]+\.[0-9]+\.[0-9]+$' | head -1 || true)"
if [ -z "$version" ]; then
  echo "✗ No git tag found. CI tags releases on merge to main; nothing to ship." >&2
  exit 1
fi
export APP_VERSION="$version"
echo "==> Version (from git tag): $version"

# --- 3. preflight -----------------------------------------------------------
echo "==> Typechecking…"
npm run --silent typecheck

# --- 4. build + submit ------------------------------------------------------
EAS="eas"
command -v eas >/dev/null 2>&1 || EAS="npx eas-cli"
echo "==> Building iOS (production) and auto-submitting to TestFlight as $version…"
$EAS build --platform ios --profile production --auto-submit

echo "✓ Submitted. The build appears in App Store Connect → TestFlight once"
echo "  Apple finishes processing (usually a few minutes)."
