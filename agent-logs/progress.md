# Development loop progress

## 2026-11-26 — Player-data protection

- Director audit: recent Enforcer reset exposed a high-priority data-integrity bug. The cloud roster still held the account save, but an older World 1 snapshot could overwrite equipment/progression.
- Designer task: make account saves recoverable and reject silent progression rollback. Add bounded revision/checkpoint history and a restore function at the database boundary.
- Implementer: migration `20261126133000_account_save_history_guard.sql` has been applied to the Monster Gate Supabase project and committed to GitHub as `6c1e65464018d8461788d28419e0baf0818718a9`.
- Verification so far: database regression predicate returns `true` for XP rollback and bulk crafted-gear loss, `false` for an unchanged save. An account checkpoint exists for the current revision.
- Client hardening: protected save responses now restore the authoritative roster and suppress stale retry loops; regression test added in `tests/mg-save-protection.test.js`. Added `npm run test:smoke` (`build` + shader check).
- Verification: full `npm test` passed 493/493; targeted protection test passed; `npm run test:smoke` passed (shader check skipped only because Chrome is unavailable); `npm run test:persistence` passed 33/33 after installing its declared dependency.
- Release gate: no production application deployment/merge claim yet. Authentication/progress/database changes require human approval before production release.
- Harness limitation: this checkout contains no `AGENTS.md`, `agents/config.yaml`, `agents/orchestrator.py`, `tasks/`, or `skills/` files, and has no `.git` metadata, so the requested branch/commit workflow cannot be executed locally.

## 2026-11-26 — World 1 authoritative gathering

- Director: audit found the remaining P1 gap in `server/world.js`: online gathering depleted shared nodes but never credited the character, despite persistence already supporting goods and XP.
- Designer: define a server-owned yield contract for mining, woodcutting, and fishing. Derive item/skill/XP from the node type; persist the reward before depletion; reject duplicate same-frame requests; emit client `reward_update` frames only after the durable write succeeds.
- Implementer: added `gatherYield()` in `server/content.js`, awaited gather handling in `server/world.js`, an in-flight node lock, immediate persistence of goods + skill XP, and reward updates. Updated `server/PROTOCOL.md` and added an integration regression test.
- Tester: focused World 1 suite passed 18/18; full `npm test` passed 494/494; `npm run test:smoke` built successfully and shader check skipped only because Chrome is unavailable; `npm run test:persistence` passed 33/33.
- Release gate: local verification is complete, but this checkout has no `.git` branch/commit support. The change affects authenticated player progression/database writes, so production merge/publish requires explicit human approval and a deployment-capable checkout. No production-live claim made.
