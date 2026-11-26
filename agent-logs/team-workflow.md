# Monster Gate agent team

Use sequential agent sessions with file handoffs initially. Do not enable unattended merging until the single-agent loop has demonstrated reliable verification.

## Priority backlog
1. Fix crash, fainting or progress loss bugs and prove fixes with smoke tests.
2. Add or improve a quest or monster encounter until playable.
3. Balance damage, health and drop rates against explicit design targets.
4. Implement missing controls or UI (shield, evade, item hotbar) cleanly.

## Roles and handoffs
| Node | Input | Output |
|---|---|---|
| Designer | Task or idea | Spec, design targets, acceptance criteria |
| Implementer | Spec and tester feedback | Code changes on task branch |
| Tester | Code and acceptance criteria | Build/test/smoke results, pass/fail and logs |
| Critic | Last 10–20 failures and test evidence | One concrete rule, skill or test improvement |
| Human gate | Summary, diff, verification and risk | Approve merge or reject |

## Routing
Designer → Implementer → Tester. Tester failure returns to Implementer with exact failure details; at most six implementation iterations total. Tester pass → optional Critic → Human gate. Stop and escalate on exhaustion or blocked verification. Initially require human approval for all merges; small verified changes may be eligible for automatic merge only after an explicit policy is approved. Always require human approval for changes to player persistence, auth, database schema, payments, security, or production infrastructure.

## Sequential session protocol
Use a task-specific branch and a handoff file based on `agent-logs/handoff-template.md`. Each role reads AGENTS.md and the handoff, writes its own output and updates the progress log. Tester must independently run applicable commands, not accept implementer claims as evidence. No production writes or deployment from test sessions. Human gate reviews the exact tested commit.

## Reflection
Append each failure with UTC timestamp, task, iteration, attempted approach, exact error, root cause (or unknown), retry reason and outcome. After each task, or after three similar failures, Critic reviews the latest 10–20 entries and proposes one concrete improvement with evidence and a verification plan. Human approval is required before applying proposed rule or skill changes. Keep proposals in the progress log; do not silently rewrite rules.

This is a manual sequential workflow, not an installed autonomous agent service. External agent execution and scheduling require separate setup.
