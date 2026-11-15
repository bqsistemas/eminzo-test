# Project context

Every factory agent reads this before working. Keep it short and current: agents use
it as a map instead of searching the repo. The builder updates it in the same branch
when a change alters the stack, the commands or the modules; the gate flags a
`Module map` that misses added or moved files.

## Snapshot

- 2026-11-15, setup analysis (no job has updated this file yet).
- `eminzo-test` is a greenfield repository used to exercise the Eminzo software factory.
  It holds no application code yet: only a one-line `README.md` and the factory's
  configuration. The first jobs define the product, the stack and the commands.

## Product and functional context

- Confirmed: there is no product behavior yet. No entrypoint, UI, API, service,
  persistence layer, test or CI workflow exists in the repository.
- Unknown: the problem the project will solve, its users/actors, domain concepts,
  workflows, business rules and external integrations. Nothing in the repository
  (README, docs, code) states them. Take them only from the job's `issue.md` and
  `spec.md`; never invent product scope beyond what a job asks for.
- The only working system today is the factory itself: GitHub issues labeled `factory`
  become jobs that end as pull requests against `origin/main`.

## Stack

- None chosen yet. No manifest (`package.json`, `go.mod`, `pyproject.toml`, ...) exists.
- The first job that adds code must pick the language/runtime, pin its versions in a
  manifest or lockfile, and record them here.
- Factory tooling (not part of the product): `eminzo` CLI, engine range `0.2.x` in
  `factory/config.json`; `git` and `gh` for branches and pull requests.

## Commands

- Run: none (no application exists).
- Test: none. `factory/checks.sh` currently runs no checks and exits 0, so the gate
  passes on any change. The first job that adds code must add its test (and lint/typecheck)
  commands to `factory/checks.sh` and list them here.
- Build: none.

## Module map

One line per module or folder: its path in backticks, then what it does. Use a folder
(`src/`) or a glob (`lib/*`, `office*.js`) to cover a group. Keep it complete: the gate
flags files a job adds or moves that no line mentions.

- `README.md`: project readme; currently only the title.
- `.gitignore`: ignores the factory runtime state (`factory/board.json`, `factory/jobs/`,
  `.worktrees/`, `factory/config.local.json`).
- `.claude/settings.json`: Claude Code project permissions (allows `eminzo` commands).
- `factory/config.json`: factory configuration (base `origin/main`, concurrency, rounds,
  routing, models, language `es`, auto-merge on).
- `factory/checks.sh`: the deterministic checks the gate runs in each job's worktree;
  placeholder that checks nothing yet.
- `factory/project.md`: this file, the project context every factory agent reads.

## Conventions

- Commits: Conventional Commits (`chore: ...`, `feat: ...`, `fix: ...`), as in the history.
- Branches: `factory/<job-id>` for factory jobs; human branches use `<type>/<topic>`
  (for example `chore/enable-factory`). Changes reach `main` only through pull requests.
- Never commit factory runtime state (the paths in `.gitignore`) or secrets.
- A job that introduces a stack must, in the same branch: add the manifest/lockfile, real
  checks in `factory/checks.sh`, the commands above, and the new modules in the module map.

<!-- eminzo:setup-complete -->
