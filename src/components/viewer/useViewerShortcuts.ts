import { useEffect, useRef, type RefObject } from "react";

import type { ViewName } from "../../three/BuildingSceneManager";
import { VIEWS } from "./labels";
import { focusAllowsShortcuts, shortcutsBlocked } from "./shortcuts";

const ARROWS: Record<string, [number, number]> = {
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    ArrowUp: [0, 1],
    ArrowDown: [0, -1],
};

export interface ViewerShortcuts {
    /** Nothing on screen answers to the keyboard. */
    disabled: boolean;
    /** A room can be moved with the arrows right now. */
    moving: boolean;
    roomSelected: boolean;
    somethingSelected: boolean;
    roomIsolated: boolean;
    historyBusy: boolean;
    undo: () => void;
    redo: () => void;
    nudge: (dx: number, dy: number) => void;
    toggleMoving: () => void;
    chooseView: (view: ViewName) => void;
    focusSelection: () => void;
    toggleIsolation: () => void;
    stepBack: () => void;
    showHelp: () => void;
}

/** The keys of the viewer. The preview on the home screen does not listen to them. */
export function useViewerShortcuts(
    stage: RefObject<HTMLDivElement | null>,
    enabled: boolean,
    shortcuts: ViewerShortcuts,
): void {
    const current = useRef(shortcuts);

    current.current = shortcuts;

    useEffect(() => {
        if (!enabled) {
            return;
        }

        function onKeyDown(event: KeyboardEvent) {
            const actions = current.current;

            if (actions.disabled || !focusAllowsShortcuts(stage.current)) {
                return;
            }

            const key = event.key?.toLowerCase();

            if ((event.ctrlKey || event.metaKey) && !event.altKey && (key === "z" || key === "y")) {
                event.preventDefault();

                if (key === "y" || event.shiftKey) {
                    actions.redo();
                } else {
                    actions.undo();
                }

                return;
            }

            if (shortcutsBlocked(event)) {
                return;
            }

            if (actions.moving && event.key in ARROWS) {
                event.preventDefault();

                if (!actions.historyBusy) {
                    actions.nudge(...ARROWS[event.key]);
                }

                return;
            }

            if (key === "m") {
                if (actions.roomSelected) {
                    actions.toggleMoving();
                    event.preventDefault();
                }

                return;
            }

            const viewIndex = ["1", "2", "3", "4"].indexOf(event.key);

            if (viewIndex !== -1) {
                actions.chooseView(VIEWS[viewIndex].id);
            } else if (event.key === "f" || event.key === "F") {
                if (actions.somethingSelected) {
                    actions.focusSelection();
                }
            } else if (event.key === "i" || event.key === "I") {
                if (actions.roomSelected || actions.roomIsolated) {
                    actions.toggleIsolation();
                }
            } else if (event.key === "Escape") {
                actions.stepBack();
            } else if (event.key === "?") {
                actions.showHelp();
            } else {
                return;
            }

            event.preventDefault();
        }

        window.addEventListener("keydown", onKeyDown);

        return () => window.removeEventListener("keydown", onKeyDown);
    }, [stage, enabled]);
}
