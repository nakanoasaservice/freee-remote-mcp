import OAuthProvider from "@cloudflare/workers-oauth-provider";

import { freeeHandler } from "./freee-handler";
import { mcpApiHandler } from "./mcp/handler";
import type { Env } from "./types";

/**
 * freee Remote MCP Server
 *
 * Architecture:
 * - OAuthProvider handles RFC 7591 DCR, OAuth 2.1 with PKCE, token management
 * - freeeHandler (Hono) handles /authorize and /callback routes
 * - mcpApiHandler handles authenticated /mcp requests
 *
 * Required KV bindings: OAUTH_KV, FREEE_TOKENS
 * Required secrets: FREEE_CLIENT_ID, FREEE_CLIENT_SECRET
 * Required vars: WORKER_URL
 */
export default new OAuthProvider<Env>({
	// MCP endpoint - requires valid Bearer token
	apiRoute: "/mcp",
	apiHandler: mcpApiHandler,

	// Default handler - Hono app for /authorize, /callback, and other routes
	defaultHandler: freeeHandler,

	// OAuth endpoints
	authorizeEndpoint: "/authorize",
	tokenEndpoint: "/token",
	clientRegistrationEndpoint: "/register",

	// Token lifetimes
	accessTokenTTL: 6 * 3600, // 6 hours (matches freee access token lifetime)
	refreshTokenTTL: 90 * 24 * 3600, // 90 days (matches freee refresh token lifetime)

	// Scopes
	scopesSupported: ["read", "write"],

	// Require S256 PKCE (more secure than plain)
	allowPlainPKCE: false,
});
