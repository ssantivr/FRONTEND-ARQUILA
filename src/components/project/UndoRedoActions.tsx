import { useEffect, useReducer } from "react";

import { undoApi } from "../../services/api";
import { ApiError } from "../../services/http";
import { undoLastDeletion } from "../../services/terrainUndo";
import { showToast } from "../../state/toasts";
import type { DeletedItem, DeletedItemKind } from "../../types/api";
import { Button } from "../ui/Button";
import { INITIAL_REDO, nextRedo, redoReducer } from "./redoStack";

export const KIND_LABELS: Record<DeletedItemKind, string> = {
    terrain: "terreno",
    material: "material",
    plan: "plano",
    elevation: "elevación",
    room: "cuarto",
    component: "componente",
};

const NOTHING_TO_REDO = "No hay nada que rehacer.";

interface UndoRedoActionsProps {
    projectId: number;
    /** `GET /projects/{id}/undo`, newest first; `null` while it has not arrived. */
    undoable: DeletedItem[] | null;
    /** The page's runner: it shows the error, marks the save and reads the undo list again. */
    run: (action: () => Promise<unknown>, onDone: () => void) => Promise<void>;
    /** What changed on the server is read again (the panels of the project). */
    onChanged: () => void;
}

function describe(item: DeletedItem): string {
    return `${KIND_LABELS[item.kind]} «${item.label}»`;
}

/**
 * «Deshacer» brings back the last deletion of the project and «Rehacer» deletes again what it
 * brought back. Redo stays visible, disabled with its reason, so the pair keeps its place.
 */
export function UndoRedoActions({ projectId, undoable, run, onChanged }: UndoRedoActionsProps) {
    const [redo, dispatch] = useReducer(redoReducer, INITIAL_REDO);
    const lastDeleted = undoable?.[0];
    const next = nextRedo(redo);

    useEffect(() => {
        if (undoable !== null) {
            dispatch({ type: "observed", list: undoable });
        }
    }, [undoable]);

    function undo() {
        const listBefore = undoable ?? [];

        return run(async () => {
            const restored = await undoLastDeletion(projectId);

            dispatch({ type: "undone", restored, listBefore });
        }, onChanged);
    }

    function redoLast() {
        return run(async () => {
            try {
                const redone = await undoApi.redoLast(projectId);

                dispatch({ type: "redone", item: redone });
                showToast(`Se eliminó de nuevo: ${describe(redone)}.`);
            } catch (reason) {
                // The mirror was behind the server: there is nothing left, and nothing broke.
                if (reason instanceof ApiError && reason.status === 404) {
                    dispatch({ type: "cleared" });
                    showToast(NOTHING_TO_REDO, "info");
                    return;
                }

                throw reason;
            }
        }, onChanged);
    }

    return (
        <>
            {lastDeleted !== undefined && (
                <Button variant="secondary" onClick={undo}>
                    {`Deshacer: ${describe(lastDeleted)}`}
                </Button>
            )}
            <Button
                variant="secondary"
                disabledReason={next === undefined ? NOTHING_TO_REDO : undefined}
                onClick={redoLast}
            >
                {next === undefined ? "Rehacer" : `Rehacer: ${describe(next)}`}
            </Button>
        </>
    );
}
