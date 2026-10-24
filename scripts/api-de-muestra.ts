// The sample API with the little state a visit needs: whether there is a session, which
// projects were created and where the rooms moved in the 3D editor now are. Shared by the browser tests (Playwright answers each request with it)
// and by `npm run demo` (MSW answers them in the browser). Nothing in this file ships with the
// app: the demo only loads it in `--mode demo`.
import type { Project, ProjectCreate, Room, Structure } from "../src/types/api.ts";
import { answer, projects, user } from "./datos-de-muestra.ts";
import { createProjectWork } from "./gestion-de-muestra.ts";

/** What the sample API answers to one request. */
export interface SampleAnswer {
    status: number;
    json?: unknown;
    headers?: Record<string, string>;
}

const FIELDS = ["x_m", "y_m", "width_m", "depth_m", "height_m"] as const;

/** The position and size of a room, as far as PATCH /rooms/{id} changed them. */
type RoomEdit = Partial<Pick<Room, (typeof FIELDS)[number]>>;

export function createSampleApi({ signedIn = true }: { signedIn?: boolean } = {}) {
    let session = signedIn;
    const created: Project[] = [];
    /** Position and size of each room moved or resized with PATCH /rooms/{id}. */
    const roomEdits = new Map<number, RoomEdit>();
    /** What was changed on each sample project during the visit (PATCH, archive…). */
    const projectEdits = new Map<number, Partial<Project>>();

    function listProjects(): Project[] {
        return [...created, ...projects].map((project) => ({
            ...project,
            ...projectEdits.get(project.id),
        }));
    }

    const work = createProjectWork(listProjects, (id, changes) =>
        projectEdits.set(id, { ...projectEdits.get(id), ...changes }),
    );

    /** A room as the sample data has it, with what was changed on it since. */
    function edited<Item extends { id: number }>(room: Item): Item {
        const edit = roomEdits.get(room.id);

        return edit === undefined ? room : { ...room, ...edit };
    }

    /**
     * @param path the path after /api, such as /projects/1/terrains
     * @param readBody the JSON body, read only when the request needs it
     */
    return function respond(
        method: string,
        path: string,
        query: URLSearchParams,
        readBody: () => unknown,
    ): SampleAnswer {
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

        const managed = work(method, path, query, readBody);

        if (managed !== null) {
            return managed;
        }

        if (path === "/projects" && method === "POST") {
            const data = (readBody() ?? {}) as Partial<ProjectCreate>;
            const project: Project = {
                id: 100 + created.length,
                owner_id: user.id,
                name: data.name ?? "Sin nombre",
                description: data.description ?? null,
                location: data.location ?? null,
                status: data.status ?? "draft",
                created_at: "2026-10-13T12:00:00Z",
                updated_at: "2026-10-13T12:00:00Z",
                progress: 0,
                archived_at: null,
                cover_file_id: null,
            };

            created.push(project);

            return { status: 201, json: project };
        }

        if (path === "/projects" && method === "GET") {
            const wanted = (query.get("search") ?? "").toLowerCase();

            return {
                status: 200,
                json: listProjects().filter((project) =>
                    project.name.toLowerCase().includes(wanted),
                ),
            };
        }

        const copied = /^\/projects\/(\d+)\/duplicate$/.exec(path);

        if (copied !== null && method === "POST") {
            const source = [...created, ...projects].find(
                (project) => project.id === Number(copied[1]),
            );

            if (source === undefined) {
                return { status: 404, json: { detail: "Project not found" } };
            }

            const project: Project = {
                ...source,
                id: 100 + created.length,
                name: `${source.name} (copia)`,
                status: "draft",
                updated_at: "2026-10-13T12:00:00Z",
            };

            created.push(project);

            return { status: 201, json: project };
        }

        const own = created.find((project) => path === `/projects/${project.id}`);

        if (own !== undefined) {
            return { status: 200, json: own };
        }

        const roomPatch = /^\/rooms\/(\d+)$/.exec(path);

        if (roomPatch !== null && method === "PATCH") {
            const body = (readBody() ?? {}) as Record<string, unknown>;
            const id = Number(roomPatch[1]);
            const edit: RoomEdit = { ...roomEdits.get(id) };

            for (const field of FIELDS) {
                const value = body[field];

                if (typeof value === "number") {
                    edit[field] = value;
                }
            }

            roomEdits.set(id, edit);

            return { status: 200, json: { id, ...edit } };
        }

        if (method !== "GET") {
            return { status: 204 };
        }

        const json = answer(path, query);

        if (
            /^\/projects\/\d+\/structure$/.test(path) &&
            Array.isArray((json as Partial<Structure> | null)?.rooms)
        ) {
            const structure = json as Structure;

            return {
                status: 200,
                json: {
                    ...structure,
                    rooms: structure.rooms.map((room) =>
                        room.kind === "room" ? edited(room) : room,
                    ),
                },
            };
        }

        if (/^\/projects\/\d+\/rooms$/.test(path) && Array.isArray(json)) {
            return { status: 200, json: (json as Room[]).map((room) => edited(room)) };
        }

        return { status: 200, json };
    };
}
