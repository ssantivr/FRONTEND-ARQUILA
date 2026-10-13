import { flushSync } from "react-dom";

import { prefersReducedMotion } from "./motion";

interface TransitionDocument {
    startViewTransition?: (update: () => void) => { finished: Promise<unknown> };
}

/**
 * Runs a change of screen inside a view transition where the browser has them, so the old and
 * the new screen cross-fade. Elsewhere, and when movement is reduced, the change just happens:
 * the new screen still rises in by its own (`motion.css`).
 */
export function withViewTransition(update: () => void): void {
    const start = (document as TransitionDocument).startViewTransition;

    if (typeof start !== "function" || prefersReducedMotion()) {
        update();

        return;
    }

    const root = document.documentElement;

    root.dataset.viewTransition = "";

    // React must have drawn the new screen before the browser takes its picture of it.
    const transition = start.call(document, () => flushSync(update));
    const done = () => {
        delete root.dataset.viewTransition;
    };

    transition.finished.then(done, done);
}
