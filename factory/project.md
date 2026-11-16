# Project context

Every factory agent reads this before working. Keep it short and current: agents use
it as a map instead of searching the repo. The builder updates it in the same branch
when a change alters the stack, the commands or the modules; the gate flags a
`Module map` that misses added or moved files.

## Snapshot

- 2026-11-15, after job 003 (project base: service, panel, shared contract, real checks).
- `eminzo-test` is a repository used to exercise the Eminzo software factory. It now holds a
  TypeScript base: a Node.js service with one status query, a web panel that shows it, a type
  contract shared by both, tests, and a `factory/checks.sh` that really checks every change.

## Product and functional context

- Confirmed: one end-to-end flow. The panel (`src/web/`) queries `GET /api/status` once when the
  page opens and shows one of three states: checking (loading), working, unavailable. The service
  (`src/server/`) answers `{ "status": "ok" }`. The route and the body shape live in one module,
  `src/shared/status.ts`; the service implements it and the panel consumes and validates it.
- Confirmed: no authentication, persistence, other routes or screens, periodic refresh, retry,
  deployment, containers or CI workflow. The built panel is not served in production.
- Unknown: the product the project will become, its users/actors, domain concepts, business rules
  and external integrations. Take them only from a job's `issue.md` and `spec.md`; never invent
  product scope beyond what a job asks for.
- The factory: GitHub issues labeled `factory` become jobs that end as pull requests against
  `origin/main`.

## Stack

- Runtime: Node.js 24 (LTS), pinned by `.nvmrc` (`24`) and `engines.node` (`^24.11.0`) in
  `package.json`; `.npmrc` sets `engine-strict=true`, so npm refuses another major.
- Package manager: npm, one package (no workspaces), `package-lock.json` committed.
  `.npmrc` sets `save-exact=true`.
- Language: TypeScript 7 (`typescript` 7.0.2, the native compiler), strict, ES modules
  (`"type": "module"`), `erasableSyntaxOnly`, relative imports with the `.ts` extension. In
  development the service runs from source with Node's native type stripping (no `tsx`).
- Only `devDependencies`, all exact: Vite 8.3.8 (panel dev server and bundle), Vitest 5.1.0
  (tests), Biome 2.6.8 (lint and format), happy-dom 21.0.4 (DOM for the panel tests only),
  `@types/node` 24.19.2. No runtime dependency: the service uses `node:http` only.
- Factory tooling (not part of the product): `eminzo` CLI, engine range `0.2.x` in
  `factory/config.json`; `git` and `gh` for branches and pull requests.

## Commands

- Install: `npm ci` (Node.js 24 must be the `node` in `PATH`; with nvm, `nvm use`).
- Run: two processes, each in its own terminal. `npm run dev:server` starts the service from
  source in watch mode on `127.0.0.1:$SERVICE_PORT` (default 3000). `npm run dev:web` starts the
  Vite dev server on `127.0.0.1:$WEB_PORT` (default 5173, `strictPort`) and proxies `/api` to
  `127.0.0.1:$SERVICE_PORT`, so set the same `SERVICE_PORT` for both. An invalid port (not an
  integer from 1 to 65535) stops the process with an error.
- Lint: `npm run lint` (Biome check, never writes); `npm run format` applies the fixes.
- Typecheck: `npm run typecheck` (`tsc` with `tsconfig.server.json`, `tsconfig.web.json` and
  `tsconfig.test.json`, no emit).
- Test: `npm test` (`vitest run`). One test file alone: `npx vitest run <path>`.
- Build: `npm run build` (panel bundle in `dist/web`, service JavaScript in `dist/server`).
- Verify: `npm run verify` runs lint, typecheck, test and build in that order and stops at the
  first failure.
- Gate: `factory/checks.sh` in full mode runs `npm ci --ignore-scripts --no-audit --no-fund`,
  then lint, typecheck, test and build as separate steps; the first failure stops it with a
  non-zero exit. It uses the `node` and `npm` in the gate's `PATH`: that must be Node.js 24, or
  `npm ci` stops with `EBADENGINE`. It needs the network for `npm ci`.

## Module map

One line per module or folder: its path in backticks, then what it does. Use a folder
(`src/`) or a glob (`lib/*`, `office*.js`) to cover a group. Keep it complete: the gate
flags files a job adds or moves that no line mentions.

- `src/shared/status.ts`: the status contract: `STATUS_PATH`, `StatusResponse` and the
  `isStatusResponse` runtime guard. No Node or DOM imports; both type checks compile it.
