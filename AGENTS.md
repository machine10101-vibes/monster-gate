# Monster Gate Agent Rules

## Project
- Game: 3D pixel monster-hunting adventure at monstergate.online
- Repo: monster-gate
- Goal: ship playable features, fixes, and content that keep the game running and progressing

## Done criteria (required for every task)
- Project builds / runs without crash
- Relevant tests or smoke checks pass
- No regressions on core loop (move, attack, evade, quest progress, village)
- Changes are committed with clear message

## Constraints
- Prefer small, reviewable changes
- Never delete core player progress systems or auth without explicit instruction
- Follow existing code style and architecture
- Log every failure and retry reason in `agent-logs/`

## Tools you can use
- Read/write files
- Run build/tests/shell
- Git operations
- Search codebase

## Self-improvement
- When you fail, write the exact failure + root cause to `agent-logs/failures.md`
- Propose one concrete improvement to this file or a skill after 3 similar failures

## Required agent execution loop

Task: [specific task, e.g. "Implement X feature" or "Fix bug Y"]

You are working on the monster-gate repo for monstergate.online.

Loop until done:
1. Observe current state (code, tests, logs).
2. Plan the smallest change.
3. Make the change.
4. Verify: build + relevant tests/smoke check pass + no obvious regressions.
5. If fail: diagnose, log to `agent-logs/failures.md`, try a different approach.
6. Max 6 iterations, then stop and escalate with clear status.

Done only when verification passes. Commit when done. Record progress, verification evidence, commit and deployment status in `agent-logs/progress.md`. Never claim an unrun check passed.

### Verification commands
- `npm run build`
- `npm test`
- `npm run test:persistence` (when persistence is affected; install its dependencies first)
- `node server/scripts/smoke.mjs`

Manually smoke-check movement, attack, evade, quest progress and village interactions when relevant; the server smoke script does not cover all browser gameplay. If a check cannot run, record the blocker and do not mark the task done.

## Specialized team and reflection
Follow `agent-logs/team-workflow.md` for role routing, prioritized tasks, handoffs, approval gates and reflection. Use `agent-logs/handoff-template.md` for sequential agent sessions. Every failure entry must include timestamp, task, iteration, attempted approach, exact error, root cause (or unknown), retry reason and outcome. Review the latest 10–20 failures and propose one concrete improvement after three similar failures or at task completion. Human approval is required before changing rules or skills through reflection.
