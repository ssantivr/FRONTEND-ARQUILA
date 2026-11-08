import { describe, expect, it } from "vitest";

import type { DeletedItem } from "../../types/api";
import { INITIAL_REDO, nextRedo, redoReducer, type RedoState } from "./redoStack";

const STEEL: DeletedItem = { kind: "material", label: "Acero" };
const SLAB: DeletedItem = { kind: "material", label: "Losa" };
const KITCHEN: DeletedItem = { kind: "room", label: "Cocina" };

function run(...steps: Parameters<typeof redoReducer>[1][]): RedoState {
    return steps.reduce(redoReducer, INITIAL_REDO);
}

describe("redo stack", () => {
    it("starts with nothing to redo", () => {
        expect(nextRedo(INITIAL_REDO)).toBeUndefined();
        expect(nextRedo(run({ type: "observed", list: [STEEL] }))).toBeUndefined();
    });

    it("offers what undo restored, last first", () => {
        const state = run(
            { type: "observed", list: [STEEL, SLAB] },
            { type: "undone", restored: STEEL, listBefore: [STEEL, SLAB] },
            { type: "observed", list: [SLAB] },
            { type: "undone", restored: SLAB, listBefore: [SLAB] },
            { type: "observed", list: [] },
        );

        expect(state.items).toEqual([STEEL, SLAB]);
        expect(nextRedo(state)).toEqual(SLAB);
    });

    it("takes the item off once redone, and the list showing it again is expected", () => {
        const state = run(
            { type: "observed", list: [STEEL] },
            { type: "undone", restored: STEEL, listBefore: [STEEL] },
            { type: "observed", list: [] },
            { type: "redone", item: STEEL },
            { type: "observed", list: [STEEL] },
        );

        expect(nextRedo(state)).toBeUndefined();
        expect(state.items).toEqual([]);
    });

    it("forgets everything when a new deletion shows up, as the server does", () => {
        const state = run(
            { type: "observed", list: [STEEL] },
            { type: "undone", restored: STEEL, listBefore: [STEEL] },
            { type: "observed", list: [] },
            { type: "observed", list: [KITCHEN] },
        );

        expect(nextRedo(state)).toBeUndefined();
    });

    it("keeps it when the list is read again without changes (an edit, not a deletion)", () => {
        const state = run(
            { type: "observed", list: [STEEL, SLAB] },
            { type: "undone", restored: STEEL, listBefore: [STEEL, SLAB] },
            { type: "observed", list: [SLAB] },
            { type: "observed", list: [SLAB] },
        );

        expect(nextRedo(state)).toEqual(STEEL);
    });

    it("forgets everything when the server says there is nothing to redo", () => {
        const state = run(
            { type: "observed", list: [STEEL] },
            { type: "undone", restored: STEEL, listBefore: [STEEL] },
            { type: "cleared" },
        );

        expect(nextRedo(state)).toBeUndefined();
    });
});
