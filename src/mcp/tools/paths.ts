import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import accountingSchema from "../../../openapi/minimal/accounting.json";
import hrSchema from "../../../openapi/minimal/hr.json";
import invoiceSchema from "../../../openapi/minimal/invoice.json";
import pmSchema from "../../../openapi/minimal/pm.json";
import smSchema from "../../../openapi/minimal/sm.json";

const API_NAMES = ["accounting", "hr", "invoice", "pm", "sm"] as const;
type ApiName = (typeof API_NAMES)[number];

const schemas: Record<ApiName, { paths: Record<string, unknown> }> = {
	accounting: accountingSchema,
	hr: hrSchema,
	invoice: invoiceSchema,
	pm: pmSchema,
	sm: smSchema,
};

export function registerPathsTools(server: McpServer): void {
	server.registerTool(
		"freee_api_list_paths",
		{
			description:
				"利用可能なfreee APIのパス一覧を取得します。どのAPIパスが使えるか確認するために使用します。",
			inputSchema: {
				api: z
					.enum(API_NAMES)
					.optional()
					.describe(
						"対象API (accounting/hr/invoice/pm/sm)。省略すると全APIのパスを返します。",
					),
				method: z
					.enum(["get", "post", "put", "patch", "delete"])
					.optional()
					.describe(
						"HTTPメソッドでフィルタします。省略すると全メソッドを返します。",
					),
			},
		},
		({ api, method }) => {
			const targets: [ApiName, { paths: Record<string, unknown> }][] = api
				? [[api, schemas[api]]]
				: API_NAMES.map((name) => [name, schemas[name]]);

			const lines: string[] = [];
			for (const [name, schema] of targets) {
				for (const [path, pathItem] of Object.entries(schema.paths)) {
					const methods = Object.keys(
						pathItem as Record<string, unknown>,
					).filter(
						(m) =>
							["get", "post", "put", "patch", "delete"].includes(m) &&
							(!method || m === method),
					);
					for (const m of methods) {
						lines.push(`[${name}] ${m.toUpperCase()} ${path}`);
					}
				}
			}

			return {
				content: [
					{
						type: "text",
						text:
							lines.length > 0
								? lines.join("\n")
								: "No paths found for the specified criteria",
					},
				],
			};
		},
	);
}