- `src/server/app.ts`: `createApp()`, the `node:http` server (not listening): `GET /api/status`
  answers 200 JSON, another method 405 with `Allow: GET`, any other path 404; no CORS headers.
- `src/server/main.ts`: service entry point: reads `SERVICE_PORT`, listens on `127.0.0.1`,
  closes cleanly on SIGINT and SIGTERM.
- `src/server/port.ts`: `readPort()` and the loopback host and default ports, shared by
  `src/server/main.ts` and `vite.config.ts`.
- `src/web/index.html`: the panel page, with the `#service-status` live region.
- `src/web/styles.css`: the panel styles.
- `src/web/status.ts`: `loadStatus()` (never rejects, validates the body), `renderStatus()`
  (text only, `data-state`) and `mountStatus()`.
- `src/web/main.ts`: panel entry: mounts the status region.
- `src/**/*.test.ts`, `test/`: Vitest tests (service, panel, contract mutation with `tsc`,
  `factory/checks.sh` with a fake `npm`, docs and manifest).
- `package.json`: manifest: engines, exact `devDependencies` and the scripts above.
- `package-lock.json`: npm lockfile.
- `.npmrc`: `engine-strict=true`, `save-exact=true`.
- `.nvmrc`: the pinned Node.js major.
- `tsconfig*.json`: `tsconfig.json` holds the shared compiler options and references the
  service, panel and test configs.
- `biome.json`: Biome lint and format; skips `dist/`, `node_modules/`, `.worktrees/`,
  `factory/jobs/`, tool-managed files (`factory/config.json`, `.claude/`, `.atl/`) and Markdown.
- `vite.config.ts`: Vite: root `src/web`, build to `dist/web`, loopback dev server with the `/api`
  proxy.
- `vitest.config.ts`: Vitest: tests only under `src/` and `test/`.
- `README.md`: what the project is, requirements, install, run and check commands.
- `.gitignore`: ignores `node_modules/`, `dist/` and the factory runtime state
  (`factory/board.json`, `factory/jobs/`, `.worktrees/`, `factory/config.local.json`).
- `.claude/settings.json`: Claude Code project permissions (allows `eminzo` commands).
- `.atl/`: AI tooling skill registry; not part of the product.
- `factory/config.json`: factory configuration (base `origin/main`, concurrency, rounds,
  routing, models, language `es`, auto-merge on).
- `factory/checks.sh`: the deterministic checks the gate runs in each job's worktree (see
  `Commands`). Focused mode skips only a diff of `docs/` or `CHANGELOG.md`; anything else runs
  full.
- `factory/project.md`: this file, the project context every factory agent reads.

## UI contract

- One page, `src/web/index.html`, `lang="en"`; all UI copy is English.
- Stable ids and selectors: `#service-status` is the status region (`role="status"`,
  `aria-live="polite"`, `aria-atomic="true"`, `aria-busy` while loading). Its `data-state` is
  `loading`, `working` or `unavailable`; the text tells the state, the colour only reinforces it.
- Text is always written with `textContent`, never as HTML; nothing from a response body reaches
  the DOM.
- Layout: a single column, `max-width: 40rem`, no horizontal overflow on narrow screens; no
  animation. Colours are plain values in `src/web/styles.css` (no design tokens yet).
- Same origin: the page reaches the service only through the dev server's `/api` proxy; the
  service sends no CORS headers.

## Conventions

- Commits: Conventional Commits (`chore: ...`, `feat: ...`, `fix: ...`), as in the history.
- Branches: `factory/<job-id>` for factory jobs; human branches use `<type>/<topic>`
  (for example `chore/enable-factory`). Changes reach `main` only through pull requests.
- Never commit factory runtime state (the paths in `.gitignore`), build output or secrets.
- Dependencies: `devDependencies` only, exact versions, installed with `npm ci`; check
  `npm audit` by hand when changing them (the gate does not run it).
- Tests: next to the code as `src/**/*.test.ts`; cross-cutting tests in `test/`. Name a test after
  the acceptance criterion it proves (`AC-1: ...`). Panel tests opt into happy-dom with a
  `// @vitest-environment happy-dom` comment; the rest run in Node.
- Tools are scoped to explicit paths (`src/`, `test/`, the tsconfig includes) because job
  worktrees live under `.worktrees/` inside the main checkout.
- Changing the status contract means changing `src/shared/status.ts`; the panel's exhaustive
  `switch` in `src/web/status.ts` must then handle every `status` value.

<!-- eminzo:setup-complete -->
