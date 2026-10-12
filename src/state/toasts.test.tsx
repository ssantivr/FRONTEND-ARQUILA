import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { dismissToast, showToast, useToasts } from "./toasts";

beforeEach(() => {
    vi.useFakeTimers();
});

afterEach(() => {
    act(() => vi.runAllTimers());
    vi.useRealTimers();
});

describe("toasts", () => {
    it("shows a toast and removes it by itself after a while", () => {
        const { result } = renderHook(() => useToasts());

        act(() => showToast("Proyecto creado."));
        expect(result.current.map((toast) => toast.text)).toEqual(["Proyecto creado."]);

        act(() => vi.advanceTimersByTime(4000));
        expect(result.current).toEqual([]);
    });

    it("removes only the toast that was dismissed", () => {
        const { result } = renderHook(() => useToasts());

        act(() => {
            showToast("Primero");
            showToast("Segundo");
        });
        act(() => dismissToast(result.current[0].id));

        expect(result.current.map((toast) => toast.text)).toEqual(["Segundo"]);
    });
});
