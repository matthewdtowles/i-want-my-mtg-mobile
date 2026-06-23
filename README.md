# I Want My MTG - Mobile

Cross-platform (iOS + Android) mobile app for [I Want My MTG](https://github.com/matthewdtowles/i-want-my-mtg), built with React Native + Expo. It talks to the existing `/api/v1` backend; there is no separate mobile server.

See Phase 7.1 in the web repo's `ROADMAP.md` for the plan and decisions.

## Stack

- **Expo** (managed) + **React Native**, TypeScript
- **expo-router** - file-based navigation (`app/`)
- **TanStack Query** - server state
- **Auth**: JWT bearer token in `expo-secure-store`; sign-in via `POST /api/v1/auth/login`
- **API client**: typed, generated from the backend OpenAPI spec (`openapi-typescript` + `openapi-fetch`)

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

The tab screens are placeholders today; each is filled in by its own v1 issue.

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

