// The sample API with the little state a visit needs: whether there is a session and which
// projects were created. Shared by the browser tests (Playwright answers each request with it)
// and by `npm run demo` (MSW answers them in the browser). Nothing in this file ships with the
// app: the demo only loads it in `--mode demo`.
import { answer, projects, user } from "./datos-de-muestra.mjs";

/** @param {{ signedIn?: boolean }} [options] */
export function createSampleApi({ signedIn = true } = {}) {
    let session = signedIn;
    const created = [];

    /**
     * @param {string} method
     * @param {string} path the path after /api, such as /projects/1/terrains
     * @param {URLSearchParams} query
     * @param {() => unknown} readBody the JSON body, read only when the request needs it
     * @returns {{ status: number, json?: unknown }}
     */
    return function respond(method, path, query, readBody) {
        if (path === "/auth/login" && method === "POST") {
            session = true;

            return { status: 200, json: user };
        }

        if (path === "/auth/logout" && method === "POST") {
            session = false;

            return { status: 204 };
        }

        if (!session) {
            return { status: 401, json: { detail: "Not authenticated" } };
        }

        if (path === "/projects" && method === "POST") {
            const data = readBody() ?? {};
            const project = {
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

            return { status: 201, json: project };
        }

        if (path === "/projects" && method === "GET") {
            const wanted = (query.get("search") ?? "").toLowerCase();

            return {
                status: 200,
                json: [...created, ...projects].filter((project) =>
                    project.name.toLowerCase().includes(wanted),
                ),
            };
        }

        const own = created.find((project) => path === `/projects/${project.id}`);

        if (own !== undefined) {
            return { status: 200, json: own };
        }

        if (method !== "GET") {
            return { status: 204 };
        }

        return { status: 200, json: answer(path, query) };
    };
}
