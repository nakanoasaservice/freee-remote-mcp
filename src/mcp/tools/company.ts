import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import type { FreeeApiClient } from "../../freee/client";
import type { FreeeTokenStore } from "../../freee/token-store";
import type { FreeeTokenRecord } from "../../types";

export function registerCompanyTools(
	server: McpServer,
	client: FreeeApiClient,
	record: FreeeTokenRecord,
	tokenStore: FreeeTokenStore,
	freeeUserId: string,
): void {
	server.registerTool(
		"freee_list_companies",
		{
			description: "アクセス可能な事業所の一覧を取得します。",
			inputSchema: {},
		},
		async () => {
			const result = await client.get("/api/1/companies");
			return {
				content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
			};
		},
	);

	server.registerTool(
		"freee_get_current_company",
		{
			description: "現在選択されている事業所IDを取得します。",
			inputSchema: {},
		},
		() => {
			return {
				content: [
					{
						type: "text",
						text: JSON.stringify(
							{
								companyId: record.companyId ?? null,
								message: record.companyId
									? `現在の事業所ID: ${record.companyId}`
									: "事業所が選択されていません。freee_set_current_company で設定してください。",
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
		"freee_set_current_company",
		{
			description:
				"使用する事業所を設定します。API呼び出し時に company_id として使用されます。",
			inputSchema: {
				company_id: z.number().int().describe("設定する事業所ID"),
			},
		},
		async ({ company_id }) => {
			const updated = { ...record, companyId: company_id };
			await tokenStore.storeTokens(freeeUserId, updated);
			return {
				content: [
					{
						type: "text",
						text: `事業所ID ${company_id} を設定しました。`,
					},
				],
			};
		},
	);
}
