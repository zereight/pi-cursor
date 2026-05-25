# Cursor CLI mode (Pi TUI)

This profile treats **pi** as a terminal front-end for **Cursor SDK local agents** (`cursor/composer-2.5`), similar to `cursor` / `Agent.prompt` with `local: { cwd }`.

## What this profile changes

| Item | Full pi-setup style | pi-cursor (this repo) |
|------|---------------------|------------------------|
| `settings.json` packages | Many npm packages + extensions | `npm:pi-cursor-sdk` only |
| `settings.json` extensions | pi-setup, memory, mermaid, … | `[]` (empty) |
| `PI_CURSOR_SETTING_SOURCES` | often `project,user,plugins` | `all` (rules + MCP + plugins + user) |
| Project `.pi/settings.json` | e.g. pi-autocontext | `{}` (no extra packages) |
| Tools at runtime | Pi extension tools + Cursor | **Cursor SDK tools only** |

## Requirements

- Node.js **22.19+** (pi + pi-cursor-sdk)
- [pi](https://pi.dev/) installed (`pi --version`)
- Cursor API key: `CURSOR_API_KEY` or `/login` → Cursor inside pi

Upstream provider package: [pi-cursor-sdk](https://github.com/fitchmultz/pi-cursor-sdk).

## Environment

```bash
export PI_CURSOR_SETTING_SOURCES="all"
```

Narrow loading if needed, e.g. `project,user,plugins`. Disable ambient sources with `none` (not recommended for parity with Cursor IDE).

## Launch

```bash
pi-cursor          # pi --model cursor/composer-2.5
pi -p "..."        # one-shot print mode
```

## Still active (session UX only)

- `cursor-sdk.json` — fast mode defaults (`composer-2.5`: fast off)
- `cursor-sdk-context-windows.json` — optional context window overrides
- Pi compaction, theme, retry — unchanged session behavior

## Rollback to full pi-setup

If you use [pi-setup](https://github.com/JoviDeCroock/pi-setup):

```bash
cp ~/.pi/agent/settings.json.pre-cursor-cli.bak ~/.pi/agent/settings.json
mv ~/.pi/agent/extensions.disabled/* ~/.pi/agent/extensions/ 2>/dev/null || true
pnpm pi:sync   # from pi-setup — restores full template
```

Do **not** run `pnpm pi:sync` from pi-setup if you want to keep this minimal Cursor CLI profile, unless you use a private overlay.
