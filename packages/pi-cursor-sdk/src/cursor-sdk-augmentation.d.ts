import "@cursor/sdk";

declare module "@cursor/sdk" {
	interface AgentOptions {
		/** Cursor conversation mode; forwarded to the SDK when not `agent`. */
		mode?: "agent" | "plan";
	}

	interface SendOptions {
		/** Per-send conversation mode override. */
		mode?: "agent" | "plan";
	}
}
