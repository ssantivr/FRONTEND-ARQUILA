// The routes of the contract of 20 October in the sample API: the paged list of projects, its
// edits and archiving, and the tasks, versions and history of a project. They keep their state
// for the visit, like the rest of the sample API. Nothing in this file ships with the app.
import { projectActivity, projectTasks, projectVersions } from "./datos-de-muestra.mjs";

const NOW = "2026-10-21T12:00:00";

/** The same search, filters and order as GET /projects of the API (project_repository.py). */
function pageOf(all, query) {
    const wanted = (query.get("q") ?? "").trim().toLowerCase();
    const status = query.get("status");
    const archived = query.get("archived");
    const sort = query.get("sort") ?? "id";
    const sign = query.get("order") === "desc" ? -1 : 1;
    const page = Number(query.get("page") ?? 1);
    const size = Number(query.get("page_size") ?? 20);
    const found = all
        .filter(
            (project) =>
                (status === null || project.status === status) &&
                (archived === null || (project.status === "archived") === (archived === "true")) &&
                (wanted === "" ||
                    [project.name, project.description, project.location].some((text) =>
                        (text ?? "").toLowerCase().includes(wanted),
                    )),
        )
        .sort((first, second) => {
            const a = first[sort] ?? 0;
            const b = second[sort] ?? 0;
            const order =
                typeof a === "string" ? a.localeCompare(b, "es", { sensitivity: "base" }) : a - b;

            return (order || first.id - second.id) * sign;
        });

    return {
        status: 200,
        json: {
            items: found.slice((page - 1) * size, page * size),
            total: found.length,
            page,
            page_size: size,
        },
        headers: { "X-Total-Count": String(found.length) },
    };
}

/**
 * @param {() => Record<string, unknown>[]} listProjects every project of the visit, as they are now
 * @param {(id: number, changes: Record<string, unknown>) => void} changeProject
 */
