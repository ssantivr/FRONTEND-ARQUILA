import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { resetSaves, trackSave, useProjectSave } from "../state/projectSave";
import { useEditHistory, type Edit } from "./useEditHistory";

beforeEach(() => resetSaves());

function edit(label: string, fail = false): Edit & { apply: ReturnType<typeof vi.fn> } {
    return {
        label,
        apply: vi.fn(() => (fail ? Promise.reject(new Error("Network error")) : Promise.resolve())),
        revert: vi.fn(() => Promise.resolve()),
    };
}

describe("projectSave", () => {
    it("says saving while something is on its way, then saved", async () => {
        const { result } = renderHook(() => useProjectSave(7));
        let finish: () => void = () => undefined;

        let work: Promise<unknown> = Promise.resolve();

        act(() => {
            work = trackSave(7, new Promise<void>((resolve) => (finish = resolve)));
        });
        expect(result.current.state).toBe("saving");

        await act(async () => {
            finish();
            await work;
        });
        expect(result.current.state).toBe("saved");
    });

    it("says error with what failed when any of the writes fails", async () => {
        const { result } = renderHook(() => useProjectSave(7));

        await act(async () => {
            await trackSave(
                7,
                Promise.reject(new Error("Network error")),
                "No se guardó el material",
            ).catch(() => undefined);
        });

        expect(result.current.state).toBe("error");
        expect(result.current.message).toMatch(/^No se guardó el material: /);
    });

    it("keeps the state of one project out of another", async () => {
        const other = renderHook(() => useProjectSave(8));

        await act(async () => {
            await trackSave(7, Promise.resolve());
        });

        expect(other.result.current.state).toBe("idle");
    });
});

describe("useEditHistory", () => {
    it("undoes with the inverse request and redoes with the same one", async () => {
        const { result } = renderHook(() => useEditHistory(7));
        const move = edit("mover Sala");

        await act(() => result.current.run(move));
        expect(result.current.undoLabel).toBe("mover Sala");

        await act(() => result.current.undo());
        expect(move.revert).toHaveBeenCalledTimes(1);
        expect(result.current.undoLabel).toBeNull();
        expect(result.current.redoLabel).toBe("mover Sala");

        await act(() => result.current.redo());
        expect(move.apply).toHaveBeenCalledTimes(2);
        expect(result.current.undoLabel).toBe("mover Sala");
    });

    it("does not record an edit the server refused", async () => {
        const { result } = renderHook(() => useEditHistory(7));

        await act(async () => {
            expect(await result.current.run(edit("mover Sala", true))).toBe(false);
        });

        expect(result.current.undoLabel).toBeNull();
    });

    it("forgets what was undone once a new edit is made", async () => {
        const { result } = renderHook(() => useEditHistory(7));

        await act(() => result.current.run(edit("mover Sala")));
        await act(() => result.current.undo());
        await act(() => result.current.run(edit("material de Sala")));

        expect(result.current.redoLabel).toBeNull();
        expect(result.current.undoLabel).toBe("material de Sala");
    });
});
