# Verification failures

## 2026-11-26

- **World gathering persistence test expectation (resolved):** The new authoritative gather test initially expected `12` mining XP for copper, but the server-owned `ROCKS.copper.xp` is `17.5`. Evidence: focused `server/tests/world.test.js` assertion reported `17.5 !== 12`; no implementation failure occurred. Corrected the test to assert the data-defined reward and reran the focused suite: 18/18 passed.

- Repository harness files requested by the goal were absent from the provided checkout (`AGENTS.md`, `agents/config.yaml`, `agents/orchestrator.py`, `tasks/`, `skills/`).
- The checkout has no `.git` directory, so an isolated task branch and local commit cannot be created from this workspace.
- `npm run test:smoke` is not defined in `work/package.json`; it cannot be run until the repository adds that script.
- First combined patch attempt failed because the surrounding `cloud.js` return block differed from the expected context; no partial change was applied. The retry used smaller exact hunks.
- Initial `npm run test:persistence` failed because the checkout had not installed `server/persistence`'s `@supabase/supabase-js` dependency. Running `npm ci --prefix server/persistence` resolved the environment issue; the full persistence suite then passed (33/33).
