import type { Env } from "../types";

const FREEE_AUTH_URL =
	"https://accounts.secure.freee.co.jp/public_api/authorize";
const FREEE_TOKEN_URL = "https://accounts.secure.freee.co.jp/public_api/token";

export function buildFreeeAuthUrl(env: Env, state: string): string {
	const url = new URL(FREEE_AUTH_URL);
	url.searchParams.set("client_id", env.FREEE_CLIENT_ID);
	url.searchParams.set("redirect_uri", `${env.WORKER_URL}/callback`);
	url.searchParams.set("response_type", "code");
	url.searchParams.set("state", state);
	// freee公式: 必要パラメータ。scopeはアプリ登録時に設定され、authorizeでは非サポートの可能性あり
	url.searchParams.set("prompt", "select_company");
	return url.toString();
}

interface FreeeTokenResponse {
	access_token: string;
	refresh_token: string;
	expires_in: number;
	token_type: string;
}

export async function exchangeFreeeCode(
	code: string,
	env: Env,
): Promise<FreeeTokenResponse> {
	const res = await fetch(FREEE_TOKEN_URL, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			grant_type: "authorization_code",
			client_id: env.FREEE_CLIENT_ID,
			client_secret: env.FREEE_CLIENT_SECRET,
			code,
			redirect_uri: `${env.WORKER_URL}/callback`,
		}),
	});
	if (!res.ok) {
		throw new Error(`freee token exchange failed: ${await res.text()}`);
	}
	return res.json() as Promise<FreeeTokenResponse>;
}

export async function refreshFreeeTokens(
	refreshToken: string,
	env: Env,
): Promise<FreeeTokenResponse> {
	const res = await fetch(FREEE_TOKEN_URL, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			grant_type: "refresh_token",
			client_id: env.FREEE_CLIENT_ID,
			client_secret: env.FREEE_CLIENT_SECRET,
			refresh_token: refreshToken, // One-time use: new refresh token returned
		}),
	});
	if (!res.ok) {
		throw new Error(`freee token refresh failed: ${await res.text()}`);
	}
	return res.json() as Promise<FreeeTokenResponse>;
}
