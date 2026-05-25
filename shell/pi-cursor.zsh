# pi-cursor — add to ~/.zshrc (or: source /path/to/pi-cursor/shell/pi-cursor.zsh)
#
# Loads Cursor rules, MCP, plugins, and user settings into SDK agents (pi-cursor-sdk).

export PI_CURSOR_SETTING_SOURCES="all"

pi-cursor() {
  pi --model cursor/composer-2.5 "$@"
}
