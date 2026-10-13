import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { dismissToast, leaveToast, pauseToast, resumeToast, showToast, useToasts } from "./toasts";

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

    it("marks a toast as leaving for a moment before it goes", () => {
        const { result } = renderHook(() => useToasts());

        act(() => showToast("Terreno guardado."));
        act(() => leaveToast(result.current[0].id));

        expect(result.current[0].leaving).toBe(true);

        act(() => vi.advanceTimersByTime(180));
        expect(result.current).toEqual([]);
    });

    it("waits while the pointer is on it and goes on with the time that was left", () => {
        const { result } = renderHook(() => useToasts());

        act(() => showToast("Material agregado."));
        const id = result.current[0].id;

        act(() => vi.advanceTimersByTime(3000));
        act(() => pauseToast(id));
        act(() => vi.advanceTimersByTime(10_000));

        expect(result.current.map((toast) => toast.text)).toEqual(["Material agregado."]);

        act(() => resumeToast(id));
        act(() => vi.advanceTimersByTime(999));
        expect(result.current).toHaveLength(1);

        act(() => vi.advanceTimersByTime(1));
        expect(result.current).toEqual([]);
    });
});
