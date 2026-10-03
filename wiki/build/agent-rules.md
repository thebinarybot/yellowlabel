# AIWeek — operating rules

Competition workspace. Agents are coordinated through
`.claude/orchestration/aiweek/`; `node scripts/herder` is the source of truth
for what is in place.

## Before starting work

- Read `PROBLEM.md`. If it is still empty, stop and ask — do not infer the
  brief from the roster. The roster was a guess at shape, not a reading.
- Read your own `task.md`, and `AGENTS.md` for what you must not touch.

## While working

- Stay inside your scope. Cross-agent edits go through the owner.
- Update `status.md` when your state changes. `herder` reads it, so a stale
  status is a lie on someone else's screen.
- Keep `- Updated:` current.

## Finishing

- Fill `handoff.md`: `## Summary`, `## Validation`, `## Remaining Risks`.
- `## Validation` means commands run and their outcome. If something was not
  verified, say so there rather than leaving it implied.
- Set state to `review`, not `merged`. Merging is a gate someone else passes.

## Evidence

Competition submissions are judged on what is demonstrably working. Claims in a
handoff need a command, a test, or a recorded run behind them.
