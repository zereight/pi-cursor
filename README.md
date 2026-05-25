# pi-cursor

Shared **Pi TUI + Cursor SDK** profile: run pi as a thin terminal shell over local `@cursor/sdk` agents (`cursor/composer-2.5`), with Cursor rules, MCP, and plugins loaded like the Cursor IDE.

**SSOT:** Provider source and forks live in [`packages/pi-cursor-sdk/`](packages/pi-cursor-sdk/) in this repo (not only the upstream npm package). Config templates live under [`config/pi/agent/`](config/pi/agent/). `scripts/sync.sh` installs both into `~/.pi/agent`.

## Quick start

### Prerequisites

- Node.js **22.19+**
- [pi](https://pi.dev/) on your `PATH`
- Cursor API key (`CURSOR_API_KEY` or `/login` in pi)

### Install config

```bash
git clone https://github.com/zereight/pi-cursor.git
cd pi-cursor
chmod +x scripts/sync.sh
./scripts/sync.sh
```

Dry-run first:

```bash
./scripts/sync.sh --dry-run
```

### Shell helper

Add to `~/.zshrc`:

```bash
source /path/to/pi-cursor/shell/pi-cursor.zsh
```

Or copy the two lines from [`shell/pi-cursor.zsh`](shell/pi-cursor.zsh).

### Run

```bash
pi-cursor
# same as: pi --model cursor/composer-2.5
```

Inside pi: `/login` → Cursor API key if needed. `/model` to switch Cursor models. `/cursor-mode plan` for Cursor plan conversation mode (see [`packages/pi-cursor-sdk/README.md`](packages/pi-cursor-sdk/README.md)).

## What gets synced

| Repo path | Installed to |
|-----------|----------------|
| `config/pi/agent/settings.json` | `~/.pi/agent/settings.json` |
| `config/pi/agent/cursor-sdk.json` | `~/.pi/agent/cursor-sdk.json` |
| `config/pi/agent/cursor-sdk-context-windows.json` | `~/.pi/agent/cursor-sdk-context-windows.json` |
| `config/pi/agent/AGENTS.md` | `~/.pi/agent/AGENTS.md` |
| `config/pi/agent/npm/package.json` | `~/.pi/agent/npm/package.json` (+ `npm install` from `file:packages/pi-cursor-sdk`) |
| `packages/pi-cursor-sdk/` (SSOT) | `pi install <repo>/packages/pi-cursor-sdk` registers the provider |

`sync.sh` also runs `pi install` on the vendored SDK path so `settings.json` `packages` points at this repo’s fork.

`sync.sh` does **not** copy secrets, sessions, or extensions. Back up your old settings before the first sync:

```bash
cp ~/.pi/agent/settings.json ~/.pi/agent/settings.json.pre-cursor-cli.bak
```

## Per-project setup

For repos that should not pull extra Pi packages (e.g. pi-autocontext), use an empty project settings file:

```bash
mkdir -p .pi
cp examples/project/.pi/settings.json .pi/settings.json
```

See [`examples/project/.pi/settings.json`](examples/project/.pi/settings.json).

## Tool boundary

On the **cursor** provider path:

- Callable tools = **Cursor SDK** tools only (read, edit, shell, MCP, … as Cursor exposes them).
- Pi extension tools (`memory_*`, `harness_*`, …) are **not** loaded (`extensions: []`).
- `PI_CURSOR_SETTING_SOURCES=all` loads `.cursor/rules`, `~/.cursor/rules`, MCP, and plugins from Cursor setting sources.

Details: [`docs/cursor-cli.md`](docs/cursor-cli.md), [`config/pi/agent/AGENTS.md`](config/pi/agent/AGENTS.md).

## Repository layout (SSOT)

```text
pi-cursor/
├── packages/pi-cursor-sdk/   # SSOT: Pi provider (vendored fork, edit here)
├── config/pi/agent/          # SSOT: settings, AGENTS.md, cursor-sdk.json templates
├── scripts/sync.sh           # Install config + local SDK into ~/.pi/agent
├── shell/pi-cursor.zsh       # PI_CURSOR_SETTING_SOURCES=all, pi-cursor()
└── docs/                     # Profile docs
```

Upstream reference: [fitchmultz/pi-cursor-sdk](https://github.com/fitchmultz/pi-cursor-sdk). Local deltas are documented in [`packages/pi-cursor-sdk/UPSTREAM.md`](packages/pi-cursor-sdk/UPSTREAM.md).

## Related projects

| Project | Role |
|---------|------|
| `packages/pi-cursor-sdk` (this repo) | **Canonical** provider for this profile |
| [pi-cursor-sdk](https://github.com/fitchmultz/pi-cursor-sdk) | Upstream npm provider |
| [pi-setup](https://github.com/JoviDeCroock/pi-setup) | Full Pi extension lab + sync (overwrites this profile if you run `pnpm pi:sync`) |

## Sync options

```bash
./scripts/sync.sh --dry-run
./scripts/sync.sh --target /tmp/pi-agent-test
./scripts/sync.sh --skip-npm
./scripts/sync.sh --skip-pi-install   # config only; you run pi install yourself
```

Develop the provider without publishing to npm:

```bash
cd packages/pi-cursor-sdk && npm install && npm test
pi -e /path/to/pi-cursor/packages/pi-cursor-sdk --model cursor/composer-2.5
```

## Special thanks

- **[pi-cursor-sdk](https://github.com/fitchmultz/pi-cursor-sdk)** — [Mitch Fultz](https://github.com/fitchmultz) for the Pi provider that bridges pi to local `@cursor/sdk` agents.
- **[pi](https://pi.dev/)** — the Pi coding agent harness and TUI this profile runs on.
- **Cursor** — `@cursor/sdk` and the model/tool runtime behind `cursor/composer-2.5`.
- **[pi-setup](https://github.com/JoviDeCroock/pi-setup)** — inspiration for config sync patterns and the fuller Pi extension workflow we slimmed down for Cursor CLI mode.

## License

Config and scripts in this repo are shared as-is for team use. `pi-cursor-sdk` is MIT — see upstream.
