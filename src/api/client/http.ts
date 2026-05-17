import { buildApiUrl } from "./config";

export class ApiError extends Error {
	readonly status: number;
	readonly body?: unknown;

	constructor(message: string, status: number, body?: unknown) {
		super(message);
		this.name = "ApiError";
		this.status = status;
		this.body = body;
	}
}

export type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export interface RequestOptions extends Omit<RequestInit, "body" | "method"> {
	body?: unknown;
}

async function parseBody(response: Response): Promise<unknown> {
	const text = await response.text();
	if (!text) return undefined;
	try {
		return JSON.parse(text) as unknown;
	} catch {
		return text;
	}
}

function errorMessageFromBody(data: unknown, fallback: string): string {
	if (typeof data === "object" && data !== null && "message" in data) {
		const m = (data as { message: unknown }).message;
		if (typeof m === "string" && m.trim()) return m;
	}
	return fallback;
}

export async function request<T>(method: HttpMethod, path: string, options: RequestOptions = {}): Promise<T> {
	const { body, headers, ...rest } = options;
	const url = buildApiUrl(path);
	const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

	const initHeaders: HeadersInit = {
		Accept: "application/json",
		...(body !== undefined && !isFormData ? { "Content-Type": "application/json" } : {}),
		...headers,
	};

	const response = await fetch(url, {
		method,
		headers: initHeaders,
		body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
		credentials: "include",
		...rest,
	});

	const data = await parseBody(response);

	if (!response.ok) {
		const msg = errorMessageFromBody(data, response.statusText || "Request failed");
		throw new ApiError(msg, response.status, data);
	}

	return data as T;
}

export function get<T>(path: string, init?: Omit<RequestOptions, "body">): Promise<T> {
	return request<T>("GET", path, init);
}

export function post<T>(path: string, body?: unknown, init?: Omit<RequestOptions, "body">): Promise<T> {
	return request<T>("POST", path, { ...init, body });
}

export function patch<T>(path: string, body?: unknown, init?: Omit<RequestOptions, "body">): Promise<T> {
	return request<T>("PATCH", path, { ...init, body });
}

export function put<T>(path: string, body?: unknown, init?: Omit<RequestOptions, "body">): Promise<T> {
	return request<T>("PUT", path, { ...init, body });
}

/** HTTP DELETE (named `del` because `delete` is awkward as a bare identifier). */
export function del<T>(path: string, init?: Omit<RequestOptions, "body">): Promise<T> {
	return request<T>("DELETE", path, init);
}
