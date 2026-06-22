# I Want My MTG - Mobile

Cross-platform (iOS + Android) mobile app for [I Want My MTG](https://github.com/matthewdtowles/i-want-my-mtg), built with React Native + Expo. It talks to the existing `/api/v1` backend; there is no separate mobile server.

See Phase 7.1 in the web repo's `ROADMAP.md` for the plan and decisions.

## Stack

- **Expo** (managed) + **React Native**, TypeScript
- **expo-router** - file-based navigation (`app/`)
- **TanStack Query** - server state
- Auth (later): JWT bearer token in `expo-secure-store`
- API client (later): generated from the backend OpenAPI spec

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
