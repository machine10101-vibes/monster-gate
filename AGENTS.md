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
