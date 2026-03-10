import type { AuthRequest } from "@cloudflare/workers-oauth-provider";
import { Hono } from "hono";

import { buildFreeeAuthUrl, exchangeFreeeCode } from "./freee/oauth";
import { FreeeTokenStore } from "./freee/token-store";
import type { Env } from "./types";

const app = new Hono<{ Bindings: Env }>();

/**
 * GET /authorize
 * Validates the MCP client's OAuth request, then redirects the user to freee OAuth.
 */
app.get("/authorize", async (c) => {
	const oauthReqInfo = await c.env.OAUTH_PROVIDER.parseAuthRequest(c.req.raw);
	if (!oauthReqInfo.clientId) {
		return c.text("Bad Request: missing client_id", 400);
	}

	// Persist the parsed OAuth request so we can retrieve it after freee callback
	const freeeState = crypto.randomUUID();
	await c.env.FREEE_TOKENS.put(
		`pending:${freeeState}`,
		JSON.stringify(oauthReqInfo),
		{ expirationTtl: 600 },
	);

	return c.redirect(buildFreeeAuthUrl(c.env, freeeState), 302);
});

/**
 * GET /callback
 * Receives freee OAuth callback, exchanges code for freee tokens,
 * stores them in KV, and completes the MCP OAuth flow.
 */
app.get("/callback", async (c) => {
	const { code, state, error } = c.req.query();

	if (error) {
		return c.text(`Authorization denied: ${error}`, 400);
	}
	if (!code || !state) {
		return c.text("Bad Request: missing code or state", 400);
	}

	// Retrieve pending OAuth request
	const oauthReqInfo = await c.env.FREEE_TOKENS.get<AuthRequest>(
		`pending:${state}`,
		"json",
	);
	if (!oauthReqInfo) {
		return c.text("Invalid or expired state", 400);
	}
	await c.env.FREEE_TOKENS.delete(`pending:${state}`);

	// Exchange freee authorization code for tokens
	const freeeTokens = await exchangeFreeeCode(code, c.env);

	// Fetch freee user identity
	const userRes = await fetch("https://api.freee.co.jp/api/1/users/me", {
		headers: { Authorization: `Bearer ${freeeTokens.access_token}` },
	});
	if (!userRes.ok) {
		return c.text("Failed to fetch freee user info", 500);
	}
	const userData = (await userRes.json()) as { user: { id: number } };
	const freeeUserId = String(userData.user.id);

	// Store freee tokens in KV
	const tokenStore = new FreeeTokenStore(c.env.FREEE_TOKENS, c.env);
	await tokenStore.storeTokens(freeeUserId, {
		accessToken: freeeTokens.access_token,
		refreshToken: freeeTokens.refresh_token,
		expiresAt: Date.now() + freeeTokens.expires_in * 1000,
		userId: freeeUserId,
	});

	// Complete the MCP OAuth flow - library issues auth code and redirects to MCP client
	const { redirectTo } = await c.env.OAUTH_PROVIDER.completeAuthorization({
		request: oauthReqInfo,
		userId: freeeUserId,
		metadata: {},
		scope: oauthReqInfo.scope,
		props: { freeeUserId },
	});

	return c.redirect(redirectTo, 302);
});

app.get("/", (c) => {
	return c.json({
		name: "freee Remote MCP Server",
		description:
			"freee APIをMCPプロトコルでリモートアクセスするためのサーバーです",
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

export { app as freeeHandler };
