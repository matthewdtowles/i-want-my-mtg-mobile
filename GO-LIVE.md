# Go-live: everything left to reach production

**This file is the single source of truth for what remains.** Everything that is
already done lives in `HANDOFF.md` ("Shipped" section) — this file only tracks
what's left, across all four repos. Last verified 2026-07-21.

| Piece | Where it runs | Status |
|---|---|---|
| Web app + API (`i-want-my-mtg`) | https://iwantmymtg.net (AWS Lightsail) | ✅ **Live.** Auto-deploys on every merge to `main`. Nothing to do. |
| Scry ingest (`scry`) | Prod host (binary extracted by the web deploy) | ✅ **Live.** Nothing to do. |
| MCP server (`iwantmymtg-mcp`) | npm / MCP Registry / Smithery | ✅ **Live.** CI auto-publishes on merge. Nothing to do. |
| **Mobile — Android** | Play **closed testing (Alpha)** since 2026-07-02 | 🟡 Production gated by Google's 12-tester / 14-day test → **section 2** |
| **Mobile — iOS** | **TestFlight** since 2026-06-24 | 🔴 App Store submission **rejected 4× under Guideline 3.1.1** through build 0.2.0 (7). Root-caused and fixed 2026-07-21 → **section 3**, then [3H](#3h-guideline-311-what-went-wrong-and-the-standing-rule) |

Everything below is mobile. **1 is one-time setup (~30 min), 2 is
calendar-bound so its clock should start immediately, 3 can run fully in
parallel with 2** — section 3 is a complete runbook with every input
pre-written; executing it is mostly pasting.

---

## 1. One-time setup: make every release one command (do first, ~30 min)

**One manual wart remains:** Android submits need a Play service-account key
that doesn't exist yet, so today the `.aab` has to be uploaded to the Play
Console by hand. These sub-steps kill that last manual step permanently:

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

(iOS needs nothing — `npm run ship:ios` is already fully automated: the App
Store Connect API key lives on EAS servers, not in this repo.)

---

## 2. Android → Google Play production (calendar-bound — start the clock now)

Google requires new personal accounts to run a closed test — **12 testers
opted in for 14 continuous days** — before production unlocks. Full policy +
questionnaire guide: [`docs/playstore-release.md`](docs/playstore-release.md).
Tracker: [#60](https://github.com/matthewdtowles/i-want-my-mtg-mobile/issues/60).

- [x] **2a.** Confirmed the rolled-out Alpha release is **versionCode 4** (the
      `expo-image` fix — earlier vc2 has broken card images).
- [ ] **2b. Recruit 12+ real testers** — friends, playgroup, MTG communities.
      Send each the **opt-in link** (Play Console → Testing → Closed testing →
      Alpha → Testers tab); they opt in with their Google account, then install
      from Play. **No paid tester farms** — policy violation, accounts get
      terminated.
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

This is the complete runbook — every text input is pre-written below, so
executing it is: do 3A–3B prep (~1 hr, the only real work), then paste your way
through App Store Connect (~45 min), then submit. Issue
[#20](https://github.com/matthewdtowles/i-want-my-mtg-mobile/issues/20) is just
the tracker; this section supersedes its checklist.

All console work happens at
[App Store Connect](https://appstoreconnect.apple.com) → **I Want My MTG**
(app `6784075307`) unless noted.

### 3A. Prep: reviewer demo account (~20 min, needs the prod website)

The app is fully behind sign-in; App Review **rejects** without working
credentials. Create a dedicated demo user (never your real account):

- [ ] Register at https://iwantmymtg.net/user/create with
      `matthewdtowles+appreview@gmail.com` (Gmail aliases deliver to your
      inbox, so email verification works). Pick a strong password and record
      both — they go in the review notes (3G) verbatim.
- [ ] Verify the email, sign in **in the app** with it, and seed data so no
      screen is empty for the reviewer:
      - ~10–15 inventory cards (mix of normal/foil)
      - 1–2 logged transactions (a buy and a sell)
      - 1 deck with a few cards (so Decks + missing-cards render)
      - 2–3 buy-list entries
      - 1 price alert
      - Portfolio: tap **Calculate** once so the summary renders
- [ ] Confirm the demo login works from a fresh sign-out.

### 3B. Prep: screenshots (~40 min, needs your iPhone)

`app.json` has `supportsTablet: true` (kept deliberately — the app runs fine
on iPad), which means App Store Connect requires **two screenshot sets**:

- **iPhone 6.9″: 1320 × 2868 px** (also accepts 6.5″, 1284 × 2778) — one set
  covers all iPhones.
- **iPad 13″: 2064 × 2752 px** (also accepts 12.9″, 2048 × 2732) — required
  because the binary declares iPad support.

Steps:

- [ ] On your iPhone (TestFlight build, **demo account** from 3A, light mode),
      capture these 5 screens (portrait):
      1. Browse (sets list or a card search with results)
      2. Card detail (image + prices + price-history chart visible)
      3. Inventory (with the summary header showing value)
      4. Portfolio (calculated, hero value visible)
      5. Deck detail or Price alerts (shows depth beyond tracking)
- [ ] Capture the same screens on an **iPad** (install via TestFlight — the
      same public/internal invite works). While you're in there, give the
      layout a 2-minute smoke test — reviewers frequently test on iPad, so
      anything visibly broken there is a rejection risk.
      *No iPad available?* A Mac's iOS Simulator also works. If you have
      neither, say so — flipping `supportsTablet: false` (letterboxed
      iPhone-mode on iPads) is the fallback that drops this whole set, at the
      cost of a fresh build.
- [ ] Resize the raw captures to the exact pixel sizes above. Unless your
      devices match those classes exactly, the raw pixels won't — either run
      them through a framing tool ([AppMockUp](https://app-mockup.com), free)
      or just drop the PNGs in a folder here and have Claude batch-resize
      them with ImageMagick
      (`convert in.png -resize 1320x2868^ -gravity center -extent 1320x2868 out.png`).
      Plain resized screenshots are perfectly acceptable — framed/captioned
      art is optional polish.

### 3C. Agreements (~2 min)

- [ ] App Store Connect → **Business** (or Agreements, Tax, and Banking):
      confirm the **Free Apps agreement is Active**. No banking/tax needed —
      the app charges nothing.

### 3D. Listing (paste-ready)

App Store Connect → App Information + the version page. Copy verbatim:

| Field | Value |
|---|---|
| Name | `I Want My MTG` (already set) |
| Subtitle (≤30) | `Track your collection's value` |
| Primary category | Utilities |
| Secondary category | Entertainment |
| Support URL | `https://iwantmymtg.net` |
| Marketing URL (optional) | `https://iwantmymtg.net` |
| Privacy Policy URL | `https://iwantmymtg.net/privacy` |
| Promotional text (≤170) | `The mobile companion to iwantmymtg.net — browse cards, track your collection's value, build decks, and get price alerts on the cards you watch.` |
| Keywords (≤100) | `magic,gathering,card,collection,tracker,inventory,deck,prices,alerts,portfolio,tcg,collector` |
| Copyright | `© 2026 Matthew Towles` |

**Description** (≤4000 — paste as-is):

```
Track your Magic: The Gathering collection from your pocket. I Want My MTG is the mobile companion to iwantmymtg.net — your inventory, decks, buy list, and price alerts, synced across app and web.

BROWSE EVERY CARD
• Search every set and card, with images, prices (normal and foil), oracle text, and rarity
• Price-history charts on every card

TRACK YOUR COLLECTION
• Add cards to your inventory in a couple of taps — including bulk add from a set
• See your collection's total value, card count, and cost basis at a glance
• Log buys and sells; transactions sync your inventory automatically

BUILD & PLAN
• Build decks or import decklists, check format legality, and see which cards you're missing
• Keep a buy list of wanted cards — add missing deck cards to it in one tap, or import from CSV
• Set price alerts and get a push notification when a card moves

Your data lives in your I Want My MTG account, so everything stays in sync with the web app. A free account is all you need.

I Want My MTG is unofficial Fan Content permitted under the Wizards of the Coast Fan Content Policy. It is not approved or endorsed by Wizards of the Coast. Portions of the materials used are property of Wizards of the Coast. © Wizards of the Coast LLC. Card data and images courtesy of Scryfall.
```

### 3E. Questionnaires (~10 min)

**App Privacy** (App Store Connect → App Privacy) — "Yes, we collect data":

| Data type | Collected? | Linked to user? | Used for tracking? | Purpose |
|---|---|---|---|---|
| Contact Info → Email Address | Yes | Yes | No | App Functionality (account) |
| Identifiers → User ID | Yes | Yes | No | App Functionality (auth/JWT) |
| Identifiers → Device ID | Yes | Yes | No | App Functionality (push token) |
| User Content → Other User Content | Yes | Yes | No | App Functionality (inventory, decks, transactions, buy list, alerts) |
| Everything else | No | — | — | — |

No third-party SDKs collect anything (no analytics, no ads, no crash
reporting). Card images come from Scryfall's CDN but nothing is collected.

**Age Rating** — answer **None/No** to everything (no violence, no gambling, no
unrestricted web access — the app opens no web pages at all). Result: **4+**.

### 3F. Policy self-check (~10 min, in the app)

The classic rejection traps. **3.1.1 is the one that actually bit us** — see
[3H](#3h-guideline-311-what-went-wrong-and-the-standing-rule) before touching
anything that touches tiers.

- [ ] **No external-purchase steering:** walk every screen a reviewer can
      reach — no upgrade/subscribe button, no link to a page that sells
      premium, and **no on-screen text containing "Premium", "Upgrade",
      "Free plan", or a pricing URL**. That includes *server* error strings:
      the app renders API error messages verbatim
      (`lib/api/envelope.ts` → `errMessage`), so a tier-steering message
      thrown by the backend appears as a native iOS alert. Exercise the two
      free-tier limits directly: create a 6th price alert, and set **both**
      Rise % and Fall % on one card (`components/CardPriceAlert.tsx`).
      Both must produce neutral wording.
- [ ] **Sign-up is fully native** (since #82) — no in-app browser, no web
      redirect anywhere in the app. The only outbound hosts are Scryfall's
      image CDN and our own API origin.
- [ ] **Account deletion** — already ships in-app (Account screen → delete,
      double-confirmed). Nothing to do; just know it's there if review asks.

### 3G. Submit (~15 min + Apple's 1–3 day review)

- [ ] Pick the build: the latest TestFlight build works as-is, or ship a
      fresh one (`npm run ship:ios`) if anything merged since — it appears in
      App Store Connect a few minutes after EAS finishes.
- [ ] Version page → select that build. **"What's New"** (paste):

  ```
  First public release! Browse every Magic: The Gathering set and card, track your inventory and its value, log buys and sells, build decks, keep a buy list, and get push notifications when card prices move.
  ```

- [ ] **App Review Information** — contact: your name / phone /
      `matthewdtowles@gmail.com`. Sign-in required: **Yes** — enter the 3A
      demo credentials. **Notes** (paste, after filling in the password):

  ```
  Demo account (the app requires sign-in): email matthewdtowles+appreview@gmail.com, password <fill in>. This is a standard free account.

  Account creation and email verification are fully native in the app (Sign in -> "Create account"). The app opens no web pages and contains no web links.

  REGARDING GUIDELINE 3.1.1: The iOS app sells nothing. It contains no in-app purchases, no subscriptions, no upgrade or subscribe buttons, no pricing information, and no links to any external site or payment mechanism. Nothing in the app can be bought, unlocked, or paid for by any means.

  I Want My MTG is a multiplatform service (web at iwantmymtg.net, plus this iOS app) for tracking Magic: The Gathering card collections. The web product does offer an optional paid tier, purchased on the web and never mentioned, promoted, or reachable from the iOS app. Per Guideline 3.1.3(b) (Multiplatform Services), a user who happens to hold a web subscription may see their own previously-created content in the app; the app does not sell that access, does not advertise it, and provides no path toward acquiring it.

  Account deletion is available in-app: Account screen (person icon, top right) -> Delete account.
  ```

- [ ] Upload the 3B screenshots.
- [ ] Release option: **Manually release this version** (safest — you press
      Release after approval; switch to automatic on later releases).
- [ ] **Submit for Review** → wait ~1–3 days → **Release**. 🎉 **iOS live.**

**If rejected:** for **3.1.1** see [3H](#3h-guideline-311-what-went-wrong-and-the-standing-rule).
For **5.2 intellectual property**, respond in Resolution Center citing the WotC
**Fan Content Policy** (the disclaimer is already in the description) and that
card data/images come from Scryfall's public API.

### 3H. Guideline 3.1.1 — what went wrong, and the standing rule

**Status: root-caused 2026-07-21.** Builds through **0.2.0 (7)** were rejected
four times under 3.1.1 ("accesses digital content purchased outside the app,
such as premium…"). Three replies denying that premium existed made it worse,
because the reviewer was quoting text the app really did display.

**Root cause — server error strings rendered as native alerts.** The app
surfaces API error messages verbatim (`lib/api/envelope.ts` → `errMessage`).
Three messages in the backend's `price-alert.service.ts` named the paid tier
and pointed at a pricing page:

> "Multi-threshold alerts … are a **Premium** feature. **Upgrade at /pricing** to enable."
> "**Free plan** is limited to 5 active price alerts. **Upgrade at /pricing** for unlimited alerts."

`components/CardPriceAlert.tsx` shows Rise % and Fall % side by side, so a
reviewer testing price alerts — a headline feature in the description — filled
in both and got an iOS alert containing the word *Premium* and a pricing URL.
That is textbook external-purchase steering.

**Fixed (2026-07-21):**

| Repo | Change |
|---|---|
| `i-want-my-mtg` | `src/core/price-alert/price-alert.service.ts` — all three messages made tier-neutral ("Only one threshold direction…", "This account is limited to 5 active price alerts."). Specs + `freemium-gates` e2e updated. |
| mobile | `app/transactions.tsx` — "outside the editable window **for your plan**" → plan-free wording (the backend gate is a flat time window, never plan-based). |
| mobile | `app/privacy.tsx` — dropped the TCGPlayer affiliate bullet describing a "Buy on TCGPlayer" link and purchase commission. The app has no such link. |
| this file | Review notes rewritten (they still claimed sign-up happened on the website — untrue since #82 — and claimed "no paid features," which contradicted what the reviewer saw). |

**Standing rule — the API is a shipping surface of the iOS app.** Any string
the backend can return in a `4xx` body can appear as a native iOS alert.
Therefore **no API error message may contain "Premium", "Upgrade", "Free
plan", a tier name, or a pricing URL** — state the limit neutrally and let each
client decide how to present it. The web frontend does its own steering through
its own UI. This does not apply to the MCP server (`iwantmymtg-mcp`), which is
a separate developer product Apple never sees, and whose premium wording is
left intentionally intact.

**Known and deliberate:** three endpoints the app calls do return more data to
web subscribers — transactions (30-day free cutoff,
`transaction-api.controller.ts`), set-completion (`set-api.controller.ts`), and
the price-alert cap. That is legitimate under **3.1.3(b) Multiplatform
Services** and is now disclosed in the review notes rather than denied. Do not
claim "no paid features" again — it is checkable in ten seconds on the website
and it is what turned one rejection into four.

**Resubmission is a new build, not a reply.** The reviewer has a screenshot;
only a build without the strings clears it. Ship a fresh build with the fixes
above and let it supersede the rejected one.

**Resubmit checklist:**

- [ ] Backend deployed with the `price-alert.service.ts` fix (merge to `main`
      auto-deploys), then `npm run gen:api` in this repo so `schema.ts` matches.
- [ ] `npm run ship:ios` → new build (0.2.x, build 8+) appears in App Store Connect.
- [ ] Version page → select the new build; **replace the App Review Notes** with
      the 3G block above (the old ones are actively harmful).
- [ ] Post this in Resolution Center, then Submit:

  ```
  Thank you for the detailed reviews, and apologies for our earlier replies — we were wrong.

  We found what you were seeing. Our app displays error messages returned by our server, and two of those messages named our web product's paid tier and pointed to a pricing page. They appeared when adding a 6th price alert, or when setting both a rise and a fall threshold on the same card. You were reading real text in our app; our replies denying it were mistaken.

  Build 8 removes those messages entirely. There is now no occurrence of "premium," "upgrade," "free plan," or any pricing reference anywhere in the app, from any screen or any server response. The app sells nothing, contains no in-app purchases or subscriptions, opens no web pages, and has no link to any external site or payment mechanism.

  For full transparency: I Want My MTG is a multiplatform service. Our website offers an optional paid tier, purchased on the web. It is never mentioned, promoted, or reachable from the iOS app, and the app provides no path toward acquiring it. We believe this is what Guideline 3.1.3(b) contemplates for multiplatform services, and we are glad to make any further change you would like.

  The demo account provided is a standard free account.
  ```

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

**FAQ:**

- **Do the ship scripts change local files?** No. They refuse to run on a
  dirty tree, read the version from the existing git tag (exported as an env
  var, never written to disk), and build numbers live on EAS servers. Shipping
  never creates a commit, a merge, or a version bump.
- **`ship:android` vs `ship:android alpha`?** The argument picks the Play
  track. No argument = `internal` (instant, no review — private smoke-testing;
  does **not** count toward Google's 14-day gate). `alpha` = **Closed
  testing** — the track testers install from and the only one that counts
  toward the production gate. Rule of thumb: `alpha` is the real Android
  release; bare `internal` is only for checking a build before promoting it.
