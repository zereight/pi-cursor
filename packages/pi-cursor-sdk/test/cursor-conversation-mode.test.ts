import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	formatConversationModeStatus,
	getEffectiveConversationMode,
	registerCursorConversationModeControls,
	__testUtils,
} from "../src/cursor-conversation-mode.js";

type CursorModeTestContext = {
	model: { id: string; provider: string; api: string } | undefined;
	ui: { setStatus: ReturnType<typeof vi.fn>; notify: ReturnType<typeof vi.fn> };
	sessionManager: { getBranch: ReturnType<typeof vi.fn<() => unknown[]>> };
};

function createHarness(options: { cursorModeFlag?: string } = {}) {
	const commands = new Map<string, { handler: (args: string, ctx: CursorModeTestContext) => Promise<void> | void }>();
	const shortcuts = new Map<string, { handler: (ctx: CursorModeTestContext) => Promise<void> | void }>();
	const handlers = new Map<string, (event: unknown, ctx: CursorModeTestContext) => Promise<void> | void>();
	const pi = {
		registerFlag: vi.fn(),
		registerCommand: vi.fn((name: string, command: { handler: (args: string, ctx: CursorModeTestContext) => Promise<void> | void }) => {
			commands.set(name, command);
		}),
		registerShortcut: vi.fn((shortcut: string, shortcutOptions: { handler: (ctx: CursorModeTestContext) => Promise<void> | void }) => {
			shortcuts.set(shortcut, shortcutOptions);
		}),
		on: vi.fn((event: string, handler: (event: unknown, ctx: CursorModeTestContext) => Promise<void> | void) => {
			handlers.set(event, handler);
		}),
		getFlag: vi.fn((name: string) => (name === "cursor-mode" ? options.cursorModeFlag ?? "" : "")),
		appendEntry: vi.fn(),
	};
	const ctx: CursorModeTestContext = {
		model: { provider: "cursor", id: "composer-2.5", api: "cursor-sdk" },
		ui: { setStatus: vi.fn(), notify: vi.fn() },
		sessionManager: { getBranch: vi.fn(() => []) },
	};
	registerCursorConversationModeControls(pi);
	return { pi, ctx, commands, shortcuts, handlers };
}

describe("cursor-conversation-mode", () => {
	let agentDir = "";

	beforeEach(() => {
		__testUtils.resetConversationModeState();
		agentDir = mkdtempSync(join(tmpdir(), "pi-cursor-mode-"));
		vi.stubEnv("PI_CODING_AGENT_DIR", agentDir);
		mkdirSync(agentDir, { recursive: true });
	});

	afterEach(() => {
		vi.unstubAllEnvs();
		if (agentDir) rmSync(agentDir, { recursive: true, force: true });
	});

	it("defaults to agent mode", () => {
		expect(getEffectiveConversationMode()).toBe("agent");
	});

	it("formats footer status for agent and plan", () => {
		expect(formatConversationModeStatus("agent")).toBe("mode: agent");
		expect(formatConversationModeStatus("plan")).toBe("mode: plan");
	});

	it("registers ctrl+x to toggle conversation mode", async () => {
		const { shortcuts, handlers, ctx } = createHarness();
		expect(shortcuts.has("ctrl+x")).toBe(true);
		await handlers.get("session_start")?.({}, ctx);
		await shortcuts.get("ctrl+x")?.handler(ctx);
		expect(getEffectiveConversationMode()).toBe("plan");
		expect(ctx.ui.setStatus).toHaveBeenLastCalledWith("cursor-mode", "mode: plan");
	});

	it("shows current mode in footer on session start", async () => {
		const { handlers, ctx } = createHarness();
		await handlers.get("session_start")?.({}, ctx);
		expect(ctx.ui.setStatus).toHaveBeenCalledWith("cursor-mode", "mode: agent");
	});

	it("uses CLI flag mode when set", async () => {
		const { handlers, ctx } = createHarness({ cursorModeFlag: "plan" });
		await handlers.get("session_start")?.({}, ctx);
		expect(getEffectiveConversationMode()).toBe("plan");
	});

	it("persists plan mode to cursor-sdk.json via /cursor-mode", async () => {
		const { commands, handlers, ctx } = createHarness();
		await handlers.get("session_start")?.({}, ctx);
		await commands.get("cursor-mode")?.handler("plan", ctx);
		expect(getEffectiveConversationMode()).toBe("plan");
		const config = JSON.parse(readFileSync(join(agentDir, "cursor-sdk.json"), "utf-8")) as { conversationMode?: string };
		expect(config.conversationMode).toBe("plan");
	});

	it("toggles between agent and plan", async () => {
		const { commands, handlers, ctx } = createHarness();
		await handlers.get("session_start")?.({}, ctx);
		await commands.get("cursor-mode")?.handler("plan", ctx);
		await commands.get("cursor-mode")?.handler("", ctx);
		expect(getEffectiveConversationMode()).toBe("agent");
	});

	it("preserves fastDefaults when saving conversation mode", async () => {
		writeFileSync(
			join(agentDir, "cursor-sdk.json"),
			`${JSON.stringify({ fastDefaults: { "composer-2": true } }, null, 2)}\n`,
		);
		const { commands, handlers, ctx } = createHarness();
		await handlers.get("session_start")?.({}, ctx);
		await commands.get("cursor-mode")?.handler("plan", ctx);
		const config = JSON.parse(readFileSync(join(agentDir, "cursor-sdk.json"), "utf-8")) as {
			fastDefaults?: Record<string, boolean>;
			conversationMode?: string;
		};
		expect(config.fastDefaults).toEqual({ "composer-2": true });
		expect(config.conversationMode).toBe("plan");
	});
});
