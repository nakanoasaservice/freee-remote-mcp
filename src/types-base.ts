/** Env for Durable Objects (FREEE_*, WORKER_URL) */
export interface DoEnv {
	WORKER_URL: string;
	FREEE_CLIENT_ID: string;
	FREEE_CLIENT_SECRET: string;
}

/** freee token record stored in Durable Object */
export interface FreeeTokenRecord {
	accessToken: string;
	refreshToken: string;
	expiresAt: number; // Unix timestamp ms
	userId: string;
	companyId?: number;
}
