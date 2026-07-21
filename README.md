# I Want My MTG - Mobile

Cross-platform (iOS + Android) mobile app for [I Want My MTG](https://github.com/matthewdtowles/i-want-my-mtg), built with React Native + Expo. It talks to the existing `/api/v1` backend; there is no separate mobile server.

See Phase 7.1 in the web repo's `ROADMAP.md` for the plan and decisions.

## Stack

- **Expo** (managed) + **React Native**, TypeScript
- **expo-router** - file-based navigation (`app/`)
- **TanStack Query** - server state
- **Auth**: JWT bearer token in `expo-secure-store`; sign-in via `POST /api/v1/auth/login`
- **API client**: typed, generated from the backend OpenAPI spec (`openapi-typescript` + `openapi-fetch`)

## Browse

- `app/(tabs)/index.tsx` - Browse tab: a search box that lists **sets** when
  empty and **card search results** (by name) when typed; both infinite-scroll.
- `app/set/[code].tsx` - cards in a set (infinite-scroll).
- `app/card/[setCode]/[number].tsx` - card detail: image, prices (normal/foil),
  type, rarity, mana cost, oracle text, artist.
- Data layer: `lib/api/catalog.ts` (typed request helpers over the generated
  client) + `lib/api/types.ts` (generated response-shape aliases).
- Card images come from Scryfall (`lib/images.ts`): `{base}/{size}/front/{imgSrc}`.

> Card **legality** is not shown on detail - the API doesn't return per-card
> legalities (only as a search *filter*). Surfacing it needs a backend change.

## Inventory

- `app/(tabs)/inventory.tsx` - Inventory tab: lists owned rows (card + finish)
  with an optimistic quantity stepper and remove (`components/InventoryListItem.tsx`).
- Adding is done from card detail via `components/AddToInventory.tsx`
  (Normal/Foil steppers seeded from `/api/v1/inventory/quantities`, optimistic upsert).
- Data layer: `lib/api/inventory.ts`. `POST`/`PATCH` are server-identical upserts
  (absolute quantity, keyed by card + finish; quantity 0 removes), so one
  `saveInventory` covers both add and edit.

## Transactions

- `app/(tabs)/transactions.tsx` - Transactions tab: buy/sell **history**
  (`components/TransactionListItem.tsx`). The server applies the free-tier
  30-day window, so the client just renders what it returns.
- `app/transaction/new.tsx` - modal **log** form (type, quantity, price, finish,
  date, notes), opened from the card detail "Log a transaction" button.
- Data layer: `lib/api/transactions.ts`. A logged transaction syncs inventory
  server-side, so creating one invalidates both `["transactions"]` and
  `["inventory"]`.

## Portfolio

- `app/(tabs)/portfolio.tsx` - Portfolio tab: total value + stats (cards,
  quantity, cost basis / realized gain when present), pull-to-refresh, and a
  "Recalculate" button.
- Data layer: `lib/api/portfolio.ts`. `GET /api/v1/portfolio` returns `null`
  until the portfolio is computed (a "Calculate" action handles that). `POST
  /api/v1/portfolio/refresh` recomputes server-side and is **rate-limited
  (~1/hour)** - the recalc mutation surfaces the 429 via an alert.

## Getting started

```bash
npm install        # uses legacy peer deps (see .npmrc)
npm start          # Expo dev server; press i / a, or scan the QR with Expo Go
npm run ios        # open in iOS simulator (macOS only)
npm run android    # open in Android emulator
npm run typecheck  # tsc --noEmit
```

**Smoke test before relying on a build:** the scaffold typechecks and bundles
(`npx expo export`) in CI, but booting the app isn't verified there. After
`npm install`, run `npm run ios` and `npm run android` and confirm the tab shell
(Browse / Inventory / Transactions / Portfolio) renders before building on top.

Build config for both platforms lives in `eas.json` (EAS managed workflow). Both
platforms are wired up end-to-end: iOS ships to TestFlight (`npm run ship:ios`)
and Android ships to a Play track (`npm run ship:android [track]`). See
**Distribution** below for how builds and store uploads actually happen.

## Structure

```
app/
  _layout.tsx          root layout: TanStack Query provider + stack
  (tabs)/
    _layout.tsx        bottom tab bar
    index.tsx          Browse   (issue #4)
    inventory.tsx      Inventory (issue #5)
    transactions.tsx   Transactions (issue #6)
    portfolio.tsx      Portfolio (issue #7)
components/            shared UI
lib/                   app-wide singletons (query client, ...)
```

Browse (#4), Inventory (#5), Transactions (#6), and Portfolio (#7) are
implemented. Distribution to the beta channels (#8) is done: iOS ships to
TestFlight and Android ships to Play closed testing (Alpha). What remains is
the two **public** store releases — see [`GO-LIVE.md`](GO-LIVE.md).

## API client

The typed client is generated from the backend OpenAPI spec
(`https://iwantmymtg.net/api/openapi.json`, the same spec the MCP server uses):

```bash
npm run gen:api                 # regenerate lib/api/schema.ts from the live spec
OPENAPI_URL=http://localhost:3000/api/openapi.json npm run gen:api  # from a local backend
```

`lib/api/schema.ts` is generated and committed - do not edit it by hand. CI
regenerates it and fails if the committed copy is stale, so when the backend API
changes, run `npm run gen:api` and commit the result.

The backend spec now declares response bodies too (via `ApiOkEnvelope`), so the
generated client types both requests and responses. `lib/api/types.ts` just
aliases the generated `components["schemas"][...]` shapes, and the typed request
helpers (`lib/api/catalog.ts`, `lib/api/inventory.ts`) unwrap the `{ data }`
envelope. Controllers without response annotations yet (deck, buy-list, etc.)
get the same `ApiOkEnvelope` decorator in the backend when a feature needs them.

Use the client from TanStack Query:

```ts
import { api } from "../lib/api/client";

const { data, error } = await api.GET("/api/v1/sets");
```

Auth (`lib/auth/`) calls `setAuthTokenGetter(...)` to attach the bearer token
from secure storage on every request, and `setOnUnauthorized(...)` to sign out
on a 401.

## Auth

- `lib/auth/AuthContext.tsx` - session state (`useAuth()`): `signIn`, `signOut`,
  `isAuthenticated`, `initializing`. Loads the stored token on startup and wires
  the API client's token getter + 401 handler.
- `lib/auth/tokenStore.ts` - token persistence in `expo-secure-store`.
- `app/sign-in.tsx` - sign-in screen. The root layout redirects unauthenticated
  users here and authenticated users back to the tabs.
- `app/sign-up.tsx` + `lib/auth/signUpRequest.ts` - fully native registration
  (`POST /api/v1/auth/register`, then `/api/v1/auth/verify-email`). The
  verification email deep-links to `https://iwantmymtg.net/user/verify?token=…`,
  which opens the app directly via Universal Links (iOS `associatedDomains`)
  and App Links (Android `intentFilters`, `autoVerify`); the `iwantmymtg://`
  custom scheme is the fallback. Both land on `app/user/verify.tsx`. The app
  opens no web pages anywhere.

## Versioning & releases

Versioning is automatic on merge to `main`, driven by the squash-merged **PR
title** (same scheme as the web, scry, and MCP repos):

- `feat:` / `feat(scope):` -> **minor**
- `!` before the colon (`feat!:`) or at the end of the title -> **major**
- anything else (`fix:`, `docs:`, `chore:`, ...) -> **patch**

The `version` + `release` jobs in `.github/workflows/ci.yml` run
`.github/scripts/next-version.sh` to compute the next semver from the latest git
tag + the PR title, then create a matching git tag and GitHub release. **Git tags
are the source of truth** - the version is never stored in `app.json`.
`app.config.ts` resolves it at build time (from `APP_VERSION`, set by the ship
scripts, falling back to the latest tag), and the native build numbers
(`ios.buildNumber`, `android.versionCode`) are managed remotely by EAS
(`eas.json` -> `appVersionSource: remote`, auto-incremented per build). Nothing
version-related is ever committed by a release.

## Distribution (builds & store uploads)

**Merging a PR to `main` does NOT build the app or ship anything to Apple or
Google.** CI only computes a version and tags a release (above) - there is no
`eas build` or `eas submit` step in `.github/workflows/ci.yml`. Builds and store
uploads only happen when you run these commands yourself from a terminal (each
needs an interactive Apple/Google login):

```bash
npm run ship:ios              # iOS: build + auto-submit to TestFlight
npm run ship:android          # Android: build + submit to the Play `internal` track
npm run ship:android alpha    # Android: build + submit to `alpha` (Play "Closed testing")
```

The ship scripts (`scripts/ship-ios.sh`, `scripts/ship-android.sh`) sanity-check
a clean `main`, export `APP_VERSION` from the latest git tag (which
`app.config.ts` stamps into the build), typecheck, then `eas build` (+ submit).
Build numbers are managed remotely by EAS, so **shipping commits nothing**.

**`eas submit` uploads to TestFlight only - never the public App Store.**
TestFlight is the private beta channel (you + invited testers). A public App
Store release is a separate, deliberate action you take by hand in App Store
Connect: pick a build, complete the store listing, **Submit for Review**, wait
for Apple's review (~1-3 days), then **Release**. None of that is automated.

iOS setup is one-time and already done (App ID `com.matthewdtowles.iwantmymtg`,
App Store Connect app `6784075307`, signing certs/profile + an App Store Connect
API key all managed on EAS servers; `ITSAppUsesNonExemptEncryption: false` in
`app.json` skips the per-build encryption-compliance prompt). Android setup is
also done (Play Console app `com.matthewdtowles.iwantmymtg`, store listing +
content declarations complete, closed-testing Alpha track live). The one gap:
`eas submit` for Android needs a Google Play **service-account key** at
`./play-service-account.json` (gitignored) - until that's created, upload the
`.aab` from the EAS build page to the Play Console by hand.

**`eas submit` for Android reaches testing tracks only** - promoting a build to
the Production track is a separate manual action in the Play Console, and is
gated for this account by Google's new-personal-account closed-test requirement
(12 testers, 14 days). See `docs/playstore-release.md` and `GO-LIVE.md`.

### Inviting TestFlight testers

In App Store Connect -> your app -> **TestFlight**:
- **Internal testers** (fastest, no Apple review of the build): add the person
  under **Users and Access** with a role first, then add them to an internal
  group. Up to 100, builds available to them immediately. Best for yourself +
  close collaborators.
- **External testers** (anyone, up to 10,000): create an external group, add
  testers by email or share the group's **public TestFlight link**. The first
  build for external testing goes through a light Apple **Beta App Review**
  (usually a day); later builds in the same train are available right away.

Each invited tester installs the **TestFlight** app on their device, accepts the
email invite (or opens the public link), and the build appears there.

