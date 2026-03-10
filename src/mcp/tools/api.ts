import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import type { FreeeApiClient } from "../../freee/client";

export function registerApiTools(
	server: McpServer,
	client: FreeeApiClient,
): void {
	server.registerTool(
		"freee_api_get",
		{
			description:
				"freee APIにGETリクエストを送信します。一覧取得や詳細取得に使用します。",
			inputSchema: {
				path: z.string().describe('APIパス (例: "/api/1/companies")'),
				params: z
					.record(z.string(), z.string())
					.optional()
					.describe("クエリパラメータ (例: { company_id: '1' })"),
			},
		},
		async ({ path, params }) => {
			const result = await client.get(path, params);
			return {
				content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
			};
		},
	);

	server.registerTool(
		"freee_api_post",
		{
			description:
				"freee APIにPOSTリクエストを送信します。リソースの作成に使用します。",
			inputSchema: {
				path: z.string().describe('APIパス (例: "/api/1/deals")'),
				body: z.record(z.string(), z.unknown()).describe("リクエストボディ"),
			},
		},
		async ({ path, body }) => {
			const result = await client.post(path, body);
			return {
				content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
			};
		},
	);

	server.registerTool(
		"freee_api_put",
		{
			description:
				"freee APIにPUTリクエストを送信します。リソースの更新に使用します。",
			inputSchema: {
				path: z.string().describe('APIパス (例: "/api/1/deals/123")'),
				body: z.record(z.string(), z.unknown()).describe("リクエストボディ"),
			},
		},
		async ({ path, body }) => {
			const result = await client.put(path, body);
			return {
				content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
			};
		},
	);

	server.registerTool(
		"freee_api_patch",
		{
			description:
				"freee APIにPATCHリクエストを送信します。リソースの部分更新に使用します。",
			inputSchema: {
				path: z.string().describe("APIパス"),
				body: z.record(z.string(), z.unknown()).describe("リクエストボディ"),
			},
		},
		async ({ path, body }) => {
			const result = await client.patch(path, body);
			return {
				content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
			};
		},
	);

	server.registerTool(
		"freee_api_delete",
		{
			description:
				"freee APIにDELETEリクエストを送信します。リソースの削除に使用します。",
			inputSchema: {
				path: z.string().describe('APIパス (例: "/api/1/deals/123")'),
			},
		},
		async ({ path }) => {
			const result = await client.delete(path);
			return {
				content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
			};
		},
	);
}
