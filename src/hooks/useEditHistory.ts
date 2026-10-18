import { useRef, useState } from "react";

import { trackSave } from "../state/projectSave";

/** A change that the API can make and unmake: both directions are real requests. */
export interface Edit {
    /** What it did, for «Deshacer …» and «Rehacer …». */
    label: string;
    apply: () => Promise<unknown>;
    revert: () => Promise<unknown>;
}

/** Enough to undo a working session without keeping a whole afternoon in memory. */
const LIMIT = 50;

/**
 * Undo and redo of the 3D editor. Only edits with a real inverse go in (moving or resizing a
 * room, its material, the roof), and each step is sent to the server, so undoing is saved too.
 * One step at a time: a second one waits until the first is answered. A step that fails leaves
 * both lists as they were, and the save indicator says it failed.
 */
export function useEditHistory(projectId: number) {
    const [done, setDone] = useState<Edit[]>([]);
    const [undone, setUndone] = useState<Edit[]>([]);
    const busy = useRef(false);
    const [working, setWorking] = useState(false);

    async function attempt(step: () => Promise<unknown>, failedWhat: string): Promise<boolean> {
        if (busy.current) {
            return false;
        }

        busy.current = true;
        setWorking(true);

        try {
            await trackSave(projectId, step(), failedWhat);

            return true;
        } catch {
            return false;
        } finally {
            busy.current = false;
            setWorking(false);
        }
    }

    async function run(edit: Edit): Promise<boolean> {
        const ok = await attempt(edit.apply, `No se guardó: ${edit.label}`);

        if (ok) {
            setDone((list) => [...list, edit].slice(-LIMIT));
            setUndone([]);
        }

        return ok;
    }

    async function undo(): Promise<void> {
        const edit = done[done.length - 1];

        if (edit !== undefined && (await attempt(edit.revert, `No se deshizo: ${edit.label}`))) {
            setDone((list) => list.slice(0, -1));
            setUndone((list) => [...list, edit]);
        }
    }

    async function redo(): Promise<void> {
        const edit = undone[undone.length - 1];

        if (edit !== undefined && (await attempt(edit.apply, `No se rehízo: ${edit.label}`))) {
            setUndone((list) => list.slice(0, -1));
            setDone((list) => [...list, edit]);
        }
    }

    return {
        run,
        undo,
        redo,
        working,
        undoLabel: done[done.length - 1]?.label ?? null,
        redoLabel: undone[undone.length - 1]?.label ?? null,
    };
}
