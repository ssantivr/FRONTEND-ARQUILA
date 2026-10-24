import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let systemLight = false;

beforeEach(() => {
    window.localStorage.clear();
    delete document.documentElement.dataset.motion;
    vi.resetModules();
    window.matchMedia = ((query: string) => ({
        matches: query.includes("prefers-color-scheme: light") ? systemLight : false,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
    })) as unknown as typeof window.matchMedia;
});

afterEach(() => {
    Reflect.deleteProperty(window, "matchMedia");
});

describe("theme preference", () => {
    it("follows the system until the user picks a theme", async () => {
        systemLight = true;

        const theme = await import("./theme");

        expect(theme.getThemePreference()).toBe("auto");
        expect(theme.getTheme()).toBe("light");
        expect(document.documentElement.dataset.theme).toBe("light");
    });

    it("keeps a chosen theme and can go back to automatic", async () => {
        systemLight = true;

        const theme = await import("./theme");

        theme.setThemePreference("dark");
        expect(theme.getTheme()).toBe("dark");
        expect(window.localStorage.getItem("arquila:theme")).toBe("dark");

        theme.setThemePreference("auto");
        expect(theme.getTheme()).toBe("light");
    });

    it("comes back as it was left, from the stored preference", async () => {
        systemLight = true;
        window.localStorage.setItem("arquila:theme", "dark");

        const theme = await import("./theme");

        expect(theme.getThemePreference()).toBe("dark");
        expect(document.documentElement.dataset.theme).toBe("dark");
    });

    it("updates what is on screen without a reload", async () => {
        systemLight = true;

        const theme = await import("./theme");
        const { result } = renderHook(() => theme.useTheme());

        expect(result.current).toBe("light");

        act(() => theme.setThemePreference("dark"));

        expect(result.current).toBe("dark");
        expect(document.documentElement.dataset.theme).toBe("dark");
    });
});

describe("reduced motion", () => {
    it("marks the page and answers yes while the user's switch is on", async () => {
        const motion = await import("./motion");

        expect(motion.prefersReducedMotion()).toBe(false);

        motion.setReduceMotion(true);

        expect(document.documentElement.dataset.motion).toBe("reduced");
        expect(motion.prefersReducedMotion()).toBe(true);

        motion.setReduceMotion(false);

        expect(document.documentElement.dataset.motion).toBeUndefined();
    });

    it("remembers the switch for the next visit", async () => {
        (await import("./motion")).setReduceMotion(true);
        vi.resetModules();

        expect((await import("./motion")).getReduceMotion()).toBe(true);
    });
});
