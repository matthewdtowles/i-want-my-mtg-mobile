#!/usr/bin/env bash
#
# ship-android.sh — build the Android app and publish it to a Play track in one command.
#
#   npm run ship:android            # build + submit to the `internal` track
#   npm run ship:android alpha      # build + submit to `alpha` (= Play "Closed testing")
#
# What it does, in order (mirrors ship-ios.sh):
#   1. Sanity-checks you're on a clean `main` (so you ship what's merged).
#   2. Reads the highest SemVer git tag — the SINGLE SOURCE OF TRUTH for the
#      version (CI cuts these from merged PR titles) — and exports it as
#      APP_VERSION. app.config.ts stamps that into the build. The version is
#      never written to app.json, so it cannot drift.
#   3. Runs a quick typecheck (a failed build wastes EAS minutes).
#   4. `eas build` (production) → then `eas submit` to the chosen Play track.
#      versionCode is managed remotely by EAS (eas.json appVersionSource: remote)
#      and auto-increments on their servers, so there is NOTHING to commit here.
#
# This is NOT automatic — you run it by hand. It does not touch the production
# track; promoting to Production is still a separate manual action in the Play
# Console.
#
# The new-individual-account gate (12 testers, 14 continuous days) requires the
# **Closed testing** track — that's `alpha` here, NOT `internal`. Use
# `npm run ship:android alpha` for the qualifying test. `internal` is the fast
# lane (instant, no review) for smoke-testing a build first.
#
# Prereqs (one-time):
#   - eas-cli installed (script falls back to `npx eas-cli`)
#   - `eas login` (Expo account: mtengineer)
#   - A Google Play service account key at ./play-service-account.json
#     (gitignored; referenced by eas.json submit.production.android)
#   - EAS remote versionCode initialized once: `eas build:version:set`
#
set -euo pipefail
cd "$(dirname "$0")/.."

TRACK="${1:-internal}"

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
echo "==> Building Android (production) as $version…"
$EAS build --platform android --profile production
echo "==> Submitting latest build to the '$TRACK' Play track…"
$EAS submit --platform android --profile production --track "$TRACK" --latest

echo "✓ Submitted to '$TRACK'. The build appears in the Play Console once Google"
echo "  finishes processing. For the new-account gate, ship to 'alpha' (Closed"
echo "  testing) and keep 12 testers opted in for 14 continuous days."
