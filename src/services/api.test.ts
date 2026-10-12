import { beforeEach, describe, expect, it, vi } from "vitest";

const http = vi.hoisted(() => ({
    request: vi.fn(),
    writeListeners: [] as (() => void)[],
}));

vi.mock("./http", () => ({
    request: http.request,
    upload: vi.fn(),
    apiUrl: (path: string) => path,
    onWrite: (listener: () => void) => {
        http.writeListeners.push(listener);

        return () => undefined;
    },
}));

import { loadAcrossProjects } from "./api";

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
