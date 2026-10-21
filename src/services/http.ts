export const BASE_URL: string = import.meta.env.VITE_API_URL ?? "/api";

export class ApiError extends Error {
    constructor(
        public readonly status: number,
        message: string,
    ) {
        super(message);
        this.name = "ApiError";
    }
}

type QueryParams = Record<string, string | number | undefined>;

interface RequestOptions {
    method?: "GET" | "POST" | "PATCH" | "DELETE";
    query?: QueryParams;
    body?: unknown;
}

function buildUrl(path: string, query?: QueryParams): string {
    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(query ?? {})) {
        if (value !== undefined && value !== "") {
            params.set(key, String(value));
        }
    }

    const queryString = params.toString();
    return `${BASE_URL}${path}${queryString ? `?${queryString}` : ""}`;
}

async function readErrorMessage(response: Response): Promise<string> {
    try {
        const payload: unknown = await response.json();
        const detail = (payload as { detail?: unknown }).detail;

        if (typeof detail === "string") {
            return detail;
        }

        if (Array.isArray(detail)) {
            return detail
                .map((issue: { loc?: unknown[]; msg?: string }) => {
                    const field = issue.loc?.slice(1).join(".");
                    return field ? `${field}: ${issue.msg}` : String(issue.msg);
                })
                .join("; ");
        }
    } catch {}

    return `Request failed with status ${response.status}`;
}

export const SESSION_ENDED_EVENT = "arquila:session-ended";

function notifyIfSessionEnded(path: string, status: number): void {
    if (status === 401 && !path.startsWith("/auth/")) {
        window.dispatchEvent(new Event(SESSION_ENDED_EVENT));
    }
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    return (await send<T>(path, options)).data;
}

/**
 * Like `request`, with the total of a list the API sends in `X-Total-Count` (the number of
 * results with the filters applied, whatever page was asked for), or `null` without the header.
 */
export async function requestWithTotal<T>(
    path: string,
    options: RequestOptions = {},
): Promise<{ data: T; total: number | null }> {
    return send<T>(path, options);
}

/**
 * Whether a failure means that the API in use does not have the route at all: FastAPI answers
 * an unknown path with 404 «Not Found» and a known path with another method with 405. A missing
 * record of a route that exists says what is missing («Project not found»), so it is not this.
 */
export function isUnavailable(reason: unknown): boolean {
    return (
        reason instanceof ApiError &&
        ((reason.status === 404 && reason.message === "Not Found") || reason.status === 405)
    );
}

async function send<T>(
    path: string,
    options: RequestOptions,
): Promise<{ data: T; total: number | null }> {
    const { method = "GET", query, body } = options;

    const response = await fetch(buildUrl(path, query), {
        method,
        credentials: "include",
        headers: body === undefined ? undefined : { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (!response.ok) {
        notifyIfSessionEnded(path, response.status);
        throw new ApiError(response.status, await readErrorMessage(response));
    }

    if (method !== "GET") {
        for (const listener of writeListeners) {
            listener();
        }
    }

    const header = response.headers.get("X-Total-Count");
    const total = header === null || !/^\d+$/.test(header) ? null : Number(header);

    if (response.status === 204) {
        return { data: undefined as T, total };
    }

    return { data: (await response.json()) as T, total };
}

const writeListeners = new Set<() => void>();

/** Runs `listener` after every request that changed something on the server. */
export function onWrite(listener: () => void): () => void {
    writeListeners.add(listener);

    return () => {
        writeListeners.delete(listener);
    };
}

export async function upload<T>(path: string, file: File): Promise<T> {
    const body = new FormData();
    body.append("file", file);

    const response = await fetch(buildUrl(path), { method: "POST", credentials: "include", body });

    if (!response.ok) {
        notifyIfSessionEnded(path, response.status);
        throw new ApiError(response.status, await readErrorMessage(response));
    }

    return (await response.json()) as T;
}

export function apiUrl(path: string): string {
    return buildUrl(path);
}
