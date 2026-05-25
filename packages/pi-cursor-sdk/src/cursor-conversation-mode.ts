import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { ExtensionAPI, ExtensionContext, SessionStartEvent } from "@earendil-works/pi-coding-agent";
import { getAgentDir } from "@earendil-works/pi-coding-agent";

export type CursorConversationMode = "agent" | "plan";

const CURSOR_PROVIDER = "cursor";
const MODE_ENTRY_TYPE = "cursor-conversation-mode-state";
const GLOBAL_CONFIG_FILE = "cursor-sdk.json";
const DEFAULT_CONVERSATION_MODE: CursorConversationMode = "agent";

interface CursorConversationModeEntryData {
	mode: CursorConversationMode;
}

interface CursorGlobalConfig {
	fastDefaults?: Record<string, boolean>;
	conversationMode?: CursorConversationMode;
}

type CursorModeControlsModel =
	| Pick<NonNullable<ExtensionContext["model"]>, "id" | "provider" | "api">
	| undefined;

type CursorModeControlsContext = {
	model: CursorModeControlsModel;
	ui: Pick<ExtensionContext["ui"], "notify" | "setStatus">;
	sessionManager: Pick<ExtensionContext["sessionManager"], "getBranch">;
};

interface CursorModeControlsExtensionApi extends Pick<ExtensionAPI, "appendEntry" | "getFlag" | "registerFlag"> {
	registerCommand(name: string, options: {
		description?: string;
		handler: (args: string, ctx: CursorModeControlsContext) => Promise<void> | void;
	}): void;
	on(event: "session_start", handler: (event: SessionStartEvent, ctx: CursorModeControlsContext) => Promise<void> | void): void;
	on(event: "model_select", handler: (event: { model: ExtensionContext["model"] }, ctx: CursorModeControlsContext) => Promise<void> | void): void;
	on(event: "turn_start", handler: (event: unknown, ctx: CursorModeControlsContext) => Promise<void> | void): void;
}

let sessionConversationMode: CursorConversationMode | undefined;
let globalConversationMode: CursorConversationMode | undefined;
let cliConversationMode: CursorConversationMode | undefined;

function isCursorConversationMode(value: string): value is CursorConversationMode {
	return value === "agent" || value === "plan";
}

function isCursorConversationModeEntryData(value: unknown): value is CursorConversationModeEntryData {
	if (!value || typeof value !== "object") return false;
	const data = value as Record<string, unknown>;
	return isCursorConversationMode(String(data.mode));
}

function getConfigPath(): string {
	return join(getAgentDir(), GLOBAL_CONFIG_FILE);
}

function loadGlobalConfig(): CursorGlobalConfig {
	const path = getConfigPath();
	if (!existsSync(path)) return {};
	try {
		return JSON.parse(readFileSync(path, "utf-8")) as CursorGlobalConfig;
	} catch {
		return {};
	}
}

function loadGlobalConversationMode(): CursorConversationMode | undefined {
	const mode = loadGlobalConfig().conversationMode;
	return mode && isCursorConversationMode(mode) ? mode : undefined;
}

function saveGlobalConversationMode(mode: CursorConversationMode): void {
	const path = getConfigPath();
	mkdirSync(dirname(path), { recursive: true });
	const config = loadGlobalConfig();
	config.conversationMode = mode;
	writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
}

function restoreSessionConversationMode(ctx: { sessionManager: Pick<ExtensionContext["sessionManager"], "getBranch"> }): void {
	sessionConversationMode = undefined;
	for (const entry of ctx.sessionManager.getBranch()) {
		if (entry.type !== "custom" || entry.customType !== MODE_ENTRY_TYPE) continue;
		if (isCursorConversationModeEntryData(entry.data)) {
			sessionConversationMode = entry.data.mode;
		}
	}
}

function parseConversationModeArg(args: string): CursorConversationMode | "toggle" | undefined {
	const trimmed = args.trim().toLowerCase();
	if (!trimmed) return "toggle";
	if (isCursorConversationMode(trimmed)) return trimmed;
	return undefined;
}

export function getEffectiveConversationMode(): CursorConversationMode {
	if (cliConversationMode) return cliConversationMode;
	return sessionConversationMode ?? globalConversationMode ?? DEFAULT_CONVERSATION_MODE;
}

