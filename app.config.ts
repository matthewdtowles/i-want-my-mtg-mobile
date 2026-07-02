import { execSync } from "node:child_process";

import type { ConfigContext, ExpoConfig } from "expo/config";

// The app version has ONE source of truth: the highest SemVer git tag (CI cuts
// these from merged PR titles). It is never stored in app.json, so it cannot
// drift. eas-cli evaluates this config locally at build time — where the git
// tags exist — and sends the resolved version to the build server. CI and the
// ship scripts set APP_VERSION explicitly; local/dev builds read the tag here.
function resolveVersion(): string {
  if (process.env.APP_VERSION) return process.env.APP_VERSION;
  try {
    const tag = execSync("git tag --list --sort=-v:refname", { encoding: "utf8" })
      .split("\n")
      .map((line) => line.trim())
      .find((line) => /^\d+\.\d+\.\d+$/.test(line));
    if (tag) return tag;
  } catch {
    // no git / no tags (e.g. a shallow checkout without tags) — fall through
  }
  return "0.0.0";
}

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  version: resolveVersion(),
});
