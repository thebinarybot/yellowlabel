# AIWeek

Workspace for the AI Week builder competition, wired for multi-agent work with
a control pane so you can always see what is running.

Orchestration patterns and the snapshot library are adapted from
[ECC](https://github.com/affaan-m/ECC) (MIT).

## Quick start

```bash
bash scripts/herder-up     # create the tmux session, one titled pane per agent
tmux attach -t aiweek      # drive it
node scripts/herder        # status: which panes and agents are in place
node scripts/herder --json # same, machine-readable
```

## What `herder` shows

Two tables and a summary line:

- **AGENTS** — every agent declared on disk, its state, the pane it is bound to
  (or `—` if detached), its branch, and its objective.
- **PANES** — every live tmux pane, flagged `(unbound)` when its title matches
  no agent.
- **summary** — counts by state, plus any declared-but-detached agents.

## How binding works

A pane binds to an agent **only** when the tmux `pane_title` exactly equals the
agent's directory slug. That is the single key — there is no PID or path
fallback. `scripts/herder-up` sets titles for you and turns on pane borders so
the key is visible while you work. A hand-made pane with the wrong title will
run fine and still show as `(unbound)`.

Your control pane (`%0`, titled `control`) is reported as unbound by design: it
is yours, not an agent's.

### The title-clobbering trap

An interactive shell emits an OSC title escape on every prompt, which overwrites
`pane_title`. Left alone, this unbinds **every** agent the first time you type
in a pane, and `herder` then shows a fully detached roster that looks like
nothing is running. `herder-up` prevents it with
`allow-set-title off` (needs tmux >= 3.3) set *before* any shell starts, and
`herder` prints a targeted diagnostic if it ever happens anyway.

## Mouse and clipboard

`.tmux.conf` is sourced by `herder-up`, so this survives a teardown.

| Action | Result |
| --- | --- |
| Click a pane | Focus it |
| Drag a pane border | Resize |
| Scroll wheel | Scroll history (enters copy mode; `q` exits) |
| Drag-select | Copies to the Windows clipboard, exits copy mode |
| Double-click | Select + copy a word |
| Triple-click | Select + copy a line |
| Middle-click | Paste |

### Hold Shift for native selection

With `mouse on`, tmux captures the mouse, so your terminal's own click-drag
selection stops working — and it will look broken rather than configured.
**Hold Shift** while dragging to bypass tmux and use Windows Terminal's native
selection, which is what you want for selecting across several panes at once
(tmux copy is per-pane by design).

### Why clip.exe

`copy-command` is `clip.exe`. `xclip` is installed but unusable here: WSLg's X
display is not reachable, so `xclip -selection clipboard` fails with
`Can't open display: :0`. `set-clipboard on` additionally emits OSC52, which
Windows Terminal honours, so copy still works if this is ever driven over SSH
where `clip.exe` does not exist.

## Layout

```
PROBLEM.md                      the competition problem statement  <- still empty
.tmux.conf                      mouse + clipboard, sourced by herder-up
AGENTS.md                       roster, state machine, file formats
CLAUDE.md                       operating rules for agents here
scripts/herder                  status CLI
scripts/herder-up               tmux session bootstrap
scripts/lib/                    vendored ECC snapshot lib (MIT)
orchestration/KANBAN.md         board across sessions
.claude/orchestration/aiweek/   one dir per agent: status/task/handoff
worktrees/                      per-agent git worktrees (gitignored)
```

## Known gaps

- **`PROBLEM.md` is empty.** The roster in `AGENTS.md` is a guess at the shape
  of a builder competition, not a reading of the actual brief.
- **`dmux` is not installed.** `herder` speaks ECC's dmux-tmux snapshot format
  and works against plain tmux today. If you want dmux's interactive pane
  creation (`n` for a new agent pane, `m` to merge), install it separately from
  [standardagents/dmux](https://github.com/standardagents/dmux) — review it
  first; it was not vetted as part of this setup.
- **Panes start as shells, not agents.** `herder-up` prints each agent's task
  and leaves you a prompt. Launching an agent is a deliberate act, so nothing
  starts burning tokens behind your back.
