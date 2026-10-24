import { useSyncExternalStore } from "react";

import { errorMessage } from "../hooks/useAsync";

export type SaveState = "idle" | "saving" | "saved" | "error";

interface Snapshot {
    projectId: number | null;
    state: SaveState;
    /** What failed, said for the user, when `state` is "error". */
    message: string | null;
}

const IDLE: Snapshot = { projectId: null, state: "idle", message: null };
const listeners = new Set<() => void>();
let snapshot: Snapshot = IDLE;
let pending = 0;
let failure: string | null = null;

function publish(next: Snapshot): void {
    snapshot = next;

    for (const listener of listeners) {
        listener();
    }
}

/**
 * Every write of a project goes through here: the forms of its tabs, the material of an element,
 * the roof and the moves of the 3D editor. So one indicator says whether the last change reached
 * the server, wherever it was made. While anything is on its way it says «saving»; when the last
 * one ends it says «saved», or «error» if any of them failed.
 */
export function trackSave<T>(projectId: number, work: Promise<T>, failedWhat?: string): Promise<T> {
    if (snapshot.projectId !== projectId) {
        pending = 0;
        failure = null;
    }

    pending += 1;
    publish({ projectId, state: "saving", message: null });

    function settle() {
        pending = Math.max(0, pending - 1);

        if (pending === 0 && snapshot.projectId === projectId) {
            publish({
                projectId,
                state: failure === null ? "saved" : "error",
                message: failure,
            });
            failure = null;
        }
    }

    return work.then(
        (value) => {
            settle();

            return value;
        },
        (reason: unknown) => {
            failure = `${failedWhat ?? "No se guardó el cambio"}: ${errorMessage(reason)}`;
            settle();

            throw reason;
        },
    );
}

/** The save state of one project; «idle» while nothing of it has been sent. */
export function useProjectSave(projectId: number): Snapshot {
    const current = useSyncExternalStore(
        (listener) => {
            listeners.add(listener);

            return () => listeners.delete(listener);
        },
        () => snapshot,
    );

    return current.projectId === projectId ? current : IDLE;
}

/** For tests: back to nothing sent. */
export function resetSaves(): void {
    pending = 0;
    failure = null;
    publish(IDLE);
}
