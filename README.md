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
  (Normal/Foil steppers seeded from `/inventory/quantities`, optimistic upsert).
- Data layer: `lib/api/inventory.ts`. `POST`/`PATCH` are server-identical upserts
  (absolute quantity, keyed by card + finish; quantity 0 removes), so one
  `saveInventory` covers both add and edit.

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

Build config for both platforms lives in `eas.json` (EAS managed workflow);
the store builds are wired up in the distribution issue.

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

Browse (#4) and Inventory (#5) are implemented; Transactions (#6) and Portfolio
(#7) are still placeholders, filled in by their own v1 issues.

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
- **Sign-up** opens the web registration page (`/user/create`) in a browser:
  there is no API signup endpoint because registration requires email
  verification, handled by the web app.

## Versioning & releases

Versioning is automatic on merge to `main`, driven by the squash-merged **PR
title** (same scheme as the web, scry, and MCP repos):

- `feat:` / `feat(scope):` -> **minor**
- `!` before the colon (`feat!:`) or at the end of the title -> **major**
- anything else (`fix:`, `docs:`, `chore:`, ...) -> **patch**

The `version` + `release` jobs in `.github/workflows/ci.yml` run
`.github/scripts/next-version.sh` to compute the next semver from the latest git
tag + the PR title, then create a matching git tag and GitHub release. **Git tags
are the source of truth** - `app.json` stays a placeholder; the EAS build (issue
#8) stamps the real version and native build numbers (`ios.buildNumber`,
`android.versionCode`) from the tag.

