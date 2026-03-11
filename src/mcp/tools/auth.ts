import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import type { FreeeTokenStoreDO } from "../../durable-objects/freee-token-store";
import type { FreeeTokenRecord } from "../../types";

export function registerAuthTools(
	server: McpServer,
	record: FreeeTokenRecord,
	tokenStub: DurableObjectStub<FreeeTokenStoreDO>,
): void {
	server.registerTool(
		"freee_auth_status",
		{
			description: "freee APIへの認証状態を確認します。",
			inputSchema: {},
		},
		() => {
			const expiresInSec = Math.floor((record.expiresAt - Date.now()) / 1000);
			return {
				content: [
					{
						type: "text",
						text: JSON.stringify(
							{
								authenticated: true,
								userId: record.userId,
								companyId: record.companyId ?? null,
								accessTokenExpiresInSeconds: expiresInSec,
							},
							null,
							2,
						),
					},
				],
			};
		},
	);

	server.registerTool(
		"freee_clear_auth",
		{
			description: "freee APIの認証情報を削除します。再認証が必要になります。",
			inputSchema: {},
		},
		async () => {
			await tokenStub.deleteTokens();
			return {
				content: [
					{
						type: "text",
						text: "認証情報を削除しました。次回アクセス時に再認証が必要です。",
					},
				],
			};
		},
	);

	server.registerTool(
		"freee_authenticate",
		{
			description:
				"freee OAuth認証URLを返します。認証が切れた場合などに使用します。",
			inputSchema: {
				workerUrl: z
					.string()
					.optional()
					.describe("Worker URL (省略時はデフォルトURLを使用)"),
			},
		},
		({ workerUrl }) => {
			const baseUrl = workerUrl ?? "このMCPサーバーのURL";
			return {
				content: [
					{
						type: "text",
						text: `freee認証を行うには、MCPクライアントの設定からこのサーバー (${baseUrl}/mcp) に接続してください。OAuth認証フローが自動的に開始されます。`,
					},
				],
			};
		},
	);
}
