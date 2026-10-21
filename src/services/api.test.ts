import { beforeEach, describe, expect, it, vi } from "vitest";

const http = vi.hoisted(() => ({
    request: vi.fn(),
    requestWithTotal: vi.fn(),
    writeListeners: [] as (() => void)[],
}));

vi.mock("./http", async (original) => ({
    ApiError: (await original<typeof import("./http")>()).ApiError,
    isUnavailable: (await original<typeof import("./http")>()).isUnavailable,
    request: http.request,
    requestWithTotal: http.requestWithTotal,
    upload: vi.fn(),
    apiUrl: (path: string) => path,
    onWrite: (listener: () => void) => {
        http.writeListeners.push(listener);

        return () => undefined;
    },
}));

import { ApiError } from "./http";
import { loadAcrossProjects, projectsApi, structureApi } from "./api";

const projects = [{ id: 1 }, { id: 2 }];

function written(): void {
    for (const listener of http.writeListeners) {
        listener();
    }
}

beforeEach(() => {
    written();
    http.request.mockReset();
    http.request.mockResolvedValue(projects);
});

describe("loadAcrossProjects", () => {
    it("asks every project in parallel and joins the lists", async () => {
        const loader = vi.fn((projectId: number) => Promise.resolve([`item-${projectId}`]));

        await expect(loadAcrossProjects(loader)).resolves.toEqual({
            projects,
            items: ["item-1", "item-2"],
        });
        expect(loader).toHaveBeenCalledTimes(2);
    });

    it("reuses the answer for a while instead of asking again", async () => {
        const loader = vi.fn(() => Promise.resolve(["item"]));

        await loadAcrossProjects(loader);
        await loadAcrossProjects(loader);

        expect(http.request).toHaveBeenCalledTimes(1);
        expect(loader).toHaveBeenCalledTimes(2);
    });

    it("asks again after something was written", async () => {
        const loader = vi.fn(() => Promise.resolve(["item"]));

        await loadAcrossProjects(loader);
        written();
        await loadAcrossProjects(loader);

        expect(http.request).toHaveBeenCalledTimes(2);
    });

    it("does not remember a failed load", async () => {
        const loader = vi.fn(() => Promise.resolve(["item"]));

        http.request.mockRejectedValueOnce(new Error("Failed to fetch"));

        await expect(loadAcrossProjects(loader)).rejects.toThrow("Failed to fetch");
        await expect(loadAcrossProjects(loader)).resolves.toEqual({
            projects,
            items: ["item", "item"],
        });
    });
});

describe("structureApi.get", () => {
    const outline = [
        { x_m: 0, y_m: 0 },
        { x_m: 10, y_m: 0 },
        { x_m: 10, y_m: 20 },
    ];
    const model = { project_id: 3, roof: "gable", rooms: [], components: [] };

    beforeEach(() => {
        http.request.mockReset();
    });

    it("adds the slope of each terrain from the list of terrains when the model lacks it", async () => {
        http.request.mockImplementation((path: string) =>
            Promise.resolve(
                path === "/projects/3/structure"
                    ? { ...model, terrains: [{ id: 5, name: "Lote", outline }] }
                    : [{ id: 5, slope_percent: 6 }],
            ),
        );

        const structure = await structureApi.get(3);

        expect(structure.terrains).toEqual([{ id: 5, name: "Lote", outline, slope_percent: 6 }]);
        expect(http.request).toHaveBeenCalledWith("/projects/3/terrains");
    });

    it("asks nothing more once the model brings the slope itself", async () => {
        http.request.mockResolvedValue({
            ...model,
            terrains: [{ id: 5, name: "Lote", outline, slope_percent: 0 }],
        });

        await structureApi.get(3);

        expect(http.request).toHaveBeenCalledTimes(1);
    });

    it("asks nothing more for a model without terrains", async () => {
        http.request.mockResolvedValue({ ...model, terrains: [] });

        await structureApi.get(3);

        expect(http.request).toHaveBeenCalledTimes(1);
    });

    it("still gives the model, drawn flat, when the slopes cannot be read", async () => {
        http.request.mockImplementation((path: string) =>
            path === "/projects/3/structure"
                ? Promise.resolve({ ...model, terrains: [{ id: 5, name: "Lote", outline }] })
                : Promise.reject(new Error("sin red")),
        );

        const structure = await structureApi.get(3);

        expect(structure.terrains[0].slope_percent).toBeNull();
    });
});

describe("projectsApi.page", () => {
    const project = (id: number) => ({ id, name: `P${id}` });

    it("asks the API for one page and takes the total from its header", async () => {
        http.requestWithTotal.mockResolvedValue({
            data: { items: [project(3)], total: 9, page: 2, page_size: 1 },
            total: 9,
        });

        const page = await projectsApi.page({
            page: 2,
            page_size: 1,
            q: "casa",
            archived: false,
            sort: "updated_at",
            order: "desc",
        });

        expect(http.requestWithTotal).toHaveBeenCalledWith("/projects", {
            query: {
                page: 2,
                page_size: 1,
                q: "casa",
                archived: "false",
                sort: "updated_at",
                order: "desc",
            },
        });
        expect(page).toMatchObject({ total: 9, page: 2, paged: true });
    });

    it("cuts the page itself when an older API sends every project", async () => {
        http.requestWithTotal.mockResolvedValue({
            data: [1, 2, 3, 4, 5].map(project),
            total: null,
        });

        const page = await projectsApi.page({ page: 2, page_size: 2 });

        expect(page.items.map((item) => item.id)).toEqual([3, 4]);
        expect(page).toMatchObject({ total: 5, paged: false });
    });
});

describe("projectsApi.archive", () => {
    it("falls back to the state of the project when the API has no archive route", async () => {
        http.request
            .mockRejectedValueOnce(new ApiError(404, "Not Found"))
            .mockResolvedValueOnce({ id: 7, status: "archived" });

        await projectsApi.archive(7);

        expect(http.request).toHaveBeenNthCalledWith(1, "/projects/7/archive", {
            method: "POST",
        });
        expect(http.request).toHaveBeenNthCalledWith(2, "/projects/7", {
            method: "PATCH",
            body: { status: "archived" },
        });
    });

    it("does not hide a project that is missing", async () => {
        http.request.mockRejectedValueOnce(new ApiError(404, "Project not found"));

        await expect(projectsApi.archive(7)).rejects.toThrow("Project not found");
        expect(http.request).toHaveBeenCalledTimes(1);
    });
});
