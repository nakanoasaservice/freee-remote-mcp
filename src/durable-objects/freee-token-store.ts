import { DurableObject } from "cloudflare:workers";

import { refreshFreeeTokens } from "../freee/oauth";
import type { DoEnv, FreeeTokenRecord } from "../types-base";

const TOKEN_KEY = "token";
const REFRESH_BUFFER_MS = 5 * 60 * 1000; // Refresh 5 minutes before expiry

/**
 * Durable Object for freee token storage per user.
 * Serializes all token operations and implements single-flight refresh
 * to prevent concurrent refresh races (freee refresh tokens are one-time-use).
 */
export class FreeeTokenStoreDO extends DurableObject<DoEnv> {
	private refreshPromise: Promise<FreeeTokenRecord> | null = null;

	// Required for Durable Object initialization
	// biome-ignore lint/complexity/noUselessConstructor: DurableObject requires super(ctx, env)
	constructor(ctx: DurableObjectState, env: DoEnv) {
		super(ctx, env);
	}

	/**
	 * Returns fresh tokens, refreshing if the access token is near expiry.
	 * Single-flight: concurrent calls share the same refresh operation.
	 */
	async ensureFresh(): Promise<FreeeTokenRecord | null> {
		const record =
			(await this.ctx.storage.get<FreeeTokenRecord>(TOKEN_KEY)) ?? null;
		if (!record) return null;

		if (record.expiresAt - Date.now() > REFRESH_BUFFER_MS) {
			return record;
		}

		if (this.refreshPromise) {
			return this.refreshPromise;
		}

		this.refreshPromise = this.doRefresh(record);
		try {
			const result = await this.refreshPromise;
			await this.ctx.storage.put(TOKEN_KEY, result);
			return result;
		} finally {
			this.refreshPromise = null;
		}
	}

	private async doRefresh(record: FreeeTokenRecord): Promise<FreeeTokenRecord> {
		const newTokens = await refreshFreeeTokens(record.refreshToken, this.env);
		return {
			accessToken: newTokens.access_token,
			refreshToken: newTokens.refresh_token,
			expiresAt: Date.now() + newTokens.expires_in * 1000,
			userId: record.userId,
			companyId: record.companyId,
		};
	}

	/**
	 * Stores initial tokens (called from OAuth callback).
	 */
	async storeInitial(record: FreeeTokenRecord): Promise<void> {
		await this.ctx.storage.put(TOKEN_KEY, record);
	}

	/**
	 * Updates only companyId (atomic read-modify-write).
	 */
	async updateCompanyId(companyId: number): Promise<void> {
		const record =
			(await this.ctx.storage.get<FreeeTokenRecord>(TOKEN_KEY)) ?? null;
		if (!record) throw new Error("Token not found");
		await this.ctx.storage.put(TOKEN_KEY, { ...record, companyId });
	}

	/**
	 * Deletes stored tokens.
	 */
	async deleteTokens(): Promise<void> {
		await this.ctx.storage.delete(TOKEN_KEY);
	}
}
