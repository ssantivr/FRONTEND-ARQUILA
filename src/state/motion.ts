import { useSyncExternalStore } from "react";

const STORAGE_KEY = "arquila:reduce-motion";
const listeners = new Set<() => void>();

function readStored(): boolean {
    try {
        return window.localStorage.getItem(STORAGE_KEY) === "on";
    } catch {
        return false;
    }
}

let reduced = readStored();

function apply(): void {
    // The camera modules import this file and are also tested outside a browser.
    if (typeof document === "undefined") {
        return;
    }

    if (reduced) {
        document.documentElement.dataset.motion = "reduced";
    } else {
        delete document.documentElement.dataset.motion;
    }
}

apply();

export function getReduceMotion(): boolean {
    return reduced;
}

/** The user's own switch; it adds to the system setting, it never overrides it. */
export function setReduceMotion(next: boolean): void {
    reduced = next;
    apply();

    try {
        window.localStorage.setItem(STORAGE_KEY, next ? "on" : "off");
    } catch {}

    for (const listener of listeners) {
        listener();
    }
}

/** True when either the system or the user asks for less movement. Camera moves check this. */
export function prefersReducedMotion(): boolean {
    return (
        reduced ||
        (typeof window !== "undefined" &&
            typeof window.matchMedia === "function" &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches)
    );
}

function subscribe(listener: () => void): () => void {
    listeners.add(listener);

    return () => {
        listeners.delete(listener);
    };
}

export function useReduceMotion(): boolean {
    return useSyncExternalStore(subscribe, getReduceMotion);
}

/** How a scroll made by the app should move: smoothly, or at once when movement is reduced. */
export function scrollBehavior(): ScrollBehavior {
    return prefersReducedMotion() ? "auto" : "smooth";
}