export function createProjectWork(listProjects, changeProject) {
    const tasks = projectTasks.map((task) => ({ ...task }));
    const versions = projectVersions.map((version) => ({ ...version }));
    const activity = projectActivity.map((item) => ({ ...item }));
    const previousStatus = new Map();

    function log(projectId, action, entityType, entityId, detail) {
        activity.unshift({
            id: activity.length + 1,
            project_id: projectId,
            user_id: 1,
            action,
            entity_type: entityType,
            entity_id: entityId,
            detail,
            created_at: NOW,
        });
    }

    function projectOf(id) {
        return listProjects().find((project) => project.id === id);
    }

    /** The answer to the request, or `null` when it is not one of these routes. */
    return function respond(method, path, query, readBody) {
        if (
            path === "/projects" &&
            method === "GET" &&
            (query.has("page") || query.has("page_size"))
        ) {
            return pageOf(listProjects(), query);
        }

        const [, projectText, rest] = /^\/projects\/(\d+)(?:\/([\w-]+))?$/.exec(path) ?? [];
        const projectId = Number(projectText);

        if (projectText !== undefined && projectOf(projectId) === undefined) {
            return null;
        }

        if (projectText !== undefined && rest === undefined) {
            if (method === "GET") {
                return { status: 200, json: projectOf(projectId) };
            }

            if (method === "PATCH") {
                const changes = { ...(readBody() ?? {}) };

                if (changes.status === "archived") {
                    previousStatus.set(projectId, projectOf(projectId).status);
                    changes.archived_at = NOW;
                } else if (changes.status !== undefined) {
                    changes.archived_at = null;
                }

                changeProject(projectId, { ...changes, updated_at: NOW });
                log(projectId, "updated", "project", projectId, {
                    label: projectOf(projectId).name,
                    fields: Object.keys(readBody() ?? {}),
                });

                return { status: 200, json: projectOf(projectId) };
            }
        }

        if (rest === "archive" && method === "POST") {
            const project = projectOf(projectId);

            if (project.status !== "archived") {
                previousStatus.set(projectId, project.status);
                changeProject(projectId, { status: "archived", archived_at: NOW, updated_at: NOW });
                log(projectId, "archived", "project", projectId, {
                    previous_status: project.status,
                });
            }

            return { status: 200, json: projectOf(projectId) };
        }

        if (rest === "unarchive" && method === "POST") {
            if (projectOf(projectId).status === "archived") {
                changeProject(projectId, {
                    status: previousStatus.get(projectId) ?? "active",
                    archived_at: null,
                    updated_at: NOW,
                });
                log(projectId, "unarchived", "project", projectId, {});
            }

            return { status: 200, json: projectOf(projectId) };
        }

        if (rest === "tasks") {
            if (method === "GET") {
                const status = query.get("status");

                return {
                    status: 200,
                    json: tasks.filter(
                        (task) =>
                            task.project_id === projectId &&
                            (status === null || task.status === status),
                    ),
                };
            }

            if (method === "POST") {
                const data = readBody() ?? {};
                const status = data.status ?? "todo";
                const task = {
                    id: Math.max(0, ...tasks.map((item) => item.id)) + 1,
                    project_id: projectId,
                    title: data.title,
                    description: data.description ?? null,
                    status,
                    assignee_id: data.assignee_id ?? null,
                    due_date: data.due_date ?? null,
                    progress: status === "done" ? 100 : (data.progress ?? 0),
                    created_by: 1,
                    created_at: NOW,
                    updated_at: NOW,
                };

                tasks.push(task);
                log(projectId, "created", "task", task.id, { label: task.title });

                return { status: 201, json: task };
            }
        }

        const taskMatch = /^\/tasks\/(\d+)$/.exec(path);

        if (taskMatch !== null) {
            const index = tasks.findIndex((task) => task.id === Number(taskMatch[1]));

            if (index === -1) {
                return { status: 404, json: { detail: "Task not found" } };
            }

            const task = tasks[index];

            if (method === "PATCH") {
                const data = readBody() ?? {};

                if (
                    data.status === "done" &&
                    data.progress !== undefined &&
                    data.progress !== 100
                ) {
                    return {
                        status: 422,
                        json: { detail: "A task that is done must have a progress of 100" },
                    };
                }

                Object.assign(task, data, { updated_at: NOW });

                if (task.status === "done") {
                    task.progress = 100;
                }

                log(task.project_id, "updated", "task", task.id, {
                    label: task.title,
                    fields: Object.keys(data),
                });

                return { status: 200, json: task };
            }

            if (method === "DELETE") {
                tasks.splice(index, 1);
                log(task.project_id, "deleted", "task", task.id, { label: task.title });

                return { status: 204 };
            }
        }

        if (rest === "versions") {
            if (method === "GET") {
                return {
                    status: 200,
                    json: versions
                        .filter((version) => version.project_id === projectId)
                        .sort((first, second) => second.version_number - first.version_number),
                };
            }

            if (method === "POST") {
                const own = versions.filter((version) => version.project_id === projectId);
                const version = {
                    id: Math.max(0, ...versions.map((item) => item.id)) + 1,
                    project_id: projectId,
                    version_number: own.length + 1,
                    label: (readBody() ?? {}).label ?? null,
                    created_by: 1,
                    created_at: NOW,
                    contents: {
                        tasks: tasks.filter((task) => task.project_id === projectId).length,
                    },
                };

                versions.push(version);
                log(projectId, "version_saved", "version", version.id, {
                    version_number: version.version_number,
                });

                return { status: 201, json: version };
            }
        }

        const versionMatch = /^\/versions\/(\d+)(\/restore)?$/.exec(path);

        if (versionMatch !== null) {
            const version = versions.find((item) => item.id === Number(versionMatch[1]));

            if (version === undefined) {
                return { status: 404, json: { detail: "Version not found" } };
            }

            if (versionMatch[2] === undefined && method === "GET") {
                const project = projectOf(version.project_id);

                return {
                    status: 200,
                    json: {
                        ...version,
                        snapshot: {
                            project: {
                                description: project.description,
                                location: project.location,
                                progress: project.progress ?? 0,
                            },
                        },
                    },
                };
            }

            if (versionMatch[2] !== undefined && method === "POST") {
                const own = versions.filter((item) => item.project_id === version.project_id);
                const backup = {
                    ...version,
                    id: Math.max(0, ...versions.map((item) => item.id)) + 1,
                    version_number: own.length + 1,
                    label: `Before restoring version ${version.version_number}`,
                    created_at: NOW,
                };

                versions.push(backup);
                log(version.project_id, "version_restored", "version", version.id, {
                    version_number: version.version_number,
                    backup_version_id: backup.id,
                });

                return { status: 200, json: projectOf(version.project_id) };
            }
        }

        if (rest === "activity" && method === "GET") {
            const page = Number(query.get("page") ?? 1);
            const size = Number(query.get("page_size") ?? 50);
            const own = activity.filter((item) => item.project_id === projectId);

            return {
                status: 200,
                json: {
                    items: own.slice((page - 1) * size, page * size),
                    total: own.length,
                    page,
                    page_size: size,
                },
            };
        }

        return null;
    };
}
