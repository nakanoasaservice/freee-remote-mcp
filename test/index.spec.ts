import { exports } from "cloudflare:workers";
import { describe, expect, it } from "vite-plus/test";

describe("freee Remote MCP worker", () => {
	it("describes the MCP and OAuth endpoints", async () => {
		const response = await exports.default.fetch("https://example.com/");
		expect(response.status).toBe(200);
		expect(response.headers.get("content-type")).toContain("application/json");
		expect(await response.json()).toMatchObject({
			name: "freee Remote MCP Server",
			endpoints: {
				mcp: "/mcp",
				oauth: {
					register: "/register",
					authorize: "/authorize",
					token: "/token",
					wellKnown: "/.well-known/oauth-authorization-server",
				},
			},
		});
	});

	it("returns 404 for unknown routes", async () => {
		const response = await exports.default.fetch(
			"https://example.com/not-found",
		);
		expect(response.status).toBe(404);
	});
});
