import { useRef, useState, type AnimationEvent } from "react";

import { prefersReducedMotion } from "../state/motion";

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
 */
export function useAnimatedClose<Element extends HTMLElement>(onClose: () => void) {
    const [open, setOpen] = useState(true);
    const ref = useRef<Element>(null);

    function requestClose() {
        if (animates(ref.current)) {
            setOpen(false);
        } else {
            onClose();
        }
    }

    function onAnimationEnd(event: AnimationEvent<Element>) {
        // Animations of the children bubble up here too; only the window's own exit counts.
        if (!open && event.target === ref.current) {
            onClose();
        }
    }

    return { open, ref, requestClose, onAnimationEnd };
}
