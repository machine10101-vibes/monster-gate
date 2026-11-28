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

### 2026-11-27 — Gilantre Exchange: stale merchant test on main (iteration 1)
- Task: Gilantre Exchange, full `npm test` after the client wiring.
- Attempt: `npm test` on e16c206.
- Exact error: `Dalla skips session debug pouch in sellGood and the market listing` — input did not match `/sellAllGoods\(\) \{[\s\S]{0,220}if \(g\.session\) continue/`, then `/function mountMarket[\s\S]*isUnsellableGood\(g\)\) continue/`.
- Root cause: 35d7425 (already on main) moved both checks to the shared `isUnsellableGood(g)` helper and a `.filter(...)`; the regexes still looked for the old loop text. Behaviour unchanged (the test's runtime half still passes).
- Retry reason: the test asserts source text, not behaviour; updated both regexes to the helper.
- Outcome: 21/21 in debug-flags pass.

### 2026-11-27 — Gilantre Exchange: phone layout overflow and duplicate alias (iteration 2)
- Task: Exchange panel on a 390 px phone, and the `exchange` debug teleport.
- Attempt: Playwright render at 390x844; review of `src/debug/flags.js`.
- Exact error: filter column wider than the panel (range inputs and chips cut off, pager off-screen); tabs stacked into three rows. `market:` already aliased to `dalla`, so my `market: 'exchange'` was a duplicate key.
- Root cause: grid track `1fr` uses the filter column's min-content width; duplicate alias missed before writing.
- Retry reason: layout bug visible in the render.
- Outcome: `minmax(0, 1fr)` tracks, min-width 0, 2x2 tabs, a Filters drawer on phones; dropped the duplicate alias (`market` still goes to Dalla). Re-render clean.
### 2026-11-27 — PvP team and colosseum audit, iteration 1
- Task: friends-managed PvP teams, arena detail, and match integrity.
- Attempt: new PvP movement regression sent a move to the arena center, then expected an out-of-bounds move error.
- Exact error: `waitUntil timeout` in `server/tests/pvp.test.js`; diagnostic run showed `bounds failed: {"x":1732.7,"errors":[]}`.
- Root cause: the existing movement speed clamp correctly shortened the test packet before it reached the arena boundary. The first packet also initially exceeded the allowed travel distance.
- Retry: move a short distance first; position the test fighter just inside the boundary, age the test move timestamp, then request a short crossing step. Test now passes.
- Outcome: 5/5 PvP integration tests pass.

### 2026-11-27 — PvP persistence test dependency, iteration 2
- Task: verify ratings survive character storage.
- Attempt: `npm run test:persistence` after root `npm ci`.
- Exact error: `ERR_MODULE_NOT_FOUND: Cannot find package '@supabase/supabase-js'` in `server/persistence/adapters/supabase.js`.
- Root cause: persistence has its own package and installation directory.
- Retry: `npm ci --prefix server/persistence`, rerun suite.
- Outcome: 41/41 persistence tests pass.

### 2026-11-27 — Local visual check blocked, iteration 3
- Task: visually inspect the detailed arena in a browser.
- Attempt: run local Vite and then headless Chromium through puppeteer-core.
- Exact errors: Vite dev server `uv_interface_addresses returned Unknown system error 1`; Chromium launcher `/usr/bin/chromium` reported `/usr/lib/chromium/chromium: not found`.
- Root cause: environment network interface enumeration fails in Vite and the Chromium binary is absent. A static Python server starts, but the browser cannot launch.
- Retry: inspected arena geometry and render path in source and ran production build and automated checks; preserve manual visual inspection as an outstanding release limitation.
- Outcome: no local visual browser evidence claimed.
### 2026-11-27 — Pending-upgrade reconciliation, iteration 1
- Task: integrate the two outstanding modern PR upgrades onto current main.
- Attempt: `git cherry-pick --no-commit b81fa00` for the hotbar change.
- Exact error: content conflicts in `agent-logs/failures.md` and `agent-logs/progress.md`; application code and regression test merged cleanly.
- Root cause: the old PR branch contained log snapshots that diverged substantially from current main.
- Retry: retain current main logs, apply the four code/test files, record this reconciliation separately, and run full tests.
- Outcome: 551/551 project tests, 41/41 persistence tests, smoke and build pass with both reconciled upgrades.

### 2026-11-27 — Natural tile boundary verification blocked
- Task: remove enclosing tile mountains; iteration 1.
- Attempt: use the local Chromium installation for visual terrain inspection after automated verification.
- Exact error/evidence: `/usr/bin/chromium` exists, `/usr/lib/chromium/chromium` is absent; prior launcher execution reported that binary not found.
- Root cause: incomplete browser installation in this environment.
- Retry strategy: preserve tested changes on isolated review branch; require a functional browser to inspect terrain slopes, prop placement and traversal before release.
- Outcome: automated checks pass; essential manual check remains blocked, so no completion or production claim.

### 2026-11-27 — Map/terrain release follow-up
- Attempt: installed Chrome for Testing and retried visual guest-world verification.
- Exact error: `socket() failed: Operation not permitted` in Chrome process singleton. A pipe/single-process retry ended with `TargetCloseError` before a page opened.
- Root cause: browser process restricted by execution environment. Visual gameplay remains blocked.
- Regression fixture initially sampled the outer raster frame (brown map border), which deliberately overlays terrain. Moved the probe to an interior terrain pixel; changed-height propagation assertion now passes.
- Outcome: terrain-to-map regression passes; manual traversal release gate remains blocked.

### 2026-11-28 — Quest reload check under debug mode (iteration 2)
- Task: verify quest completion survives a reload.
- Attempt: Playwright with `?debug=1&tp=oakhollow`, complete "board", reload, re-enter as the same guest.
- Exact error: after reload `{"board":"locked","gold":0}` (expected done, 70 gold).
- Root cause: debug flags call `freezeSaves(true)` and set `progress.sessionOnly`, so nothing is written in debug sessions (by design). Not a game defect.
- Retry reason: the check measured the harness, not the game.
- Outcome: rerun on `/` without debug: board done and gold unchanged after reload. Rule for future checks: persistence and reload checks must run without `?debug=1`.

### 2026-11-28 — Spawn relocation broke a spawner unit test (iteration 9)
- Task: move unwalkable fixed spawns to walkable ground.
- Attempt: `Spawner.standable()` calling `world.playable/heightAt/zoneAt` from `populate()`.
- Exact error: `tests/mg-volcanum-spawn.test.js` "lightweight startup spawns Volcanum…": `w.playable is not a function`.
- Root cause: the test's stub world has no terrain methods; the new code assumed them.
- Retry reason: the code, not the test, was wrong to assume a terrain on every world.
- Outcome: `standable()` keeps the given spot when the world cannot answer; 575 / 575 pass. Test not modified.

### 2026-11-28 — Northern Forest: stray frost deep in the forest (iteration 1)
- Task: build tiles 17, 18, 19, 27, 28, 29 as forest; snow blend from the Arctic on the south of 27–29.
- Attempt: frost band = edge ramp × 0.95 + (fbm − 0.5) × 0.9, painted frost grass above 0.36.
- Exact error: `tests/north-forest.test.js` "snow creeps up…": `expected: 0, actual: 1` (one frost cell in the middle of a tile).
- Root cause: the noise term was unbounded away from the band, so a high noise value alone crossed the frost threshold.
- Retry reason: the paint was wrong, not the test.
- Outcome: the noise is scaled by the band ramp (min(1, 0.2 + ramp × 2)); 8 / 8 pass.

### 2026-11-28 — Northern Forest: brook column counted as missing beach (iteration 1)
- Attempt: test that every column of 17–19 runs sea → beach → forest.
- Exact error: `pinestrand column 30 shore at 80`.
- Root cause: column 30 is the brook that runs out over the sand to the sea by design; the test skipped it only after the shore assertion.
- Retry reason: test ordering bug in a test written in this task (not an existing test).
- Outcome: the brook column is skipped before the shore check; pass.

### 2026-11-28 — Open sea: dashed white line at every coast tile edge (iteration 2)
- Attempt 1: added open-sea water on unbuilt sea tiles; a dashed white line remained where it met the coast water. Assumed T-junction cracks; rebuilt the open sea as fans with matching rim vertices. Line remained.
- Root cause: the coast water's shore-foam distance treated every cell past its own tile edge as dry land (`hAt` returned 8 out of range), so foam was drawn along every tile border. Invisible before because beyond the coast there was nothing to see.
- Retry reason: first hypothesis disproved by a re-render.
- Outcome: out-of-range cells are read from the neighbouring land, and unbuilt sea counts as deep water; line gone in re-render.

### 2026-11-28 — Harness errors during browser checks (not game defects)
- Roll check sampled `player.state` 6 × 60 ms and missed one roll at low swiftshader frame rate (stamina 70, enough to roll); rerun: all four spots rolled.
- `hud.openPanel('map')` called without the game argument threw `reading 'world'`; the signature is `openPanel(name, game)`. Opened the map with the M key instead; 0 page errors.
- The background Vite server hit its 30 minute limit mid-run; restarted with a longer limit.
