import { describe, expect, it, vi } from "vitest";

import { createResources } from "./resources";

describe("resources", () => {
    it("frees everything once, the last one registered first", () => {
        const resources = createResources();
        const order: string[] = [];
        const first = { dispose: vi.fn(() => order.push("first")) };
        const second = { dispose: vi.fn(() => order.push("second")) };

        expect(resources.track(first)).toBe(first);
        resources.track(second);
        resources.track(second);
        expect(resources.count()).toBe(2);

        resources.disposeAll();
        resources.disposeAll();

        expect(order).toEqual(["second", "first"]);
        expect(resources.count()).toBe(0);
    });

    it("frees one resource ahead of time and not again at the end", () => {
        const resources = createResources();
        const item = { dispose: vi.fn() };

        resources.track(item);
        resources.release(item);
        resources.release(item);
        resources.disposeAll();

        expect(item.dispose).toHaveBeenCalledTimes(1);
    });
});
