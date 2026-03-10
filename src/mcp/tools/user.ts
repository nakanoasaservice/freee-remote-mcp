import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import type { FreeeApiClient } from "../../freee/client";

export function registerUserTools(
	server: McpServer,
	client: FreeeApiClient,
): void {
	server.registerTool(
		"freee_current_user",
		{
			description: "現在認証しているfreeeユーザーの情報を取得します。",
			inputSchema: {},
		},
		async () => {
			const result = await client.get("/api/1/users/me");
			return {
				content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
			};
		},
	);
}
