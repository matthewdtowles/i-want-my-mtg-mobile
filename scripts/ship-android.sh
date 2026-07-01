#!/usr/bin/env bash
#
# ship-android.sh — build the Android app and publish it to a Play track in one command.
#
#   npm run ship:android            # build + submit to the `internal` track
#   npm run ship:android alpha      # build + submit to `alpha` (= Play "Closed testing")
#
# What it does, in order (mirrors ship-ios.sh):
#   1. Sanity-checks you're on a clean `main` (so you ship what's merged).
#   2. Reads the latest git tag (CI creates these from merged PR titles) and
#      writes it into app.json's `version`. REQUIRED: EAS uses
#      `appVersionSource: local`, so the version string Play shows comes straight
#      from app.json (autoIncrement still manages the integer versionCode).
#      iOS and Android share `expo.version`, so this keeps both platforms in sync.
#   3. Runs a quick typecheck (a failed build wastes EAS minutes).
#   4. `eas build` (production) → then `eas submit` to the chosen Play track.
#   5. Commits the versionCode that EAS autoIncrement wrote into app.json, so the
#      next build increments from the real value (Play rejects a duplicate code).
#
# This is NOT automatic — you run it by hand, and it needs an interactive Google
# login the first time. It does not touch the production track; promoting to
# Production is still a separate manual action in the Play Console.
#
# IMPORTANT — first upload is manual: Google requires the very FIRST .aab for a
# new app to be uploaded by hand in the Play Console (to create the app's first
# release). On a brand-new app the `eas submit` step here will fail; that's
# expected. Just grab the .aab from the EAS build page and upload it once via the
# Play Console UI. Every build after that submits fine through this script.
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

# --- 2. sync version from the latest tag ------------------------------------
# Highest SemVer tag — the same source of truth CI uses (.github/scripts/next-version.sh).
# `git describe` would pick the most recent tag by topology and not filter non-SemVer tags.
version="$(git tag --list --sort=-v:refname | grep -E '^[0-9]+\.[0-9]+\.[0-9]+$' | head -1 || true)"
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
echo "==> Building Android (production) as $version…"
$EAS build --platform android --profile production
echo "==> Submitting latest build to the '$TRACK' Play track…"
$EAS submit --platform android --profile production --track "$TRACK" --latest

# --- 5. commit the auto-incremented versionCode -----------------------------
# autoIncrement (production profile) bumps app.json's android.versionCode on disk
# during the build. Commit it so the next build increments from the real value.
if [ -n "$(git status --porcelain app.json)" ]; then
  newcode="$(node -e "const c=require('./app.json').expo.android.versionCode; if(!Number.isInteger(c)||c<1){console.error('✗ android.versionCode missing/invalid after build: '+c);process.exit(1)} process.stdout.write(String(c))")"
  echo "==> Committing auto-incremented versionCode → $newcode"
  git commit -qm "chore(release): bump android versionCode to $newcode" -- app.json
  echo "    committed the versionCode bump — remember to: git push origin main"
fi

echo "✓ Submitted to '$TRACK'. The build appears in the Play Console once Google"
echo "  finishes processing. For the new-account gate, ship to 'alpha' (Closed"
echo "  testing) and keep 12 testers opted in for 14 continuous days."
