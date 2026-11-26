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
