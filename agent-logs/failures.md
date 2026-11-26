# Agent failure log

Record each failure and retry reason here. Include the exact error, root cause (or explicitly mark it unknown), corrective action, retry result, and verification. After three similar failures, propose one concrete improvement to AGENTS.md or a relevant skill.

## Entries

No entries recorded yet.

### 2026-11-26 — Combat focus-loss verification
- Iteration: 1/6 (verification environment).
- Attempt: `git ls-remote https://github.com/machine10101-vibes/monster-gate.git HEAD` to obtain local checkout for smoke testing.
- Exact error: `fatal: unable to access 'https://github.com/machine10101-vibes/monster-gate.git/': Could not resolve host: github.com` (exit 128).
- Root cause: GitHub hostname resolution unavailable in execution container; underlying network cause unknown.
- Retry reason: use connected GitHub CI evidence instead of repeating unavailable network operation.
- Outcome: CI build and tests passed at f8ba021; standalone smoke and manual browser checks remain blocked. No new gameplay change attempted.

### 2026-11-26 — Quest gear reward lost on a full bag
- Task: quest-progression (reward delivered exactly once, nothing lost).
- Iteration: 1/6 (implementation).
- Attempted approach: `npm test` after moving quest-gear delivery from `main.js` into `Journal.deliverGear`.
- Exact error: `not ok 291 - slice wiring: rift button, guest-session block, journal gear reward` (`The input did not match the regular expression /grantFound\(e\.gear\)/`).
- Root cause: `tests/mg-slice.test.js` pinned the old wiring by source pattern; the behaviour (gear reward delivered) was unchanged, only where the grant is called.
- Retry reason: update the assertion to the new wiring (`deliverQuestGear` / `journal.deliverGear` / `grantFound(id)`), not weaken it.
- Outcome: 498 tests pass.

### 2026-11-26 — Server smoke script timed out on clean main
- Task: quest-progression (verification of the unchanged server).
- Iteration: 2/6 (verification).
- Attempted approach: `node server/scripts/smoke.mjs`; repeated on clean main with my changes stashed.
- Exact error: `Error: waitUntil timeout` at `server/tests/lib/helpers.js:85` (same on clean main).
- Root cause: stale check in the script. Movement `delta` frames identify a player by `id` and omit `name`; the script matched `p.name === 'Ann'` so the second client never "saw" the move even though the delta arrived with `x:74, z:73`.
- Retry reason: take Ann's id from the first snapshot and match the delta by id (script-only change, no server change).
- Outcome: `smoke ok: two clients on :36787, move + chat in sync, /healthz ok`.

### 2026-11-26 — Browser hunt check did not enter the world
- Task: quest-progression (core-loop regression check).
- Iteration: 3/6 (verification).
- Attempted approach: temporary local hook `window.__mgGame`, `playAsGuest()`, then movement, attack and owed-gear checks in headless Chromium.
- Exact error: first run reported `started:false`, `moved 0.00`, so it proved nothing; second run was killed at the 290 s limit before printing (`Exit code 143`).
- Root cause: the character screen stays open after `playAsGuest()` (a hunt is only entered with "Play solo"), and software rendering makes the first world build slow.
- Retry reason: click `#cs-play-solo`, wait for `game.started`, and run with a longer limit in the background.
- Outcome: see progress.md entry.

### 2026-11-26 — Three existing UI/theme/world tests fail on origin/main
- Task: quest-progression (test gate).
- Iteration: 5/6 (verification).
- Attempted approach: `npm test` after merging origin/main (restored Play as Guest, fa64a04/2e29c42) into the task branch.
- Exact errors: `not ok MG-UI title: account sign-in, password hint, cover fit, no float` (tests/mg-sys.test.js), `not ok MG-UI panels share the journal theme tokens and classes` (tests/mg-theme.test.js), `not ok title, menu, HUD pill, Vite MG_WORLD_URL, picker, and Switch world stay wired` (tests/mg-world-play.test.js).
- Root cause: reproduced on a clean worktree of origin/main with no task changes, so these come from main, not this task. Not investigated further (outside this task's scope).
- Retry reason: none for this task; escalated. Not fixed here, and not weakened.
- Outcome: test gate blocked for this task; task cannot be marked done until main's failures are resolved or a human decides.

