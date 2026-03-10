const FREEE_API_BASE = "https://api.freee.co.jp";

export class FreeeApiClient {
	constructor(private readonly accessToken: string) {}

	private async request(
		method: string,
		path: string,
		options?: {
			params?: Record<string, string>;
			body?: unknown;
		},
	): Promise<unknown> {
		const url = new URL(FREEE_API_BASE + path);
		if (options?.params) {
			for (const [k, v] of Object.entries(options.params)) {
				url.searchParams.set(k, v);
			}
		}

		const res = await fetch(url.toString(), {
			method,
			headers: {
				Authorization: `Bearer ${this.accessToken}`,
				"Content-Type": "application/json",
				Accept: "application/json",
			},
			body: options?.body ? JSON.stringify(options.body) : undefined,
		});

		if (!res.ok) {
			throw new Error(`freee API ${res.status}: ${await res.text()}`);
		}
		return res.json();
	}

	get(path: string, params?: Record<string, string>): Promise<unknown> {
		return this.request("GET", path, { params });
	}

	post(path: string, body: unknown): Promise<unknown> {
		return this.request("POST", path, { body });
	}

	put(path: string, body: unknown): Promise<unknown> {
		return this.request("PUT", path, { body });
	}

	patch(path: string, body: unknown): Promise<unknown> {
		return this.request("PATCH", path, { body });
	}

	delete(path: string): Promise<unknown> {
		return this.request("DELETE", path);
	}
}
