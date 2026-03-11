import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";

import type { FreeeTokenStoreDO } from "../durable-objects/freee-token-store";
import { FreeeApiClient } from "../freee/client";
import type { Env, Props } from "../types";
import { registerApiTools } from "./tools/api";
import { registerAuthTools } from "./tools/auth";
import { registerCompanyTools } from "./tools/company";
import { registerPathsTools } from "./tools/paths";
import { registerUserTools } from "./tools/user";

/**
 * MCP API handler - stateless mode.
 * Receives authenticated requests from @cloudflare/workers-oauth-provider.
 * Props (containing freeeUserId) are available via ctx.props.
 */
export const mcpApiHandler = {
	async fetch(
		request: Request,
		env: Env,
		ctx: ExecutionContext,
	): Promise<Response> {
		// Stateless mode: reject GET SSE streams.
		// GET /mcp with Accept: text/event-stream creates a ReadableStream that never closes,
		// causing Cloudflare Workers to detect a "hung" request.
		// Returning 405 signals to MCP clients that they must use POST-only mode.
		if (request.method !== "POST") {
			return new Response(
				JSON.stringify({
					jsonrpc: "2.0",
					error: {
						code: -32000,
						message: "Method Not Allowed: this server is stateless, use POST",
					},
					id: null,
				}),
				{
					status: 405,
					headers: {
						"Content-Type": "application/json",
						Allow: "POST",
					},
				},
			);
		}

		const props = (ctx as ExecutionContext & { props: Props }).props;

		const tokenStub = env.FREEE_TOKEN_DO.get(
			env.FREEE_TOKEN_DO.idFromName(`user-${props.freeeUserId}`),
		) as DurableObjectStub<FreeeTokenStoreDO>;

		// Fetch freee tokens (auto-refresh if near expiry, single-flight in DO)
		const freshRecord = await tokenStub.ensureFresh();
		if (!freshRecord) {
			return new Response(
				JSON.stringify({ error: "Token not found. Please re-authenticate." }),
				{
					status: 401,
					headers: { "Content-Type": "application/json" },
				},
			);
		}

		const freeeClient = new FreeeApiClient(freshRecord.accessToken);

		// Create a fresh McpServer per request (stateless)
		const server = new McpServer({
			name: "freee-mcp",
			version: "1.0.0",
		});

		registerApiTools(server, freeeClient);
		registerPathsTools(server);
		registerAuthTools(server, freshRecord, tokenStub);
		registerCompanyTools(server, freeeClient, freshRecord, tokenStub);

		registerUserTools(server, freeeClient);

		// Use Web Standard Streamable HTTP transport (stateless mode)
		const transport = new WebStandardStreamableHTTPServerTransport({
			sessionIdGenerator: undefined, // Stateless: no session IDs
			enableJsonResponse: true,
		});

		await server.connect(transport);
		return transport.handleRequest(request);
	},
};
