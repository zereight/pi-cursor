# Upstream

Vendored fork of [pi-cursor-sdk](https://github.com/fitchmultz/pi-cursor-sdk).

This directory is the **SSOT** for the Pi Cursor provider inside [pi-cursor](https://github.com/zereight/pi-cursor). Edit here; install via `scripts/sync.sh` or `pi install <repo>/packages/pi-cursor-sdk`.

## Divergence from npm

- `cursor-conversation-mode` — `/cursor-mode`, `--cursor-mode`, `conversationMode` in `cursor-sdk.json`
- Merged `cursor-sdk.json` writes preserve `fastDefaults` and `conversationMode`

When pulling upstream releases, diff against upstream tag and re-apply the files under `src/cursor-conversation-mode.ts`, `src/cursor-sdk-augmentation.d.ts`, and related tests.
