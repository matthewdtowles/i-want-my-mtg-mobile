# Handoff / dev state

Where the v1 build stands and how to pick it up. See the web repo's
`ROADMAP.md` §7.1 for the overall plan.

_Last updated: 2026-06-24 (iOS distribution / TestFlight)._

## What this is

Cross-platform (iOS + Android) mobile app for I Want My MTG. React Native +
Expo (SDK 56), TypeScript, expo-router, TanStack Query. It consumes the existing
`https://iwantmymtg.net/api/v1` backend - there is no separate mobile server.

- Backend/API repo: `i-want-my-mtg`.
- Cross-repo progress is tracked on the "I Want My MTG" GitHub project board.

## v1 issues

- #1 scaffold - **done** (#9)
- #2 OpenAPI client - **done** (#10)
- #3 auth - **done** (#11)
- #4 browse (sets / cards / search / detail) - **done** (#13)
- CI versioning - **done** (#12)
- generated-types cleanup - **done** (#14)
- #5 inventory (view / add / edit / finish) - **done**
- #6 transactions (log buy/sell + history) - **done**
- #7 portfolio overview - **done**
- #8 distribution (TestFlight + Play internal) - **in progress**: iOS ships to
  TestFlight (done 2026-06-24); Android / Play internal track not started

## Inventory (#5) notes

Endpoints (typed in the spec; the write bodies were corrected in backend PR #549,
which added the missing OpenAPI annotations - before it, add/update bodies
generated as `string[]` and delete had no body):

- `GET /api/v1/inventory` -> `InventoryItemApiDto[]` (paginated). The item
  **embeds card fields** (name, set, number, price, rarity, `imgSrc`) - no join
  needed. Note `imgSrc` is a **full** Scryfall URL here (browse returns just the
  tail); `cardImageUrl` normalizes both.
- `POST` (201) / `PATCH` (200) `/api/v1/inventory` with `InventoryRequestApiDto[]`
  (`{ cardId, quantity, isFoil }`) -> `InventoryItemApiDto[]`. Both are
  **server-identical upserts** (absolute quantity, keyed by cardId+isFoil;
  quantity 0 removes the row), so `lib/api/inventory.ts` uses one `saveInventory`
  (PATCH) for both add and edit.
- `DELETE /api/v1/inventory` with body `{ cardId, isFoil }` -> `{ deleted }`
  (not a `/:id` path).
- `GET /api/v1/inventory/quantities?cardIds=` -> `InventoryQuantityApiDto[]`.

UI: inventory tab (`app/(tabs)/inventory.tsx`) lists rows with an optimistic
quantity stepper + remove (`InventoryListItem`). Adding is done from the card
detail screen via `AddToInventory` (Normal/Foil steppers seeded from
`/quantities`, optimistic upsert). The whole app is auth-gated, so the bearer
token is always present.

## Transactions (#6) notes

Like inventory, the write DTO generated empty (`Record<string, never>`) until the
backend annotations landed in PR #550 (`TransactionRequestDto` /
`TransactionUpdateRequestDto` lacked `@ApiProperty`). Now typed:

- `GET /api/v1/transactions` -> `TransactionApiItemDto[]` (paginated; the server
  applies the free-tier 30-day window, so the client just renders what it gets).
- `POST /api/v1/transactions` with `TransactionRequestDto`
  (`{ cardId, type: 'BUY'|'SELL', quantity, pricePerUnit, isFoil, date, ... }`)
  -> `TransactionApiItemDto`. A transaction **syncs inventory server-side**
  (unless `skipInventorySync`), so the create invalidates both `["transactions"]`
  and `["inventory"]`.
- `PUT`/`DELETE /api/v1/transactions/{id}` exist but edit/delete are **not built
  yet** (out of #6 scope - log + history only).

UI: Transactions tab (`app/(tabs)/transactions.tsx`) is the history list
(`TransactionListItem`). Logging is a modal form (`app/transaction/new.tsx`,
registered in `app/_layout.tsx`) opened from the card detail "Log a transaction"
button. `date` is a date-only string (`YYYY-MM-DD`); the form uses a plain text
field defaulting to today (no date-picker dep, to stay Expo Go-compatible).

## Portfolio (#7) notes

Read-only, so no backend change was needed (the response DTOs were already
typed). Minimal free-tier overview per the issue.

- `GET /api/v1/portfolio` -> `PortfolioSummaryApiDto | null`. **`data` is null**
  until the portfolio has been computed for the user, so the screen shows a
  "Calculate portfolio" action in that state.
- `POST /api/v1/portfolio/refresh` recomputes server-side (no body, 200). It's
  **rate-limited (~1/hour)**; the 429 surfaces as an alert ("wait N minutes"),
  so the recalc mutation has an `onError`. Don't let it fail silently.
- The deeper endpoints (`/history`, `/performance`, `/cash-flow`,
  `/breakdown`, ...) are typed but **not built** - deferred analytics.

UI (`app/(tabs)/portfolio.tsx`): hero total value + stats (cards, quantity, and
cost basis / realized gain when present), pull-to-refresh (re-GETs), and a
"Recalculate" button (POST refresh). Logging a transaction syncs inventory and
flows into the portfolio totals.

## Distribution: issue #8

**iOS is done (2026-06-24):** the app builds on EAS and ships to TestFlight.
One-time setup landed in PR #18 - App ID `com.matthewdtowles.iwantmymtg`, App
Store Connect app `6784075307` (pinned as `submit.production.ios.ascAppId` in
`eas.json`), signing certs/profile + an App Store Connect API key (the `.p8`
secret stays on EAS servers, never in the repo), and
`ios.infoPlist.ITSAppUsesNonExemptEncryption: false` in `app.json` to skip the
per-build encryption-compliance prompt. Expo account: **mtengineer**.

Cutting a new TestFlight build is two manual commands (interactive Apple login):

```bash
eas build  --platform ios --profile production
eas submit --platform ios --profile production
```

**Merging to `main` does NOT build or ship anything** - CI only tags a version
(no `eas build`/`eas submit` in the workflow). And `eas submit` reaches
**TestFlight only**, not the public App Store; a public release is a separate
manual Submit-for-Review in App Store Connect. (See the README "Distribution"
section for the full rundown, incl. inviting testers.)

**Remaining: Android / Play internal track** - not started. Calendar-bound
(Google's 14-day closed-test gate for new individual accounts) - see the web
repo's `ROADMAP.md` §7.1 "Store readiness".

## Architecture / key files

- `lib/api/schema.ts` - **generated** (`npm run gen:api`, see `scripts/gen-api.mjs`)
  from the backend OpenAPI spec. Committed; CI fails on drift. Do not hand-edit.
- `lib/api/client.ts` - typed `openapi-fetch` client. Bearer token injected via
  `setAuthTokenGetter`; signs out on 401 via `setOnUnauthorized`.
- `lib/api/types.ts` - aliases over generated `components["schemas"][...]`.
- `lib/api/catalog.ts` - typed request helpers (browse). Pattern to copy for #5+.
- `lib/auth/` - `AuthContext` (`useAuth()`), token in `expo-secure-store`.
  Sign-up opens the web `/user/create` page (no API signup endpoint).
- `lib/images.ts` - card images: `https://cards.scryfall.io/{size}/front/{imgSrc}`.
- `app/` - expo-router routes: `(tabs)` shell, `sign-in`, `set/[code]`,
  `card/[setCode]/[number]`.

## Conventions

- **Branch per issue.** Stack only on an unmerged dependency; after the parent
  merges (squash), rebase the child onto main and force-push with
  `--force-with-lease`:
  `git rebase --onto origin/main <last-commit-already-in-main> <branch>`.
- **Commit/PR titles** use a conventional prefix - the **PR title drives CI
  versioning** (`feat:` -> minor, `!` -> major, else patch). Keep messages brief.
- **`package.json` version stays `0.0.0-dev`** (placeholder). The version is
  computed from the PR title and tagged by CI (`.github/workflows/ci.yml`); git
  tags are the source of truth. EAS stamps the build version from the tag.
- **Install with `legacy-peer-deps`** (configured in `.npmrc`) - a transitive
  `react-native-worklets` peer conflict via `expo-router` -> `@expo/ui`.
- **Validate before a PR:** `npm run typecheck` and `npx expo export` (full Metro
  bundle). Booting on a simulator/emulator still needs a manual smoke test.

## Known gaps / deferred

- Per-card **legality** is not in the API card response (only a search filter);
  card detail can't show it without a backend change.
- Backend OpenAPI response schemas exist for card/set/inventory/transaction/
  portfolio/user/auth. Other controllers (deck, buy-list, optimizer, price-alert,
  sealed, api-keys) are not annotated yet - apply the same `ApiOkEnvelope`
  decorator in the backend when a feature needs them.
- `app.json` version is `0.1.0` but EAS `appVersionSource: remote` ignores it.
- iOS EAS build/submit is set up (see Distribution above); Android is not.
