import { flushSync } from "react-dom";

import { prefersReducedMotion } from "./motion";

interface TransitionDocument {
    startViewTransition?: (update: () => void) => unknown;
}

/**
 * Runs a change of screen inside a view transition where the browser has them, so the old and
 * the new content cross-fade. Elsewhere, and when movement is reduced, the change just happens;
 * the new screen rises in by its own either way (`.content > *`).
 */
export function withViewTransition(update: () => void): void {
    const start = (document as TransitionDocument).startViewTransition;

    if (typeof start !== "function" || prefersReducedMotion()) {
        update();

        return;
    }

    // React must have drawn the new screen before the browser takes its picture of it.
    start.call(document, () => flushSync(update));
}
