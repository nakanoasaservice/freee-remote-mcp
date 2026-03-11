import { DurableObject } from "cloudflare:workers";
import type { AuthRequest } from "@cloudflare/workers-oauth-provider";

import type { DoEnv } from "../types-base";

const PENDING_KEY = "oauthReq";

/**
 * Durable Object for OAuth pending state.
 * Atomic get-and-clear prevents duplicate callback processing
 * (freee authorization codes are one-time-use).
 */
export class PendingStateDO extends DurableObject<DoEnv> {
	// Required for Durable Object initialization
	// biome-ignore lint/complexity/noUselessConstructor: Durable Object requires super(ctx, env)
	constructor(ctx: DurableObjectState, env: DoEnv) {
		super(ctx, env);
	}

	/**
	 * Stores the OAuth request info (called from /authorize).
	 */
	async store(oauthReqInfo: AuthRequest): Promise<void> {
		await this.ctx.storage.put(PENDING_KEY, oauthReqInfo);
	}

	/**
	 * Atomically retrieves and deletes the pending state.
	 * Returns null if already cleared (e.g. duplicate callback).
	 */
	async getAndClear(): Promise<AuthRequest | null> {
		const data = (await this.ctx.storage.get<AuthRequest>(PENDING_KEY)) ?? null;
		if (data) {
			await this.ctx.storage.delete(PENDING_KEY);
		}
		return data;
	}
}
