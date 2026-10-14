import type { Page } from "@playwright/test";

import { answer, projects, user, type SampleProject } from "../scripts/datos-de-muestra.mjs";

interface MockOptions {
    /** False to start without a session, as someone who has not signed in yet. */
    signedIn?: boolean;
}

/**
 * Answers every call to the API with the sample data, and keeps the little state the flows
 * need: whether there is a session and which projects were created during the test.
 */
export async function mockApi(page: Page, { signedIn = true }: MockOptions = {}): Promise<void> {
    let session = signedIn;
    const created: SampleProject[] = [];

    await page.route("**/api/**", async (route) => {
        const request = route.request();
        const url = new URL(request.url());
        const path = url.pathname.replace(/^\/api/, "");
        const method = request.method();

        if (path === "/auth/login" && method === "POST") {
            session = true;

            return route.fulfill({ json: user });
        }

        if (path === "/auth/logout" && method === "POST") {
            session = false;

            return route.fulfill({ status: 204, body: "" });
        }

        if (!session) {
            return route.fulfill({ status: 401, json: { detail: "Not authenticated" } });
        }

        if (path === "/projects" && method === "POST") {
            const data = request.postDataJSON() as Partial<SampleProject>;
            const project: SampleProject = {
                id: 100 + created.length,
                owner_id: user.id,
                name: data.name ?? "Sin nombre",
                description: data.description ?? null,
                location: data.location ?? null,
                status: data.status ?? "draft",
                created_at: "2026-10-13T12:00:00Z",
                updated_at: "2026-10-13T12:00:00Z",
            };

            created.push(project);

            return route.fulfill({ status: 201, json: project });
        }

        if (path === "/projects" && method === "GET") {
            const wanted = (url.searchParams.get("search") ?? "").toLowerCase();

            return route.fulfill({
                json: [...created, ...projects].filter((project) =>
                    project.name.toLowerCase().includes(wanted),
                ),
            });
        }

        const own = created.find((project) => path === `/projects/${project.id}`);

        if (own !== undefined) {
            return route.fulfill({ json: own });
        }

        if (method !== "GET") {
            return route.fulfill({ status: 204, body: "" });
        }

        return route.fulfill({ json: answer(path, url.searchParams) });
    });
}
