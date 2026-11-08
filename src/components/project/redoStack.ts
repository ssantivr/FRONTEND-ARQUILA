import type { DeletedItem } from "../../types/api";

/**
 * What «Rehacer» can delete again, mirrored from the server.
 *
 * `POST /projects/{id}/redo` keeps its stack on the server and there is no route that lists it,
 * so the page keeps the same stack: an undo puts the restored item on it and a redo takes it off.
 * The server empties its stack on any new deletion (and on a version restore), and the page sees
 * that as a change at the top of `GET /projects/{id}/undo` it did not cause itself. If the mirror
 * is ever wrong, the server answers 404 «Nothing to redo» and the stack is emptied.
 */
export interface RedoState {
    /** Oldest first: the last item is the next redo. */
    items: DeletedItem[];
    /** The top of the undo list last seen; `undefined` until the list first arrives. */
    seenTop: string | null | undefined;
    /** The top the list will have after an undo or redo of this page, so it is not a deletion. */
    expectedTop: string | null | undefined;
}

export type RedoAction =
    | { type: "observed"; list: DeletedItem[] }
    | { type: "undone"; restored: DeletedItem; listBefore: DeletedItem[] }
    | { type: "redone"; item: DeletedItem }
    | { type: "cleared" };

export const INITIAL_REDO: RedoState = { items: [], seenTop: undefined, expectedTop: undefined };

function keyOf(item: DeletedItem | undefined): string | null {
    return item === undefined ? null : `${item.kind}\u0000${item.label}`;
}

export function redoReducer(state: RedoState, action: RedoAction): RedoState {
    switch (action.type) {
        case "observed": {
            const top = keyOf(action.list[0]);

            if (state.seenTop === undefined || top === state.seenTop) {
                return { ...state, seenTop: top };
            }

            if (state.expectedTop !== undefined && top === state.expectedTop) {
                return { ...state, seenTop: top, expectedTop: undefined };
            }

            return { items: [], seenTop: top, expectedTop: undefined };
        }
        case "undone":
            return {
                ...state,
                items: [...state.items, action.restored],
                expectedTop: keyOf(action.listBefore[1]),
            };
        case "redone":
            return { ...state, items: state.items.slice(0, -1), expectedTop: keyOf(action.item) };
        case "cleared":
            return { ...state, items: [], expectedTop: undefined };
    }
}

export function nextRedo(state: RedoState): DeletedItem | undefined {
    return state.items[state.items.length - 1];
}
