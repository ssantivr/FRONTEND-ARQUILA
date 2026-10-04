import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, SESSION_ENDED_EVENT, apiUrl, request, upload } from "./http";

const fetchMock = vi.fn();
const dispatchEvent = vi.fn();

function respond(status: number, body?: unknown): void {
    fetchMock.mockResolvedValueOnce(
        new Response(body === undefined ? null : JSON.stringify(body), { status }),
    );
}

beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", { dispatchEvent });
});

afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
    dispatchEvent.mockReset();
});

describe("request", () => {
    it("sends the session cookie and returns the JSON body", async () => {
        respond(200, [{ id: 1 }]);

        await expect(request("/projects")).resolves.toEqual([{ id: 1 }]);
        expect(fetchMock).toHaveBeenCalledWith("/api/projects", {
            method: "GET",
            credentials: "include",
            headers: undefined,
            body: undefined,
        });
    });

    it("leaves empty query values out of the address", async () => {
        respond(200, []);

        await request("/materials", { query: { search: "", kind: undefined, limit: 0, page: 2 } });

        expect(fetchMock.mock.calls[0][0]).toBe("/api/materials?limit=0&page=2");
    });

    it("sends the body as JSON", async () => {
        respond(201, { id: 7 });

        await request("/projects", { method: "POST", body: { name: "House" } });

        expect(fetchMock.mock.calls[0][1]).toMatchObject({
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: '{"name":"House"}',
        });
    });

    it("returns nothing for an empty response", async () => {
        respond(204);

        await expect(request("/projects/1", { method: "DELETE" })).resolves.toBeUndefined();
    });

    it("turns the error detail into the message", async () => {
        respond(404, { detail: "Project not found" });

        const error = await request("/projects/9").catch((reason: unknown) => reason);

        expect(error).toBeInstanceOf(ApiError);
        expect(error).toMatchObject({ status: 404, message: "Project not found" });
    });

    it("joins validation issues with their field", async () => {
        respond(422, {
            detail: [
                { loc: ["body", "area_m2"], msg: "must be greater than 0" },
                { loc: ["body"], msg: "invalid payload" },
            ],
        });

        await expect(request("/terrains", { method: "POST", body: {} })).rejects.toThrow(
            "area_m2: must be greater than 0; invalid payload",
        );
    });

    it("falls back to the status when the error is not JSON", async () => {
        fetchMock.mockResolvedValueOnce(new Response("<html>", { status: 502 }));

        await expect(request("/projects")).rejects.toThrow("Request failed with status 502");
    });
});

describe("session end", () => {
    it("is announced when a request is no longer authorized", async () => {
        respond(401, { detail: "Not authenticated" });

        await expect(request("/projects")).rejects.toMatchObject({ status: 401 });
        expect(dispatchEvent).toHaveBeenCalledTimes(1);
        expect(dispatchEvent.mock.calls[0][0].type).toBe(SESSION_ENDED_EVENT);
    });

    it("is not announced for a failed login or for other errors", async () => {
        respond(401, { detail: "Invalid credentials" });
        respond(403, { detail: "Forbidden" });

        await expect(request("/auth/login", { method: "POST", body: {} })).rejects.toThrow();
        await expect(request("/projects/1")).rejects.toThrow();
        expect(dispatchEvent).not.toHaveBeenCalled();
    });
});

describe("upload", () => {
    it("posts the file as form data", async () => {
        respond(201, { id: 3 });
        const file = new File(["data"], "plan.png", { type: "image/png" });

        await expect(upload("/projects/1/files", file)).resolves.toEqual({ id: 3 });

        const [url, options] = fetchMock.mock.calls[0];
        expect(url).toBe("/api/projects/1/files");
        expect(options.method).toBe("POST");
        expect(options.credentials).toBe("include");
        expect((options.body as FormData).get("file")).toBe(file);
    });

    it("reports a rejected file and an ended session", async () => {
        respond(413, { detail: "File is too large" });
        respond(401, { detail: "Not authenticated" });
        const file = new File(["data"], "plan.png");

        await expect(upload("/projects/1/files", file)).rejects.toThrow("File is too large");
        await expect(upload("/projects/1/files", file)).rejects.toBeInstanceOf(ApiError);
        expect(dispatchEvent).toHaveBeenCalledTimes(1);
    });
});

describe("apiUrl", () => {
    it("prefixes the path with the API base", () => {
        expect(apiUrl("/files/4/content")).toBe("/api/files/4/content");
    });
});
