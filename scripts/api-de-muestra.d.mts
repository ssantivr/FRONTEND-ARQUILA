/** The sample API with its session and created projects. Typed for the browser tests and the demo. */
export interface SampleAnswer {
    status: number;
    json?: unknown;
    headers?: Record<string, string>;
}

export function createSampleApi(options?: {
    signedIn?: boolean;
}): (method: string, path: string, query: URLSearchParams, readBody: () => unknown) => SampleAnswer;
