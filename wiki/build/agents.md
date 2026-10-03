# Agent Roster

Two agents working in parallel on one small codebase, plus your control pane.
Scope separation is the only thing preventing collisions, so it is strict.

| Agent | Owns | Must not touch |
| --- | --- | --- |
| `data` | `data/*`, `src/adapters/*` | `index.html`, `src/ui/*`, styles |
| `app` | `index.html`, `src/ui/*`, `styles/*`, `manifest.webmanifest`, `sw.js` | `data/*`, `src/adapters/*` |

The two meet only at the frozen data contract in `PROBLEM.md`. Neither agent
changes that contract alone. If it has to change, stop and say so, because the
other agent is building against it at that moment.

## Working order

`app` does not wait for `data`. The contract is frozen up front precisely so
`app` can build against the shape while `data` fills in the content. `data`
should write a tiny placeholder `offers.json` with two or three entries in the
first few minutes so `app` is never blocked, then expand it.

## State machine

State lives in each agent's `status.md` and is what `herder` colours.

`backlog` then `ready` then `running` then `review` then `merged`, with
`blocked` as a side exit.

| State | Exit criteria |
| --- | --- |
| `backlog` | Acceptance criteria written |
| `ready` | Owner and branch assigned |
| `running` | Agent actively working |
| `review` | Loads with no console errors, contract honoured |
| `blocked` | Blocker has an owner and a next action |
| `merged` | Integrated into `main` |

## File formats

`status.md` keys are parsed strictly as `- Key: value`:

```
- State: ready
- Updated: 2026-10-03
- Branch: agent/<slug>
- Worktree: worktrees/<slug>
- Task File: .claude/orchestration/aiweek/<slug>/task.md
- Handoff File: .claude/orchestration/aiweek/<slug>/handoff.md
```

`task.md` needs `## Objective`. `handoff.md` needs `## Summary`,
`## Validation`, `## Remaining Risks`.

## Adding an agent

Create `.claude/orchestration/aiweek/<slug>/` with those three files, then
re-run `bash scripts/herder-up`. The roster is read from disk, so a new agent
gets a pane automatically.
