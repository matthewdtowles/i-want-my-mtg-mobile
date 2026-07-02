# Play Store Release & Production Access

How we take **I Want My MTG** (`com.matthewdtowles.iwantmymtg`) from a closed test to
production on Google Play, and how to answer the production-access questionnaire
**truthfully**.

> The build/submit mechanics live in `scripts/ship-android.sh`
> (`npm run ship:android alpha`). This doc covers the Play Console side: the
> testing requirement and the production review.

---

## Versioning & build numbers

There is **one source of truth for the app version: the highest SemVer git tag.**
CI cuts these from merged PR titles (feat → minor, `!` → major, else → patch) on
merge to `main`. You never edit a version by hand.

- **Version string** (e.g. `0.19.6`): resolved at build time by `app.config.ts`,
  which reads the latest git tag. It is *not* stored in `app.json`, so it cannot
  drift. `eas-cli` evaluates the config locally when you build, so the tag is
  always available.
- **Build numbers** (`versionCode` / `buildNumber`): managed remotely by EAS
  (`eas.json` → `appVersionSource: remote`) and auto-incremented on their servers.
  Nothing is written to disk or committed.

So a release is just: merge a PR → CI tags `0.19.6` → `npm run ship:android alpha`
→ the build is stamped `0.19.6` with the next versionCode automatically.

### One-time setup (once per platform)

Before the first remote build, initialize EAS's build-number counters so they
don't collide with what's already on the stores (interactive — no value flag):

```
eas build:version:set -p android   # enter the last-used versionCode; next build is +1
eas build:version:set -p ios       # enter the last-used buildNumber; next build is +1
```

Gaps in build numbers are fine — if EAS ever reports a duplicate, set it higher.

---

## The production-access requirement

New personal Google Play developer accounts must, before they can publish to
production:

- Run a **closed test** with **at least 12 testers** who stay opted in
- Keep that test running for **14 continuous days**
- Then complete a short **production-access questionnaire** about the test

Our closed-testing track is **Alpha** (`npm run ship:android alpha`). Internal
testing does **not** count toward this requirement.

### Testers must be real — no shortcuts

Use real people: friends, playgroup, MTG communities, coworkers. Send them the
Closed testing **opt-in link** (Play Console → Testing → Closed testing → Alpha →
Testers), and they install from Play once the build is live.

**Do not buy testers.** Paid tester farms (e.g. "get 12 testers in 14 days"
services) are a Play policy violation. Google detects inauthentic testing and
**terminates developer accounts** for it — which takes every app on the account
with it. It is not worth the risk. The 12-tester bar is low enough to hit with
real people.

---

## The production questionnaire

When the 14 days are up, Play asks four questions about your test. Answer them
**from what actually happened** — these are attestations you are declaring true.
Fill in the templates below with real feedback and real changes. If something
didn't happen, don't claim it did.

Keep a running log during the test so these are easy to fill in:
- What testers actually said (screenshots of messages, notes)
- What you actually changed in response (link the commits/PRs)
- What you actually observed (crashes seen? core flows worked?)

### Q1 — Describe the feedback you received from your testers

> Template — replace with real feedback:
>
> "Testers exercised the core flows: browsing sets, adding cards to inventory,
> building decks, and using the watchlist/price alerts. The main feedback was
> `<e.g. "X was confusing", "Y screen was slow to load", "wanted feature Z">`.
> `<Add specific quotes/observations. If feedback was light, say so honestly:
> "Most testers reported the core flows worked as expected; the notable requests
> were …">`."

### Q2 — Describe how you gathered feedback from testers

> Template — describe your **actual** channel(s):
>
> "Feedback was collected via `<e.g. a shared group chat / a Google Form / direct
> messages / email>`. `<If you watched Play Console → crashes & ANRs, mention it;
> only mention Firebase/Crashlytics if actually integrated — this app currently
> is not.>`"

### Q3 — Describe what changes you made based on tester feedback

> Template — list **real** changes, ideally linked to commits/PRs:
>
> "Based on tester feedback I `<e.g. fixed the crash on the deck screen (#NN),
> clarified the empty-inventory state, sped up the initial card list load>`.
> `<Link the commits/PRs. If no changes were needed, it's fine to say the test
> surfaced no blocking issues and describe any minor tweaks you did ship.>`"

### Q4 — How did you decide your app is ready for production

> Template — base this on **what you observed**:
>
> "Over the test window the core user flows — browsing, updating inventory,
> building decks, searching, and watchlist/price alerts — worked across the
> testers' devices. `<State what you actually saw: e.g. "No crashes were reported
> and none appeared in Play Console vitals" — only if true.>` The app is stable
> and feature-complete for the current scope, so it's ready for production."

**Only include a claim if it's true.** Don't cite metrics you didn't measure
(latency percentages, "zero ANRs", stress-test results) — a reviewer can ask, and
fabrications jeopardize the account.

---

## Ship one real update during the test (recommended)

Pushing a genuine minor update mid-window is a legitimate signal that you're
actively maintaining the app, and gives Q3 something concrete. Make it a **real**
change you'd ship anyway (a copy fix, a small UX tweak, an actual bug fix):

```
# make the change, merge to main (CI tags the release), then:
npm run ship:android alpha
```

The version comes from the git tag and the versionCode is managed by EAS — there's
nothing to edit or commit (see [Versioning & build numbers](#versioning--build-numbers)).

---

## Engineering hygiene (good practice, not a review gate)

These improve UX and reduce backend load. They are **not** required to pass
review — Google's review does not stress-test your backend, and ANR rates are
measured from real field usage after launch, not from the review process. Network
calls in this Expo/RN app are already off the main thread, so a slow backend
shows a spinner, not an ANR. Still worth doing on their own merits:

- **Cache card data on-device.** Avoid re-fetching static card fields (name, id,
  mana cost, set) on every screen; fetch live data (prices, inventory) as needed.
- **Set request timeouts + graceful failures.** On a slow/failed backend response,
  show a "couldn't reach the server, retry" state instead of an infinite spinner.
- **Watch backend headroom** if tester traffic ever does spike. For ~12 testers
  this is a non-issue, but keep an eye on DB connection/CPU limits as the real
  user base grows.

---

## Pre-submit checklist

Before requesting production access:

- [ ] 12+ **real** testers opted in and stayed opted in for 14 continuous days
- [ ] At least one genuine update shipped to Alpha during the window
- [ ] Questionnaire answers written from the real feedback log (Q1–Q4 above)
- [ ] Latest git tag reflects the version you intend to ship (CI tags on merge to `main`)
- [ ] Store listing complete (icon, feature graphic, phone screenshots, descriptions)
- [ ] App content declarations complete (privacy policy, data safety, content
      rating, target audience, ads, financial features = none, health = none)
