# Handoff / dev state

Where the build stands and how to pick it up.

**The app is public on both stores.** iOS went live with **0.20.2**
(2026-07-21) after clearing a Guideline 3.1.1 rejection; Google Play production
was submitted and approved. Work is now ordinary version-over-version
improvement — current build **0.26.0**. This file is the reference for what
exists and how to work on it. _Last updated: 2026-07-29._

## What this is

Cross-platform (iOS + Android) mobile app for I Want My MTG. React Native +
Expo (SDK 56), TypeScript, expo-router, TanStack Query. It consumes the
existing `https://iwantmymtg.net/api/v1` backend — there is no separate mobile
server. Backend/API repo: `i-want-my-mtg` (overall plan: its `ROADMAP.md`
§7.1). Cross-repo progress: the "I Want My MTG" GitHub project board.

## Shipped

Everything below is done, merged, and publicly released. It reached the beta
channels first (iOS TestFlight 2026-06-24; Android Play closed testing/Alpha
2026-07-02), then both public stores in July 2026.

**v1 (#1–#8):**
- Scaffold, generated OpenAPI client + CI drift check, auth (JWT in
  secure-store), CI versioning (#9–#12, #14)
- Browse: sets / search / set detail / card detail (#13)
- Inventory: list + optimistic steppers, add from card detail (#5)
- Transactions: log buy/sell + history (#6) — later extended with edit/delete (#40)
- Portfolio overview (#7)
- Distribution to both beta channels (#8; iOS PR #18)

**v2 UX wave (#21–#32 → PRs #33/#34/#38/#39/#40/#41):**
- Dark mode: `lib/theme/` tokens + persisted override (#33)
- List UX: tap-through rows, shared `ErrorState`, pull-to-refresh everywhere (#34)
- Account/Settings screen: profile, appearance, sign-out, **in-app account
  deletion** (App Store requirement), session-expired notice (#38)
- Inventory: bulk add from set detail, search/filter/sort + value summary (#39)
- Edit/delete transactions (#40); price-history chart on card detail (#41)

**v2 features (#25/#31/#32/#23):**
- Persistent login via refresh token (#47)
- Buy-list + CSV import (#48, #53)
- Price alerts + notifications inbox/badge + **push end-to-end** (#49/#50/#54;
  backend fan-out `i-want-my-mtg` #560)
- Decks: list/create/import/detail/edit, missing-cards → buy-list,
  add-card-via-search (#51, #52)

**July 2026 UX overhaul (#86–#92, #94):**
- Public browsing (no sign-in wall), Settings screen, real server-side
  pagination (#86)
- Home = art-backed set gallery over a signed-in collection hero (#87)
- Set pages default to a 3-up binder grid with a list toggle; press-and-hold
  peeks the card (#88 — added `expo-haptics`)
- Search everywhere + interactive price-history chart (#89); style polish (#90)
- Inventory finish chips filter server-side (#91, needs backend #611)
- Browse set search/sort, collection binder grid + group-by-set, chart area
  fill, launch screen (#94 — added `expo-splash-screen`; removed the
  cards-per-page setting in favor of a fixed 50)

**Navigation (current):** tab bar is **Browse / Inventory / Decks / Watchlist**.
Watchlist is buy-list + price alerts behind a segmented control
(`app/(tabs)/watchlist.tsx`). Transactions and Portfolio are pushed routes,
reached from the hub buttons at the top of Inventory. Account, Settings,
Notifications sit under the header person icon.

**Backend deps** (all merged in `i-want-my-mtg`, 2026-06-28): refresh tokens
(#558), OpenAPI annotations (#549/#550/#557/#562/#563), push device
registration + Expo fan-out (#559/#560). When the backend spec changes:
deploy → `npm run gen:api` → commit `schema.ts` (CI fails on drift).

**Release plumbing:** single-source versioning — git tag via `app.config.ts`,
build numbers remote on EAS (38bd17c); ship scripts submit via `eas.json`
profiles (#61); Android card images fixed via `expo-image` + custom User-Agent
(6dec2e3 — Scryfall's CDN rejects the default okhttp UA).

## API gotchas (read before touching a feature)

- **Absolute-quantity upserts everywhere:** inventory, buy-list, and
  deck-cards writes all set an absolute quantity keyed by card+finish (or
  card+isSideboard); quantity 0 removes the row. Inventory `POST` and `PATCH`
  are server-identical, so `lib/api/inventory.ts` uses one `saveInventory`.
  Bulk add therefore reads current qty and writes `current + delta`.
- **Transactions sync inventory server-side** (unless `skipInventorySync`) —
  creating one invalidates both `["transactions"]` and `["inventory"]`. The
  update DTO omits type/finish, so those are locked in the edit form.
- **Portfolio:** `GET /portfolio` returns `null` until first computed (screen
  shows a "Calculate" action); `POST /portfolio/refresh` is rate-limited
  ~1/hour and the 429 must surface (alert), not fail silently.
- **Buy-list ≠ `/cards/{cardId}/buylist`** — the latter is vendor sell-to
  pricing. Buy-list and price-alert list endpoints are **not** paginated.
- **Notifications:** the bell badge uses the `unread-count` endpoint; the
  inbox paginates on scroll (`lib/hooks/useNotifications.ts`).
- **Price alerts are percent thresholds** (`increasePct`/`decreasePct`), not
  absolute target prices.
- **Push no-ops in Expo Go / simulators** (`Device.isDevice` guard) — real
  pushes need an EAS build on a physical device.
- **Card images:** browse returns an `imgSrc` tail, inventory a full URL —
  `cardImageUrl` normalizes both (`lib/images.ts`).
- **Deck format enum** (from `DeckCreateApiDto`): standard / commander /
  modern / legacy / vintage / brawl / explorer / historic / oathbreaker /
  pauper / pioneer (omit for none).

## Architecture / key files

- `lib/api/schema.ts` — **generated** (`npm run gen:api`) from the backend
  OpenAPI spec (live by default; `OPENAPI_URL` overrides). Committed; CI fails
  on drift. Do not hand-edit.
- `lib/api/client.ts` — typed `openapi-fetch` client. Bearer token via
  `setAuthTokenGetter`; signs out on 401 via `setOnUnauthorized`.
- `lib/api/types.ts` — aliases over generated `components["schemas"][...]`.
- `lib/api/*.ts` — typed request helpers per domain (catalog, inventory,
  transactions, portfolio, buyList, decks, priceAlerts, notifications,
  devices, user).
- `lib/auth/` — `AuthContext` (`useAuth()`, incl. `sessionExpired`), token in
  `expo-secure-store`. Sign-up is native (`signUpRequest.ts` →
  `/api/v1/auth/register`, verification deep-links back into the app).
- `lib/hooks/` — domain data hooks (`useInventoryQuantities`, `useBuyList`,
  `usePriceAlerts`, `useNotifications`) own query keys, fetching, and
  optimistic mutations so components stay presentational.
- `lib/useOptimisticMutation.ts` — the optimistic-mutation convention in one
  place: cancel/snapshot/rollback, an error `Alert` on every failure, and
  settle-time invalidation declared per call site.
- `lib/theme/` — `colors.ts` light/dark palettes + `ThemeContext`; components
  use `createStyles(colors)` factories via `useThemedStyles`.
- `lib/push.ts` + `lib/usePushNotifications.ts` — Expo push registration
  (gated on auth), notification tap-routing.
- `app/` — expo-router routes: `(tabs)` shell (`index` Browse, `inventory`,
  `decks`, `watchlist`), `sign-in`, `sign-up`, `user/verify`, `account`,
  `settings`, `privacy`, `set/[code]`, `card/[setCode]/[number]`,
  `transaction/new` (create + edit), `transactions`, `portfolio`,
  `buy-list-import`, `notifications`, `deck/[id]`, `deck/new` (create /
  import / edit), `deck/add`. Buy-list and price alerts have no routes of
  their own — they render as views inside `watchlist`.
- `components/` — shared UI incl. `ErrorState` (full + `inline` variants),
  `QuantityStepper`/`FinishStepper`, `SegmentedControl`, `Chip`, `SearchField`,
  `CardPanel` (card-detail section chrome), `CardQuantityRow`, `BulkAddBar`,
  `CardPriceHistory` (dependency-free SVG chart), `CardListItem`.
  Grid/gallery surfaces: `SetTile` + `SetPeekOverlay` (home), `CardGridCell` +
  `CardPeekOverlay` (set binder), `InventoryGridCell` (collection binder),
  `CollectionHero`, `SetSymbol`, `CardThumb`.
- `lib/inventoryEntries.ts` — flattens the inventory into header/row entries so
  one `FlatList` can render set-grouped section headers *and* a multi-column
  grid (neither `SectionList` nor `numColumns` can do both). Unit-tested.
- `lib/pagination.ts` — `nextPage`/`mapPageItems` helpers plus `PAGE_SIZE`, the
  fixed 50-row page size every long list uses.
- Edit screens (`transaction/new`, `deck/new`) take only an `id` param and
  read the entity from the query cache (deck edit falls back to a fetch).

## Conventions

- **Branch per issue.** Stack only on an unmerged dependency; after the parent
  merges (squash), rebase the child onto main and force-push with
  `--force-with-lease`.
- **Commit/PR titles** use a conventional prefix — the **PR title drives CI
  versioning** (`feat:` → minor, `!` → major, else patch).
- **`package.json` version stays `0.0.0-dev`** — git tags are the source of
  truth; `app.config.ts` resolves the version at build time and EAS manages
  build numbers remotely. Nothing version-related is ever committed.
- **Install with `legacy-peer-deps`** (configured in `.npmrc`).
- **Validate before a PR:** `npm run typecheck`, `npm run lint`, `npm test`
  (node:test over `lib/**/*.test.ts`). Booting on a simulator/emulator still
  needs a manual smoke test — `expo start --web` cannot stand in for it, since
  `expo-secure-store` is native-only.
- **Releasing:** `npm run ship:ios` (→ TestFlight) and
  `npm run ship:android [internal|alpha]` (→ Play testing tracks). Both require
  a clean `main` and read the version from the highest SemVer git tag. Public
  releases are a separate manual Submit-for-Review in each console. The Play
  service-account key lives at `./play-service-account.json` (gitignored).

## Next up (as of 2026-07-29)

Ordered. The full cross-repo board lives in `i-want-my-mtg` → `ROADMAP.md` → **Now**.

1. **#101 — adopt `coverImgSrc` on the set list.** `SetTile.tsx:35` still fetches a
   card per tile, so Browse costs **51 requests**; the backend field shipped in
   backend #615 and is live. Start with `npm run gen:api` — `lib/api/schema.ts` has
   no `coverImgSrc` yet, so nothing compiles against it until that runs. Keep
   `cardImageUrl(..., "art_crop")`: the **set** field is an image *tail*, while the
   **deck** field is an absolute URL. Highest-value item in this repo.
2. **#96 — sort Browse by set value.** No backend work; one entry in `SET_SORTS`
   (`app/(tabs)/index.tsx:47`) and a wider `SetSort` union.
3. **#95 — group Browse by block.** `?group=block` already exists. Note the server
   **silently drops grouping when `sort` or a search term is set**, so grouping has
   to be mutually exclusive with the #96 chip and the search box in the UI.
4. **#97 — filter Browse to owned sets.** Deferred: the only mobile item needing
   backend work (`ownedTotal` is computed after pagination), and it is worth doing
   only if the list still feels unwieldy after 1–3.

## Known gaps / deferred

- Per-card **legality** is not in the API card response (only a search
  filter); card detail can't show it without a backend change.
- EAS Update (OTA) was never set up — JS-only fixes require a full store
  build. Native modules make this stricter still: `expo-haptics` (#88) and
  `expo-splash-screen` (#94) can only arrive in a fresh binary.
- **Backend #612** — the API intermittently 503s under load, often enough to
  break the Browse screen. Server-side, but it is the app's most visible
  problem post-launch. Now an umbrella; the fixes are backend #621 (CloudFront
  caches nothing on `/api/*`) and backend #622 (`trust proxy` unset, so the
  60/min limit is shared per CloudFront POP — anonymous callers only, which is
  what public Browse is). The client half is #101 above.
- Deferred analytics: portfolio `/history`, `/performance`, `/cash-flow`,
  `/breakdown` endpoints are typed but unbuilt.
