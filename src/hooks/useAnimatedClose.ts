import { useEffect, useRef, useState, type AnimationEvent } from "react";

import { prefersReducedMotion } from "../state/motion";

/**
 * Longest an exit may take before the window is closed anyway. Exits last 120 ms (`--dur-fast`);
 * this leaves room for a slow frame and still closes a window whose animation never reports.
 */
const EXIT_LIMIT_MS = 400;

/** True when the element has a CSS animation that will actually play. */
function animates(node: HTMLElement | null): boolean {
    if (node === null || prefersReducedMotion()) {
        return false;
    }

    const name = window.getComputedStyle(node).animationName;

    return name !== "" && name !== "none";
}

/**
 * Lets a window play its exit before it goes away.
 *
 * The parent decides whether the window exists (it renders it or not), so closing would remove
 * it at once. With this hook, asking to close first sets `open` to false, which starts the exit
 * animation of the style sheet, and `onClose` is only called when that animation ends. Where
 * nothing is animated (reduced motion, or no style sheet at all) it closes immediately.
 *
 * An animation can also be cancelled or never report its end (the element is hidden, or its
 * container goes away), and this version of React has no event for that. A time limit closes
 * the window then, so it can never be left half shut.
 * `onClose` is called once per request, whichever comes first.
 */
export function useAnimatedClose<Element extends HTMLElement>(onClose: () => void) {
    const [open, setOpen] = useState(true);
    const ref = useRef<Element>(null);
    const closed = useRef(false);
    const limit = useRef(0);
    const close = useRef(onClose);

    close.current = onClose;

    useEffect(() => () => window.clearTimeout(limit.current), []);

    function finish() {
        if (!closed.current) {
            closed.current = true;
            window.clearTimeout(limit.current);
            close.current();
        }
    }

    function requestClose() {
        // Each request closes once: the end of the animation and the time limit may both fire.
        closed.current = false;

        if (!animates(ref.current)) {
            finish();

            return;
        }

        setOpen(false);
        window.clearTimeout(limit.current);
        limit.current = window.setTimeout(finish, EXIT_LIMIT_MS);
    }

    function onAnimationEnd(event: AnimationEvent<Element>) {
        // Animations of the children bubble up here too; only the window's own exit counts.
        if (!open && event.target === ref.current) {
            finish();
        }
    }

    return { open, ref, requestClose, onAnimationEnd };
}
