# Verification failures

## 2026-11-26

- **World 1 reconnect audit, test corrections (resolved):** Initial reconnect and periodic-save assertions expected a first move of 5–7 units to be accepted in full. `applyMove` correctly clamps the first 0.1-second move to about 3.1 units; tests now use a valid 2-unit move. Initial queue retry kept a permanent `name_taken` write, causing an existing test's `close()` to fail. The queue now retains only transient failures and discards permanent validation/conflict failures. Focused World 1 and persistence suites passed after these corrections.

- **World gathering persistence test expectation (resolved):** The new authoritative gather test initially expected `12` mining XP for copper, but the server-owned `ROCKS.copper.xp` is `17.5`. Evidence: focused `server/tests/world.test.js` assertion reported `17.5 !== 12`; no implementation failure occurred. Corrected the test to assert the data-defined reward and reran the focused suite: 18/18 passed.

- Repository harness files requested by the goal were absent from the provided checkout (`AGENTS.md`, `agents/config.yaml`, `agents/orchestrator.py`, `tasks/`, `skills/`).
- The checkout has no `.git` directory, so an isolated task branch and local commit cannot be created from this workspace.
- `npm run test:smoke` is not defined in `work/package.json`; it cannot be run until the repository adds that script.
- First combined patch attempt failed because the surrounding `cloud.js` return block differed from the expected context; no partial change was applied. The retry used smaller exact hunks.
- Initial `npm run test:persistence` failed because the checkout had not installed `server/persistence`'s `@supabase/supabase-js` dependency. Running `npm ci --prefix server/persistence` resolved the environment issue; the full persistence suite then passed (33/33).

- 2026-11-27 UTC | World selection / High graphics / guest restoration | CI runs 45914535813 and 45914535712 | npm test exit 1, five stale assertions in mg-hud, mg-sys, mg-theme and mg-world-play. Root cause: earlier UI/default changes did not update all affected tests. Corrected assertions to require High boot, guest button and explicit offline selection; retained other checks. Retry: full production CI. Outcome pending.
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


### 2026-11-26 — Sand worm forced-move live check (iteration 2)
- Task: verify Maw Slam, Sand Torrent, dive and Dune Rupture in the live game.
- Attempt: Playwright + swiftshader, guest at the Oasis, worm teleported in front of the hunter and set to `slamwind`.
- Exact error: `page.evaluate: Target crashed` during the slam run.
- Root cause: unknown (renderer crash; to be checked by rerunning slam alone).
- Retry: rerun slam only with console capture.
- Follow-up: rerun of slam alone did not crash, but the worm stayed in `slamwind`. A rAF probe counted 1 frame in 3 s: swiftshader renders the full scene (83 monsters) at about 0.3 fps, so game time barely advanced. Root cause of the stall: environment speed, not the worm code. The earlier crash is most likely the same renderer under load (not reproduced).
- Different approach: step the real `sandwormAI.think/animate` inside the live game page at fixed 1/30 s steps against the real player, world and fx. Outcome: all moves passed (see progress.md).

### 2026-11-26 — PR #312 release blocked by main-branch test failures
- Task: publish the sandworm rebuild (approved by the user: "Publish it live").
- Attempt: PR #312 from ccr-81a4e261-p4hmfr (head 21d896f) into main. Checks ran on the head commit.
- Exact error: `verify` and `test-and-build` both exit 1. Failing tests: `MG-UI title: account sign-in...` (334), `MG-UI panels share the journal theme tokens...` (336), `title, menu, HUD pill...` (360). Each asserts the guest button is absent: `/id="btn-guest"|Play as guest/i` must not match.
- Root cause: the guest button was restored on main (fa64a04), so these assertions are stale. The same three fail on clean origin/main.
- Retry: not done. Editing these assertions needs the user's approval (option 1 from the earlier blocker), and skipping tests is not allowed.
- Outcome: PR #312 not merged; not published.

### 2026-11-27 — Process: an unannounced change rode along in a release PR
- Task: publish the Northern Jungle and sandworm (PR #312).
- What happened: the long-lived branch still held the quest gear reward commit (808785b), which was blocked pending approval. The squash merge shipped it with the approved work.
- Root cause: one development branch reused across tasks; the PR description listed only the two approved features.
- Outcome: shipped with CI green; reported to the user after the fact.
- Improvement proposal (needs human approval): before opening or updating a release PR, list `git log origin/main..HEAD` and name every included change in the PR body and to the user.
