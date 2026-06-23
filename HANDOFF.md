# Handoff / dev state

Where the v1 build stands and how to pick it up. See the web repo's
`ROADMAP.md` §7.1 for the overall plan.

_Last updated: 2026-06-23._

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
- generated-types cleanup - **in review** (#14)
- #5 inventory (view / add / edit / finish) - **next, not started**
- #6 transactions (log buy/sell + history) - not started
- #7 portfolio overview - not started
- #8 distribution (TestFlight + Play internal) - not started

## Next: issue #5 (inventory)

Builds on the typed client. Relevant endpoints (typed in the spec):

- `GET /api/v1/inventory` -> `InventoryItemApiDto[]` (paginated; sort keys via the inventory sort set)
- `POST /api/v1/inventory` (201) add `InventoryRequestApiDto[]` -> `InventoryItemApiDto[]`
- `PUT /api/v1/inventory` update -> `InventoryItemApiDto[]`
- `DELETE /api/v1/inventory/:id` -> `{ deleted: boolean }`
- `GET /api/v1/inventory/quantities?cardIds=` -> `InventoryQuantityApiDto[]`

Inventory requires auth (the app already sends the bearer token). Follow the
browse pattern: typed helpers in `lib/api/` over `api.GET/POST`, screens use
`useInfiniteQuery`/`useQuery`, fill in the `app/(tabs)/inventory.tsx` placeholder,
reuse `CardThumb` / `CardListItem` / `formatPrice`. Check the
`InventoryItemApiDto` shape in `lib/api/schema.ts` for whether it embeds card
fields or just a `cardId` (may need to join card data).

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
- EAS build/submit (issue #8) is not set up; `eas.json` exists (managed workflow,
  `autoIncrement` on production).
