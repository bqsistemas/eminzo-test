# eminzo-test

A small TypeScript base: a Node.js service with one status query (`GET /api/status`) and a web
panel that shows whether the service is working. The service and the panel share the type of that
response (`src/shared/status.ts`), so changing it fails the panel's type check until the panel
adapts.

## Requirements

- Node.js 24, the major in `.nvmrc`. `engines` in `package.json` and `engine-strict` in `.npmrc`
  make npm refuse any other major. With nvm: `nvm use`.
- npm, which comes with Node.js.

## Install

```sh
npm ci
npm run browser:install   # once, needs the network: downloads Chromium
```

`npm run browser:install` puts Chromium in Playwright's per-user cache, outside the repo. It needs
no system packages and no `sudo`.

## Run

Two processes, each in its own terminal:

```sh
npm run dev:server   # the service on http://127.0.0.1:3000, restarted on file changes
npm run dev:web      # the panel on http://127.0.0.1:5173, with /api proxied to the service
```

Then open <http://127.0.0.1:5173>. Both processes listen on loopback only, and the browser sees a
single origin (the Vite dev server), so the service sends no CORS headers.

Ports come from environment variables. `SERVICE_PORT` (default 3000) is read by both processes:
the service listens on it and the panel's proxy forwards to it. `WEB_PORT` (default 5173) is the
panel's port. A value that is not an integer from 1 to 65535 stops the process with an error.

```sh
SERVICE_PORT=3100 npm run dev:server
SERVICE_PORT=3100 WEB_PORT=5200 npm run dev:web
```

## Check

- `npm run verify`: the full review. It runs lint, typecheck, test and build in that order and
  stops at the first failure.
- `npm run lint`: Biome lint and format check; it never writes.
- `npm run format`: applies Biome's formatting and safe fixes.
- `npm run typecheck`: TypeScript for the service, the panel and the tests, each with its config.
- `npm test`: the Vitest suite.
- `npm run build`: the panel bundle in `dist/web` and the service JavaScript in `dist/server`.
- `npm run test:browser`: the Playwright tests in a real Chromium (`test/browser/*.spec.ts`). It
  starts the service and the panel itself on free loopback ports (never 3000 or 5173), checks the
  panel with the service running and with it down, and stops everything when it ends, whether the
  tests pass or fail. Run `npm run browser:install` once first. It is not part of `npm test` or
  `npm run verify`.

The software factory's gate runs `factory/checks.sh`: `npm ci`, then lint, typecheck, test and
build, then `npm run browser:install` and `npm run test:browser`, each as its own step. The two
browser steps need the network the first time, to download Chromium, so the gate rejects a change
when the browser tests fail.