export function withCursorConversationMode<T extends object>(options: T): T {
	const mode = getEffectiveConversationMode();
	if (mode === DEFAULT_CONVERSATION_MODE) return options;
	return { ...options, mode };
}

function isCursorModel(model: CursorModeControlsModel): boolean {
	return model?.provider === CURSOR_PROVIDER || model?.api === "cursor-sdk";
}

function updateCursorModeStatus(ctx: { model: CursorModeControlsModel; ui: Pick<ExtensionContext["ui"], "setStatus"> }, model = ctx.model): void {
	if (!model || !isCursorModel(model)) {
		ctx.ui.setStatus("cursor-mode", undefined);
		return;
	}
	const mode = getEffectiveConversationMode();
	ctx.ui.setStatus("cursor-mode", mode === "plan" ? "cursor plan" : undefined);
}

function persistConversationMode(pi: Pick<ExtensionAPI, "appendEntry">, mode: CursorConversationMode): void {
	const previousSession = sessionConversationMode;
	const previousGlobal = globalConversationMode;
	sessionConversationMode = mode;
	globalConversationMode = mode;
	try {
		saveGlobalConversationMode(mode);
		pi.appendEntry<CursorConversationModeEntryData>(MODE_ENTRY_TYPE, { mode });
	} catch (error) {
		sessionConversationMode = previousSession;
		globalConversationMode = previousGlobal;
		throw error;
	}
}

export function registerCursorConversationModeControls(pi: CursorModeControlsExtensionApi): void {
	pi.registerFlag("cursor-mode", {
		description: "Cursor conversation mode for this run: agent (default) or plan",
		type: "string",
		default: "",
	});

	pi.registerCommand("cursor-mode", {
		description: "Set or toggle Cursor conversation mode (agent | plan)",
		handler: async (args, ctx) => {
			if (!ctx.model || !isCursorModel(ctx.model)) {
				ctx.ui.notify("Select a Cursor model first (/model cursor/...)", "info");
				return;
			}
			if (cliConversationMode) {
				ctx.ui.notify(`Cursor mode is forced to ${cliConversationMode} by --cursor-mode`, "info");
				return;
			}

			const parsed = parseConversationModeArg(args);
			if (parsed === undefined) {
				ctx.ui.notify("Usage: /cursor-mode [agent|plan]", "info");
				return;
			}

			const current = getEffectiveConversationMode();
			const next = parsed === "toggle" ? (current === "plan" ? "agent" : "plan") : parsed;
			try {
				persistConversationMode(pi, next);
			} catch (error) {
				updateCursorModeStatus(ctx);
				ctx.ui.notify(
					`Failed to save Cursor conversation mode: ${error instanceof Error ? error.message : String(error)}`,
					"error",
				);
				return;
			}
			updateCursorModeStatus(ctx);
			ctx.ui.notify(`Cursor conversation mode: ${next}`, "info");
		},
	});

	pi.on("session_start", async (_event, ctx) => {
		globalConversationMode = loadGlobalConversationMode();
		const flagValue = pi.getFlag("cursor-mode");
		const flagMode = typeof flagValue === "string" ? flagValue.trim().toLowerCase() : "";
		cliConversationMode = isCursorConversationMode(flagMode) ? flagMode : undefined;
		restoreSessionConversationMode(ctx);
		updateCursorModeStatus(ctx);
	});

	pi.on("model_select", async (event, ctx) => {
		updateCursorModeStatus(ctx, event.model);
	});

	pi.on("turn_start", async (_event, ctx) => {
		updateCursorModeStatus(ctx);
	});
}

export const __testUtils = {
	MODE_ENTRY_TYPE,
	getConfigPath,
	loadGlobalConversationMode,
	getSessionConversationMode: () => sessionConversationMode,
	getCliConversationMode: () => cliConversationMode,
	resetConversationModeState(): void {
		sessionConversationMode = undefined;
		globalConversationMode = undefined;
		cliConversationMode = undefined;
	},
	setCliConversationMode(mode: CursorConversationMode | undefined): void {
		cliConversationMode = mode;
	},
	setSessionConversationMode(mode: CursorConversationMode | undefined): void {
		sessionConversationMode = mode;
	},
	setGlobalConversationMode(mode: CursorConversationMode | undefined): void {
		globalConversationMode = mode;
	},
};
