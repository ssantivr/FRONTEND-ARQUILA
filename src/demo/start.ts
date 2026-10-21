import { http, HttpResponse } from "msw";
import { setupWorker } from "msw/browser";

import { createSampleApi } from "../../scripts/api-de-muestra.mjs";

/**
 * `npm run demo`: the app with Casa Mirador and no backend. MSW answers /api in the browser with
 * the sample API that the browser tests use. Only `--mode demo` imports this file, so it never
 * reaches a build; the worker script is served by the development server (vite.config.ts).
 */
export async function startDemo(): Promise<void> {
    const respond = createSampleApi();
    const worker = setupWorker(
        http.all(/\/api\//, async ({ request }) => {
            const url = new URL(request.url);
            const body: unknown =
                request.method === "GET" ? undefined : await request.json().catch(() => undefined);
            const { status, json, headers } = respond(
                request.method,
                url.pathname.replace(/^.*?\/api/, ""),
                url.searchParams,
                () => body,
            );

            return json === undefined
                ? new HttpResponse(null, { status, headers })
                : HttpResponse.json(json, { status, headers });
        }),
    );

    await worker.start({ onUnhandledRequest: "bypass", quiet: true });
    console.info("ARQUILA demo: la API responde con los datos de muestra de Casa Mirador.");
}
