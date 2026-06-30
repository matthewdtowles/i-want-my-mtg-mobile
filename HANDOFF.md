# Handoff / dev state

Where the v1 build stands and how to pick it up. See the web repo's
`ROADMAP.md` §7.1 for the overall plan.

_Last updated: 2026-06-30 (#32 **push notifications end-to-end** - client
registration/tap-routing (#54) + backend Expo fan-out (#560); only an EAS dev
build remains to exercise on-device. **#32 closed.** With it, all v2 feature
issues (#25/#31/#32/#23) are done - remaining mobile work is distribution (#8
Android, #20 iOS submission), which is mostly ops/policy. Prior: buy-list CSV
import; #23 decks (#51 + #52); v2 UX wave)._

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

## v2 UX wave (2026-06-27)

A round of UX issues (#21-#32) was scoped from a codebase review. Shipped as a
stack of squash-merged PRs (#33, #34, #38, #39, #40, #41), each reviewed
(Copilot) with fixes applied:

- **#21 Dark mode** (#33) - `lib/theme/` token system (`colors.ts` light/dark
  palettes + `ThemeContext.tsx` `ThemeProvider`/`useTheme()`), applied across
  every screen/component via `createStyles(colors)` factories; themed nav chrome
  + status bar. The mode override (`system`/`light`/`dark`) persists in
  secure-store.
- **#22 + #29 List UX** (#34) - transaction rows tap through to card detail;
  shared `components/ErrorState.tsx` (message + Retry) and pull-to-refresh on
  Browse / Inventory / Transactions / Set detail / Portfolio.
- **#26 Account/Settings** (#38) - `app/account.tsx` (reached from a header
  person icon): profile (`GET /user`), appearance toggle, confirmed sign-out,
  **in-app account deletion** (`DELETE /user`, double-confirmed - satisfies the
  App Store requirement in #20). Plus the **#25** client slice: `AuthContext`
  tracks `sessionExpired` and the sign-in screen shows a notice on a 401.
- **#24 + #28 Inventory** (#39) - multi-select **bulk add** from set detail
  (`components/BulkAddBar.tsx`, `bulkAddToInventory` reads current qty then
  writes `current + delta` so the absolute-quantity API doesn't clobber);
  inventory **search / finish-filter / sort** + a distinct-card/qty/value
  summary (auto-pages the full list so totals are complete).
- **#27 Edit/delete transactions** (#40) - long-press a row for Edit/Delete;
  the log form doubles as the edit form (`id` param -> `PUT`; type/finish locked
  since the update DTO omits them); `updateTransaction`/`deleteTransaction`.
- **#30 Price history** (#41) - `components/CardPriceHistory.tsx` on card detail:
  range + finish toggles and a **dependency-free** bar chart (plain Views, no
  `react-native-svg`) off the typed `GET /cards/{cardId}/price-history`.

**All v2 feature issues are shipped** (see "Cross-repo backend dependencies").
Merged: **#25 persistent login** (#47), **#31 buy-list** (#48) + CSV import (#53),
**#32 price alerts + notifications + push** (#49/#50/#54, backend fan-out #560),
and **#23 decks** (#51 list/create/import/detail/edit + missing-cards; #52
add-card-via-search). With #23 the **tab bar is now the 4 core surfaces**
(Browse/Inventory/Transactions/Portfolio); Buy-list, Decks, and Price alerts live
in the **account menu** (header person icon → MANAGE). **Remaining mobile work is
distribution**: #8 (Android / Play internal) and #20 (iOS public submission) -
mostly ops/policy, not feature code.

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

## Buy-list (#31) notes

Want-list backed by `/api/v1/buy-list` (GET list / POST add-increment / PATCH
set-absolute-quantity where 0 removes / DELETE / POST import), all typed after
backend #557. Mirrors inventory: `lib/api/buyList.ts` (`fetchBuyList` /
`setBuyListQuantity` / `removeFromBuyList` / `importBuyList`), query key
`["buy-list"]`. The list endpoint is **not** paginated (returns the whole list),
so the screen uses a plain `useQuery`.

UI: a **Buy-list** screen (`app/buy-list.tsx`) with an optimistic stepper +
remove (`BuyListListItem`, rows link to card detail) and a distinct-card /
wanted-qty / value summary; add from card detail via `AddToBuyList` (per-finish
steppers seeded from the shared `["buy-list"]` cache). It **used to be a tab**;
#23 moved it off the tab bar into the **account menu** (it's now a stack screen,
not under `app/(tabs)/`).

**CSV import (built):** the Buy-list screen's header **Import** button opens
`app/buy-list-import.tsx` (modal) - paste a CSV (`POST /api/v1/buy-list/import`,
`BuyListImportApiDto.text`; native header `name,set_code,number,quantity,foil`,
external Moxfield/Archidekt/Deckbox/TCGPlayer exports auto-detected). Shows the
saved count + any per-line errors, then invalidates `["buy-list"]`.

Heads-up: `/cards/{cardId}/buylist` is vendor sell-to *pricing*, not the
want-list - don't confuse the two. (The deck `missing-to-buy-list` action shipped
with #23 - see Decks notes.)

## Price alerts + notifications (#32) notes

Split along the backend-readiness seam:

- **Notifications (built):** `GET /api/v1/notifications` (paginated),
  `PATCH /api/v1/notifications/{id}/read`, `PATCH /api/v1/notifications/read-all` - all typed
  after backend #562. `lib/api/notifications.ts` + a shared `lib/useNotifications.ts`
  hook that auto-pages the list so the unread count is exact; one
  `["notifications"]` cache feeds the inbox (`app/notifications.tsx`) and the
  header `NotificationBell` badge. `unread-count` endpoint is intentionally
  unused (it's untyped `content?: never`; the badge derives from the loaded list).
- **Price alerts (built):** backend **#563** typed `CreatePriceAlertDto` /
  `UpdatePriceAlertDto` (were `Record<string, never>`). `lib/api/priceAlerts.ts`
  (`fetchPriceAlerts` / `createPriceAlert` / `updatePriceAlert` /
  `deletePriceAlert`), query key `["price-alerts"]`; the list endpoint is **not**
  paginated. `components/CardPriceAlert.tsx` on card detail sets a new alert
  (Rise %/Fall % inputs, at least one required) or shows + removes the existing
  one; `app/price-alerts.tsx` (reached from the **account** screen's "Price
  alerts" row) lists all alerts with pause/resume (`isActive` via PATCH) + delete
  and taps through to the card. The alert model is **percent thresholds**
  (`increasePct` / `decreasePct`), not the absolute "target price" the issue text
  describes. The unread bell + inbox (#49) surface alert firings.
- **Push delivery (end-to-end):** both halves shipped. **Client** (#54):
  `expo-notifications` + `expo-device` (`expo-notifications` config plugin in
  `app.json`); `lib/push.ts` requests permission, gets the Expo push token (via
  the EAS `projectId`), and registers/unregisters it with `lib/api/devices.ts`
  (`POST`/`DELETE /api/v1/notifications/devices`). `lib/usePushNotifications.ts`
  (called from `app/_layout.tsx`, gated on auth) registers on sign-in, invalidates
  `["notifications"]` on receipt, and routes a tapped notification to the card
  (when the payload carries `setCode`/`cardNumber`) or the inbox; every sign-out
  path resets the registration best-effort. **Backend** (`i-want-my-mtg` #560):
  `PriceAlertService.processAlerts` fans a push to the user's devices via the Expo
  Push API and prunes dead tokens. **Caveat:** no-ops in Expo Go / simulators
  (`Device.isDevice` guard) - **a real device needs an EAS dev build + APNs/FCM
  credentials** to actually receive pushes (that's the only remaining step, and
  it's operational, not code).

## Decks (#23) notes

Full deck API was already typed (no backend dep needed): `GET/POST /decks`,
`GET/PATCH/DELETE /decks/{id}`, `POST /decks/import`, `POST/PATCH/DELETE
/decks/{id}/cards`, `POST /decks/{id}/missing-to-buy-list`. Data layer
`lib/api/decks.ts`; query keys `["decks"]` (summaries) and `["deck", id]`
(detail, embeds `cards`). The deck-card write is an **absolute-quantity** upsert
keyed by `cardId` + `isSideboard` (quantity 0 removes), same shape as inventory /
buy-list.

**Part 1 (this PR):**
- `app/decks.tsx` - deck list (name · format · count · value), header **+** opens
  create/import.
- `app/deck/new.tsx` - **create** (name + format chips) or **import** (paste
  decklist → `/decks/import`). Doubles as the **edit** form when pushed with an
  `id` param (PATCH name/format), mirroring `transaction/new`'s create/edit reuse.
- `app/deck/[id].tsx` - detail via `SectionList` (Main / Sideboard), optimistic
  quantity steppers (drop at 0), per-row legality flag (`legalInFormat === false`)
  + illegal-count banner, **Edit**/**Delete**, and the **missing-cards view**: it
  cross-references `GET /inventory/quantities` (owned = normal+foil) to filter to
  cards you don't fully own, plus an **"Add missing to buy-list"** action
  (`/decks/{id}/missing-to-buy-list`, invalidates `["buy-list"]`).

**Part 2 (built):** `app/deck/add.tsx` (modal, opened from the deck detail
**+ Add cards** button) - Main/Sideboard toggle + debounced card search
(`searchCards`), tap **Add** to `addDeckCard` (`POST /decks/{id}/cards`
add-increment) with optimistic per-card "Added ×N" feedback; invalidates
`["deck", id]` + `["decks"]`.

**Format enum** (from `DeckCreateApiDto`): standard / commander / modern / legacy
/ vintage / brawl / explorer / historic / oathbreaker / pauper / pioneer (omit for
no format).

## Distribution: issue #8

**iOS is done (2026-06-24):** the app builds on EAS and ships to TestFlight.
One-time setup landed in PR #18 - App ID `com.matthewdtowles.iwantmymtg`, App
Store Connect app `6784075307` (pinned as `submit.production.ios.ascAppId` in
`eas.json`), signing certs/profile + an App Store Connect API key (the `.p8`
secret stays on EAS servers, never in the repo), and
`ios.infoPlist.ITSAppUsesNonExemptEncryption: false` in `app.json` to skip the
per-build encryption-compliance prompt. Expo account: **mtengineer**.

Cutting a new TestFlight build is one command (interactive Apple login the first
time): `npm run ship:ios` (`scripts/ship-ios.sh`). It sanity-checks a clean
`main`, syncs `app.json`'s `version` from the latest git tag (committing that
bump), typechecks, then `eas build --auto-submit` -> TestFlight. EAS uses
`appVersionSource: local` with `production.autoIncrement`, so it bumps the
`buildNumber` in `app.json` during the build; **commit that bump after shipping**
(the script does not - e.g. build 2 was committed by hand) so the next ship
increments from the right number.

**Merging to `main` does NOT build or ship anything** - CI only tags a version
(no `eas build`/`eas submit` in the workflow). And `eas submit` (via `ship:ios`)
reaches
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
- `lib/auth/` - `AuthContext` (`useAuth()`, incl. `sessionExpired`), token in
  `expo-secure-store`. `signOut` clears `tokenRef` synchronously; a 401 only
  flags expiry when a token was present. Sign-up opens web `/user/create`.
- `lib/theme/` - `colors.ts` (light/dark `ThemeColors` palettes) +
  `ThemeContext.tsx` (`ThemeProvider`/`useTheme()`; persists the mode override).
  Components read tokens via a `createStyles(colors)` factory + `useMemo`.
- `lib/api/user.ts` - `fetchProfile` / `deleteAccount`.
- `lib/images.ts` - card images: `https://cards.scryfall.io/{size}/front/{imgSrc}`.
- `app/` - expo-router routes: `(tabs)` shell (4 core tabs), `sign-in`,
  `account` (the **menu hub** - MANAGE links to Decks / Buy-list / Price alerts),
  `set/[code]`, `card/[setCode]/[number]`, `transaction/new` (create + edit),
  `buy-list`, `buy-list-import` (CSV modal), `notifications`, `price-alerts`,
  `decks`, `deck/[id]`, `deck/new` (create / import / edit), `deck/add` (search).
- `components/` - shared UI incl. `ErrorState` (message + Retry), `BulkAddBar`
  (multi-select add), `CardPriceHistory` (dependency-free bar chart),
  `CardListItem` (optional discriminated-union selection mode).

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
- EAS uses `appVersionSource: local`: `ship:ios` writes the latest git tag into
  `app.json`'s `version`, and `production.autoIncrement` bumps the `buildNumber`
  there each build (commit it after shipping - see Distribution).
- iOS EAS build/submit is set up (see Distribution above); Android is not.

## Cross-repo backend dependencies (backend hand-off)

The backend deps (`matthewdtowles/i-want-my-mtg`) that blocked the remaining
features have **all merged** (2026-06-28). Each was tracked as a mobile issue:

- **#35 - refresh token / long-lived session.** Done - backend PR #558. Unblocks
  the **#25** core.
- **#36 - OpenAPI annotations (`ApiOkEnvelope` + request DTOs).** Done - backend
  PR #557 (deck + buy-list responses), #562 (price-alert + notification
  responses; the latter were missed by #557 and still serialized as
  `content?: never`), and #563 (price-alert **request** DTOs - `CreatePriceAlertDto`
  / `UpdatePriceAlertDto` were `Record<string, never>`). Unblocks **#23 / #31 / #32**.
- **#37 - push device registration.** Done - backend PR #559
  (`POST/DELETE /api/v1/notifications/devices`). The Expo Push **fan-out** on
  alert firing also shipped (backend #560 / PR #565), so push is end-to-end.

**Verification loop (now that the backend has landed):** once the backend is
deployed, here run `npm run gen:api` -> the previously-`content?: never`
operations (decks, buy-list, price-alerts, notifications, refresh) gain typed
responses -> build the corresponding mobile feature. CI fails on `schema.ts`
drift, so regenerate + commit when the spec changes. The mobile `gen:api`
pulls the **live** spec (`https://iwantmymtg.net/api/openapi.json`) by default,
so the types only appear after deploy (override with `OPENAPI_URL` for a local
backend).
