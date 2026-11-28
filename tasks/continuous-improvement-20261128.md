# Continuous improvement execution checklist — 2026-11-28

Scope: up to ten focused iterations. Each iteration needs a reviewed implementation, relevant automated checks, gameplay verification, a release decision, and production evidence before the next begins.

## Iteration 1 — Five for the Board quest

- [x] Audit main, previous progress, failures, and pending work.
- [x] Define eligible targets and preserve saved quest counts and rewards.
- [x] Implement eligible enemy types and a behavioral regression.
- [x] Run project tests (560/560), persistence tests (41/41), build, and server smoke.
- [x] Review exact diff and prepare isolated PR #338 with matching local and remote tree.
- [ ] Manually verify guest movement, attack, evade, quest dialogue, kill counting, and village interaction on the built branch. Blocked: local browser cannot launch; cloud browser cannot connect to local build.
- [ ] Merge only after the required gameplay gate, then verify Pages publishing and the production build.

## Following iterations — select after iteration 1 release

- [ ] Audit World 1 reconnect and save integrity against the latest server changes without using a live player account as a fixture.
- [ ] Audit terrain props and tile border traversal on desktop and mobile; prioritize clipping and floating objects.
- [ ] Audit combat and shield input transitions with actual gameplay checks.
- [ ] Audit remaining quests for objective and dialogue consistency.
- [ ] Review rendering and loading costs, then choose a measured performance improvement.

Stop condition: an essential verification environment is unavailable, six attempts fail on one issue, or an approval gate is pending. No unchecked item represents completed or live work.
