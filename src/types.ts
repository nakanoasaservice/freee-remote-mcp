import type { OAuthHelpers } from "@cloudflare/workers-oauth-provider";

export interface Env {
	OAUTH_KV: KVNamespace;
	FREEE_TOKENS: KVNamespace;
	WORKER_URL: string;
	FREEE_CLIENT_ID: string;
	FREEE_CLIENT_SECRET: string;
	/** Injected by @cloudflare/workers-oauth-provider at runtime */
	OAUTH_PROVIDER: OAuthHelpers;
}

/** Application-specific props stored encrypted in the OAuth grant */
export interface Props {
	freeeUserId: string;
}

/** freee token record stored in FREEE_TOKENS KV */
export interface FreeeTokenRecord {
	accessToken: string;
	refreshToken: string;
	expiresAt: number; // Unix timestamp ms
	userId: string;
	companyId?: number;
}
