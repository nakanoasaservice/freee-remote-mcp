import type { OAuthHelpers } from "@cloudflare/workers-oauth-provider";

import type { FreeeTokenStoreDO } from "./durable-objects/freee-token-store";
import type { PendingStateDO } from "./durable-objects/pending-state";
import type { DoEnv } from "./types-base";

export type { DoEnv, FreeeTokenRecord } from "./types-base";

export interface Env extends DoEnv {
	OAUTH_KV: KVNamespace;
	FREEE_TOKEN_DO: DurableObjectNamespace<FreeeTokenStoreDO>;
	PENDING_STATE_DO: DurableObjectNamespace<PendingStateDO>;
	/** Injected by @cloudflare/workers-oauth-provider at runtime */
	OAUTH_PROVIDER: OAuthHelpers;
}

/** Application-specific props stored encrypted in the OAuth grant */
export interface Props {
	freeeUserId: string;
}
