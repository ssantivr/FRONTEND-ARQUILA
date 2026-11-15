import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { activityApi } from "./activityApi";

const fetchMock = vi.fn();

beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", { dispatchEvent: vi.fn(), location: { pathname: "/" } });
    fetchMock.mockResolvedValue(
        new Response(JSON.stringify({ items: [], total: 0, page: 1, page_size: 20 }), {
            status: 200,
        }),
    );
});

afterEach(() => {
    vi.unstubAllGlobals();
});

function sentQuery(): URLSearchParams {
    return new URL(String(fetchMock.mock.calls[0][0]), "http://localhost").searchParams;
}

describe("activityApi.listByProject", () => {
    it("sends every filter under the name the API reads", async () => {
        await activityApi.listByProject(7, 2, 20, {
            origin: "ai",
            sourceModule: "viewer",
            from: "2026-11-10T05:00:00.000Z",
            to: "2026-11-12T05:00:00.000Z",
        });

        expect(String(fetchMock.mock.calls[0][0])).toContain("/projects/7/activity?");
        expect(Object.fromEntries(sentQuery())).toEqual({
            page: "2",
            page_size: "20",
            origin: "ai",
            source_module: "viewer",
            from: "2026-11-10T05:00:00.000Z",
            to: "2026-11-12T05:00:00.000Z",
        });
    });

    it("leaves out the filters that are not set", async () => {
        await activityApi.listByProject(7);

        expect(Object.fromEntries(sentQuery())).toEqual({ page: "1", page_size: "50" });
    });
});
