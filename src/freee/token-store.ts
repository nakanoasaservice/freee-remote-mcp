import type { Env, FreeeTokenRecord } from "../types";
import { refreshFreeeTokens } from "./oauth";

const TOKEN_KEY_PREFIX = "token:";
const TOKEN_TTL = 90 * 24 * 3600; // 90 days (freee refresh token lifetime)
const REFRESH_BUFFER_MS = 5 * 60 * 1000; // Refresh 5 minutes before expiry

export class FreeeTokenStore {
	constructor(
		private readonly kv: KVNamespace,
		private readonly env: Env,
	) {}

	async storeTokens(userId: string, record: FreeeTokenRecord): Promise<void> {
		await this.kv.put(`${TOKEN_KEY_PREFIX}${userId}`, JSON.stringify(record), {
			expirationTtl: TOKEN_TTL,
		});
	}

	async getTokens(userId: string): Promise<FreeeTokenRecord | null> {
		return this.kv.get<FreeeTokenRecord>(
			`${TOKEN_KEY_PREFIX}${userId}`,
			"json",
		);
	}

	async deleteTokens(userId: string): Promise<void> {
		await this.kv.delete(`${TOKEN_KEY_PREFIX}${userId}`);
	}

	/**
	 * Returns fresh tokens, refreshing if the access token is near expiry.
	 * freee refresh tokens are one-time-use: a new refresh token is returned
	 * after each refresh and must be saved immediately.
	 */
	async ensureFresh(
		userId: string,
		record: FreeeTokenRecord,
	): Promise<FreeeTokenRecord> {
		if (record.expiresAt - Date.now() > REFRESH_BUFFER_MS) {
			return record;
		}

		const newTokens = await refreshFreeeTokens(record.refreshToken, this.env);
		const newRecord: FreeeTokenRecord = {
			accessToken: newTokens.access_token,
			refreshToken: newTokens.refresh_token, // Must save the new one-time-use token
			expiresAt: Date.now() + newTokens.expires_in * 1000,
			userId,
			companyId: record.companyId,
		};
		await this.storeTokens(userId, newRecord);
		return newRecord;
	}
}
