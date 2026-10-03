# Docs

- [Architecture](architecture.md) how the code fits together, the adapter
  interface, and how matching and costing work.
- [Data](data.md) the three data files, the ingredient vocabulary, and how to
  change or validate them.
- [Roadmap](roadmap.md) what a live version needs, and what is currently
  approximate.

## build/

How this was built, kept as a record rather than as instructions.

Two agents worked in parallel against a data contract frozen before either
started, one owning the data and adapter layer and one owning the interface.

- [problem.md](build/problem.md) the brief, the frozen contract, and the
  writing and visual rules both agents worked to.
- [agents.md](build/agents.md) the two agent roster, scopes and state machine.
- [orchestration.md](build/orchestration.md) the tmux pane setup.
- [agent-rules.md](build/agent-rules.md) operating rules the agents followed.
- [kanban.md](build/kanban.md) the board as it stood.

Each agent's brief, state and handoff is in `.claude/orchestration/aiweek/`.
The handoffs record what each agent verified and what it chose not to do.

The tooling is in `scripts/`: `herder` shows which panes and agents are in
place, `herder-up` creates the session, `herder-launch` starts an agent.
