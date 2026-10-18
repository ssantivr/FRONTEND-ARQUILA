// The sample API with the little state a visit needs: whether there is a session, which
// projects were created and where the rooms moved in the 3D editor now are. Shared by the browser tests (Playwright answers each request with it)
// and by `npm run demo` (MSW answers them in the browser). Nothing in this file ships with the
// app: the demo only loads it in `--mode demo`.
import { answer, projects, user } from "./datos-de-muestra.mjs";

/** @param {{ signedIn?: boolean }} [options] */
export function createSampleApi({ signedIn = true } = {}) {
    let session = signedIn;
    const created = [];
    /** Position and size of each room moved or resized with PATCH /rooms/{id}. */
    const roomEdits = new Map();
    const FIELDS = ["x_m", "y_m", "width_m", "depth_m", "height_m"];

    /** A room as the sample data has it, with what was changed on it since. */
    function edited(room) {
        const edit = roomEdits.get(room.id);

        return edit === undefined ? room : { ...room, ...edit };
    }

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

        const roomPatch = /^\/rooms\/(\d+)$/.exec(path);

        if (roomPatch !== null && method === "PATCH") {
            const body = readBody() ?? {};
            const id = Number(roomPatch[1]);
            const edit = { ...roomEdits.get(id) };

            for (const field of FIELDS) {
                if (typeof body[field] === "number") {
                    edit[field] = body[field];
                }
            }

            roomEdits.set(id, edit);

            return { status: 200, json: { id, ...edit } };
        }

        if (method !== "GET") {
            return { status: 204 };
        }

        const json = answer(path, query);

        if (/^\/projects\/\d+\/structure$/.test(path) && Array.isArray(json?.rooms)) {
            return {
                status: 200,
                json: {
                    ...json,
                    rooms: json.rooms.map((room) => (room.kind === "room" ? edited(room) : room)),
                },
            };
        }

        if (/^\/projects\/\d+\/rooms$/.test(path) && Array.isArray(json)) {
            return { status: 200, json: json.map(edited) };
        }

        return { status: 200, json };
    };
}
