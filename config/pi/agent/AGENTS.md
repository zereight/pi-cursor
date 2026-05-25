# Pi agent (Cursor CLI mode)

Pi TUI is a thin shell around **local `@cursor/sdk` agents** (`cursor/composer-2.5`). Execution, tools, MCP, and rules come from **Cursor**, not Pi extensions.

## Where rules live

| Layer | Role |
|-------|------|
| `.cursor/rules`, `~/.cursor/rules/` | **Primary** — loaded via `PI_CURSOR_SETTING_SOURCES=all` |
| Cursor MCP / plugins | Loaded by Cursor SDK when setting sources are enabled |
| This file | Short Pi-session hints only; not a substitute for Cursor rules |

## Pi session habits

- Be concise and explicit.
- Read relevant files before editing.
- Prefer small, reviewable changes.
- Run relevant tests or checks when practical.

## Tool boundary (cursor provider)

- Only **Cursor SDK–exposed** tools are callable in a turn.
- Pi extension tools (`memory_*`, `harness_*`, etc.) do **not** run on the cursor provider path.
- Replay labels (`cursor_edit`, `cursor-replay-*`) are display-only.

## Restore full Pi stack

If you previously used [pi-setup](https://github.com/JoviDeCroock/pi-setup), restore from your backup:

```bash
cp ~/.pi/agent/settings.json.pre-cursor-cli.bak ~/.pi/agent/settings.json
# re-enable extensions from ~/.pi/agent/extensions.disabled/
```

`pnpm pi:sync` from pi-setup **overwrites** `settings.json` unless you use a private overlay.
