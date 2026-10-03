const BASE_URL: string = import.meta.env.VITE_API_URL ?? "/api";

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

// FastAPI returns {"detail": "..."} for 404/409 and a list of issues for 422.
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
    } catch {
        // Body was not JSON; fall through to the generic message.
    }

    return `Request failed with status ${response.status}`;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { method = "GET", query, body } = options;

    const response = await fetch(buildUrl(path, query), {
        method,
        headers: body === undefined ? undefined : { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (!response.ok) {
        throw new ApiError(response.status, await readErrorMessage(response));
    }

    if (response.status === 204) {
        return undefined as T;
    }

    return (await response.json()) as T;
}
