#!/usr/bin/env bash
#
# ship-ios.sh — build the iOS app and publish it to TestFlight in one command.
#
#   npm run ship:ios
#
# What it does, in order:
#   1. Sanity-checks you're on a clean `main` (so you ship what's merged).
#   2. Reads the latest git tag (CI creates these from merged PR titles) and
#      writes it into app.json's `version`. This is REQUIRED: EAS uses
#      `appVersionSource: local`, so the version string TestFlight shows comes
#      straight from app.json (autoIncrement still manages the build NUMBER).
#      Without this step a build would ship whatever stale version is already
#      committed in app.json instead of the current release.
#   3. Runs a quick typecheck (a failed build wastes EAS minutes).
#   4. `eas build` (production) with `--auto-submit` → uploads to TestFlight.
#   5. Commits the buildNumber that EAS autoIncrement wrote into app.json, so
#      the next build increments from the real value (a duplicate build number
#      gets rejected by App Store Connect).
#
# This is NOT automatic — you run it by hand, and it needs an interactive Apple
# login the first time. It does not touch the public App Store (TestFlight only;
# a public release is still a separate manual Submit-for-Review).
#
# Prereqs (one-time, already set up for this project):
#   - eas-cli installed (script falls back to `npx eas-cli`)
#   - `eas login` (Expo account: mtengineer)
#   - Apple App Store Connect API key lives on EAS servers (not in the repo)
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

# --- 2. sync version from the latest tag ------------------------------------
version="$(git describe --tags --abbrev=0 2>/dev/null || true)"
if [ -z "$version" ]; then
  echo "✗ No git tag found. CI tags releases on merge to main; nothing to ship." >&2
  exit 1
fi
current="$(node -e "process.stdout.write(require('./app.json').expo.version)")"
if [ "$current" != "$version" ]; then
  echo "==> Bumping app.json version: $current → $version (from git tag)"
  node -e "const fs=require('fs'),p='app.json',j=JSON.parse(fs.readFileSync(p));j.expo.version='$version';fs.writeFileSync(p,JSON.stringify(j,null,2)+'\n')"
  git commit -aqm "chore(release): set app version to $version"
  echo "    committed the version bump — remember to: git push origin main"
else
  echo "==> app.json already at $version"
fi

# --- 3. preflight -----------------------------------------------------------
echo "==> Typechecking…"
npm run --silent typecheck

# --- 4. build + submit ------------------------------------------------------
EAS="eas"
command -v eas >/dev/null 2>&1 || EAS="npx eas-cli"
echo "==> Building iOS (production) and auto-submitting to TestFlight as $version…"
$EAS build --platform ios --profile production --auto-submit

# --- 5. commit the auto-incremented build number ----------------------------
# autoIncrement (production profile) bumps app.json's `buildNumber` on disk
# during the build. Commit it so the next build increments from the real value.
if [ -n "$(git status --porcelain app.json)" ]; then
  newbuild="$(node -e "process.stdout.write(require('./app.json').expo.ios.buildNumber)")"
  echo "==> Committing auto-incremented buildNumber → $newbuild"
  git commit -qm "chore(release): bump ios buildNumber to $newbuild" -- app.json
  echo "    committed the buildNumber bump — remember to: git push origin main"
fi

echo "✓ Submitted. The build appears in App Store Connect → TestFlight once"
echo "  Apple finishes processing (usually a few minutes)."
