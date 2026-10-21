import { flushSync } from "react-dom";

import { prefersReducedMotion } from "./motion";

interface TransitionDocument {
    startViewTransition?: (update: () => void) => { finished?: Promise<unknown> } | undefined;
}

/** Whether a change made now would cross-fade: the browser has view transitions and movement is on. */
export function canTransition(): boolean {
    return (
        typeof (document as TransitionDocument).startViewTransition === "function" &&
        !prefersReducedMotion()
    );
}

/**
 * Runs a change of screen inside a view transition where the browser has them, so the old and
 * the new content cross-fade. Elsewhere, and when movement is reduced, the change just happens;
 * the new screen rises in by its own either way (`.content > *`). The promise settles when the
 * cross-fade has ended, at once when there is none.
 */
export function withViewTransition(update: () => void): Promise<void> {
    if (!canTransition()) {
        update();

        return Promise.resolve();
    }

    // React must have drawn the new screen before the browser takes its picture of it.
    const transition = (document as TransitionDocument).startViewTransition?.call(document, () =>
        flushSync(update),
    );

    return Promise.resolve(transition?.finished).then(
        () => undefined,
        () => undefined,
    );
}
