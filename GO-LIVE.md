# Go-live: everything left to reach production

The single list of what stands between the current state and **everything live
in production**, across all four repos. Last verified 2026-07-03.

| Piece | Where it runs | Status |
|---|---|---|
| Web app + API (`i-want-my-mtg`) | https://iwantmymtg.net (AWS Lightsail) | ✅ **Live.** Auto-deploys on every merge to `main` (1.51.0 deployed 2026-06-30, incl. push fan-out). Nothing to do. |
| Scry ingest (`scry`) | Prod host (binary extracted by the web deploy) | ✅ **Live.** 5.15.0 published 2026-06-21; picked up by the web deploy. Nothing to do. |
| MCP server (`iwantmymtg-mcp`) | npm / MCP Registry / Smithery | ✅ **Live.** 0.6.0 published; CI auto-publishes on merge. Nothing to do. |
| **Mobile — Android** | Play **closed testing (Alpha)** since 2026-07-02 | 🟡 Production gated by Google's 12-tester / 14-day test → **section 2** |
| **Mobile — iOS** | **TestFlight** since 2026-06-24 | 🟡 Public App Store submission not started → **section 3** |

Everything below is mobile. Sections are in order; **1 is one-time setup, 2 is
calendar-bound so its clock should start immediately, 3 can run in parallel
with 2.**

---

## 1. One-time setup: make every release one command (do first, ~30 min)

The versioning pain is already solved — see the [cheat sheet](#release-cheat-sheet)
at the bottom for the whole mental model (there is nothing to memorize and
nothing to commit, ever). **One manual wart remains:** Android submits need a
Play service-account key that doesn't exist yet, so today the `.aab` has to be
uploaded to the Play Console by hand. These sub-steps kill that last manual
step permanently:

- [ ] **1a. Create the service account** — [Google Cloud Console](https://console.cloud.google.com)
      → create/pick a project → *IAM & Admin → Service Accounts → Create*
      (name: `eas-play-submit`; no project roles needed).
- [ ] **1b. Download a JSON key** — on the new service account: *Keys → Add key
      → Create new key → JSON*.
- [ ] **1c. Grant it Play access** — [Play Console](https://play.google.com/console)
      → *Users and permissions → Invite new user* → paste the service account's
      email (`…@….iam.gserviceaccount.com`) → grant access to **I Want My MTG**
      with **Release to testing tracks** + **View app information**.
- [ ] **1d. Drop the key in the repo** — save the JSON as
      `./play-service-account.json` (repo root). It is already gitignored and
      already referenced by `eas.json`; **never commit it**.
- [ ] **1e. Verify end-to-end** — `npm run ship:android` (internal track, the
      fast lane). It should build **and** land in the Play Console with zero
      manual steps. From then on `npm run ship:android alpha` is the whole
      Android release.

(iOS needs nothing — `npm run ship:ios` is already fully automated, and the EAS
remote build counters are already initialized: android 4, ios 5.)

---

## 2. Android → Google Play production (calendar-bound — start the clock now)

Google requires new personal accounts to run a closed test — **12 testers
opted in for 14 continuous days** — before production unlocks. Full policy +
questionnaire guide: [`docs/playstore-release.md`](docs/playstore-release.md).

- [ ] **2a. Confirm the fixed build is what's rolled out on Alpha** — Play
      Console → *Testing → Closed testing → Alpha*: the live release should be
      **versionCode 4** (the `expo-image` fix — earlier vc2 has broken card
      images). If not, roll vc4 out.
- [ ] **2b. Recruit 12+ real testers** (tracked in
      [#60](https://github.com/matthewdtowles/i-want-my-mtg-mobile/issues/60)) —
      friends, playgroup, MTG communities. Send each the **opt-in link** (Play
      Console → Alpha → Testers tab); they opt in with their Google account,
      then install from Play. **No paid tester farms** — policy violation,
      accounts get terminated.
- [ ] **2c. Keep 12+ opted in for 14 continuous days.** The clock effectively
      starts when the 12th tester opts in; an opt-out resets that tester.
      Keep a running **feedback log** (who said what, links to fixes) — the
      questionnaire in 2e is written from it.
- [ ] **2d. Ship at least one real update during the window** — any genuine
      fix/tweak, then: merge the PR → `npm run ship:android alpha`. Done.
- [ ] **2e. Apply for production access** (Play Console dashboard, appears
      after the 14 days) and answer the 4 questions **truthfully from the
      feedback log** — templates in `docs/playstore-release.md`.
- [ ] **2f. Promote to Production** — Play Console → *Production → Create
      release* → promote the tested build → submit for review (hours–days) →
      roll out. 🎉 **Android live.**

---

## 3. iOS → App Store production (parallel with 2; not calendar-bound)

Full checklist with details:
[#20](https://github.com/matthewdtowles/i-want-my-mtg-mobile/issues/20).
Condensed, in order:

- [ ] **3a. Agreements** — App Store Connect → Business: Free Apps agreement
      Active.
- [ ] **3b. Listing** — subtitle, category, description, keywords, support URL,
      privacy-policy URL (reuse `iwantmymtg.net/privacy`).
- [ ] **3c. Questionnaires** — App Privacy (declare account email + JWT) and
      age rating.
- [ ] **3d. Screenshots** — iPhone sizes; **`supportsTablet: true` means iPad
      screenshots are also required** — produce them or flip
      `supportsTablet: false` in `app.json` to drop the requirement.
- [ ] **3e. Reviewer demo account** — the app is fully behind sign-in; App
      Review rejects without working credentials in the review notes. Create a
      dedicated production demo user (never your real account).
- [ ] **3f. Policy self-check** — no upgrade button / no steering to web
      purchase anywhere a reviewer can reach (launch posture is read/track
      only; premium stays Stripe-on-web). In-app account deletion already
      ships (`app/account.tsx`).
- [ ] **3g. Submit** — pick the TestFlight build (or `npm run ship:ios` a fresh
      one), write "What's New", fill App Review Information, **Submit for
      Review** (~1–3 days) → release. 🎉 **iOS live.**

---

## Release cheat-sheet

The entire release model — nothing else to remember, nothing to edit, nothing
to commit:

1. **Merge a PR to `main`.** The PR title sets the version bump (`feat:` →
   minor, `!` → major, else patch); CI creates the git tag. Merging never
   builds or ships anything.
2. **Ship with one command:**
   - `npm run ship:android alpha` → Play closed testing
   - `npm run ship:ios` → TestFlight
3. That's it. The version comes from the git tag (`app.config.ts` resolves it
   at build time — even a raw `eas build` gets the right version), and
   versionCode/buildNumber live on EAS servers and auto-increment. No version
   exists in the repo to edit, sync, or commit.
4. Public releases (Play **Production** track, App Store **Submit for
   Review**) are always deliberate manual store-console actions — by design.
