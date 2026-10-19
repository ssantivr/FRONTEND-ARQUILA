import type { Page } from "@playwright/test";

import { createSampleApi } from "../scripts/api-de-muestra.mjs";

interface MockOptions {
    /** False to start without a session, as someone who has not signed in yet. */
    signedIn?: boolean;
}

/** Answers every call to the API with the sample API, the same one `npm run demo` uses. */
export async function mockApi(page: Page, { signedIn = true }: MockOptions = {}): Promise<void> {
    const respond = createSampleApi({ signedIn });

    await page.route("**/api/**", async (route) => {
        const request = route.request();
        const url = new URL(request.url());
        const { status, json } = respond(
            request.method(),
            url.pathname.replace(/^\/api/, ""),
            url.searchParams,
            () => request.postDataJSON(),
        );

        return json === undefined
            ? route.fulfill({ status, body: "" })
            : route.fulfill({ status, json });
    });
}
