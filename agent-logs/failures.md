# Verification failures

## 2026-11-26

- **World gathering persistence test expectation (resolved):** The new authoritative gather test initially expected `12` mining XP for copper, but the server-owned `ROCKS.copper.xp` is `17.5`. Evidence: focused `server/tests/world.test.js` assertion reported `17.5 !== 12`; no implementation failure occurred. Corrected the test to assert the data-defined reward and reran the focused suite: 18/18 passed.

- Repository harness files requested by the goal were absent from the provided checkout (`AGENTS.md`, `agents/config.yaml`, `agents/orchestrator.py`, `tasks/`, `skills/`).
- The checkout has no `.git` directory, so an isolated task branch and local commit cannot be created from this workspace.
- `npm run test:smoke` is not defined in `work/package.json`; it cannot be run until the repository adds that script.
- First combined patch attempt failed because the surrounding `cloud.js` return block differed from the expected context; no partial change was applied. The retry used smaller exact hunks.
- Initial `npm run test:persistence` failed because the checkout had not installed `server/persistence`'s `@supabase/supabase-js` dependency. Running `npm ci --prefix server/persistence` resolved the environment issue; the full persistence suite then passed (33/33).

- 2026-11-27 UTC | World selection / High graphics / guest restoration | CI runs 45914535813 and 45914535712 | npm test exit 1, five stale assertions in mg-hud, mg-sys, mg-theme and mg-world-play. Root cause: earlier UI/default changes did not update all affected tests. Corrected assertions to require High boot, guest button and explicit offline selection; retained other checks. Retry: full production CI. Outcome pending.

- 2026-11-27 00:08:53 UTC — Hotbar verification, iteration 1: `npm test` equivalent on Windows found a wheel selector regex failure because the new picker selector interrupted the expected sequence. Moved the new selector after the existing selectors and reran the suite. The wheel test passed. Five failures reproduced on clean main: the admin test builds an invalid Windows drive path from a file URL, the graphics test expects Medium despite the High default, and three tests expect the guest button to be absent despite the current title markup.
- 2026-11-27 00:08:53 UTC — Hotbar verification, iteration 2: `node server/scripts/smoke.mjs` failed with `Error: waitUntil timeout` in `server/tests/lib/helpers.js:85`. Retried with unrestricted loopback and then on clean main to isolate environment and baseline behavior. Both retries timed out. The underlying server smoke cause is unconfirmed.
