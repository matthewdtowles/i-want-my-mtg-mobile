# Handoff / dev state

Where the build stands and how to pick it up.

**All feature work (v1 + v2) is shipped. The only remaining work is the two
public store releases — [`GO-LIVE.md`](GO-LIVE.md) is the single source of
truth for that.** This file is the reference for what exists and how to work
on it. _Last updated: 2026-07-04._

## What this is

Cross-platform (iOS + Android) mobile app for I Want My MTG. React Native +
Expo (SDK 56), TypeScript, expo-router, TanStack Query. It consumes the
existing `https://iwantmymtg.net/api/v1` backend — there is no separate mobile
server. Backend/API repo: `i-want-my-mtg` (overall plan: its `ROADMAP.md`
§7.1). Cross-repo progress: the "I Want My MTG" GitHub project board.

## Shipped

Everything below is done, merged, and live in the beta channels (iOS
TestFlight 2026-06-24; Android Play closed testing/Alpha 2026-07-02).

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
- Tab bar = 4 core surfaces (Browse/Inventory/Transactions/Portfolio);
  Buy-list/Decks/Price alerts live in the account menu

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
- **Notifications:** unread badge derives from the auto-paged list
  (`lib/useNotifications.ts`); the `unread-count` endpoint is untyped and
  intentionally unused.
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
  `expo-secure-store`. Sign-up opens web `/user/create` (email verification
  lives there).
- `lib/theme/` — `colors.ts` light/dark palettes + `ThemeContext`; components
  use `createStyles(colors)` factories.
- `lib/push.ts` + `lib/usePushNotifications.ts` — Expo push registration
  (gated on auth), notification tap-routing.
- `app/` — expo-router routes: `(tabs)` shell (4 core tabs), `sign-in`,
  `account` (menu hub → Decks / Buy-list / Price alerts), `set/[code]`,
  `card/[setCode]/[number]`, `transaction/new` (create + edit), `buy-list`,
  `buy-list-import`, `notifications`, `price-alerts`, `decks`, `deck/[id]`,
  `deck/new` (create / import / edit), `deck/add`.
- `components/` — shared UI incl. `ErrorState`, `BulkAddBar`,
  `CardPriceHistory` (dependency-free bar chart), `CardListItem`.

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
- **Validate before a PR:** `npm run typecheck` and `npx expo export`. Booting
  on a simulator/emulator still needs a manual smoke test.

## Known gaps / deferred

- Per-card **legality** is not in the API card response (only a search
  filter); card detail can't show it without a backend change.
- Android `eas submit` is blocked on creating a Play service-account key —
  `GO-LIVE.md` §1 fixes this permanently.
- EAS Update (OTA) was never set up — JS-only fixes require a full store
  build.
- Deferred analytics: portfolio `/history`, `/performance`, `/cash-flow`,
  `/breakdown` endpoints are typed but unbuilt.
