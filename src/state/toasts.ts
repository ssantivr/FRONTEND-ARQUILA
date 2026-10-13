import { useSyncExternalStore } from "react";

export interface Toast {
    id: number;
    text: string;
    /** True for the last moment of a toast, while it slides away. */
    leaving: boolean;
}

/** How long a toast stays, counting the moment it takes to slide away. */
export const TOAST_LIFETIME_MS = 4000;
/** The slide away; it matches `--dur` (180 ms) in the style sheets. */
const EXIT_MS = 180;

interface Clock {
    timer: number;
    /** When the running timer started, to know how much is left if it is paused. */
    startedAt: number;
    remaining: number;
}

const listeners = new Set<() => void>();
const clocks = new Map<number, Clock>();
let toasts: Toast[] = [];
let nextId = 1;

function publish(next: Toast[]): void {
    toasts = next;

    for (const listener of listeners) {
        listener();
    }
}

/** Removes a toast at once, without the slide. */
export function dismissToast(id: number): void {
    const clock = clocks.get(id);

    if (clock !== undefined) {
        window.clearTimeout(clock.timer);
        clocks.delete(id);
    }

    publish(toasts.filter((toast) => toast.id !== id));
}

/** Lets a toast slide away and then removes it. Used when its time is up or it is closed. */
export function leaveToast(id: number): void {
    const clock = clocks.get(id);

    if (clock !== undefined) {
        window.clearTimeout(clock.timer);
    }

    if (!toasts.some((toast) => toast.id === id && !toast.leaving)) {
        return;
    }

    publish(toasts.map((toast) => (toast.id === id ? { ...toast, leaving: true } : toast)));
    clocks.set(id, {
        timer: window.setTimeout(() => dismissToast(id), EXIT_MS),
        startedAt: Date.now(),
        remaining: EXIT_MS,
    });
}

function start(id: number, remaining: number): void {
    clocks.set(id, {
        timer: window.setTimeout(() => leaveToast(id), remaining),
        startedAt: Date.now(),
        remaining,
    });
}

/** Stops the clock of a toast while the pointer or the focus is on it. */
export function pauseToast(id: number): void {
    const clock = clocks.get(id);
    const toast = toasts.find((item) => item.id === id);

    if (clock === undefined || toast === undefined || toast.leaving) {
        return;
    }

    window.clearTimeout(clock.timer);
    clocks.set(id, {
        ...clock,
        timer: 0,
        remaining: Math.max(clock.remaining - (Date.now() - clock.startedAt), 0),
    });
}

/** Starts the clock again with the time that was left. */
export function resumeToast(id: number): void {
    const clock = clocks.get(id);
    const toast = toasts.find((item) => item.id === id);

    if (clock !== undefined && clock.timer === 0 && toast !== undefined && !toast.leaving) {
        start(id, clock.remaining);
    }
}

/** Confirms an action that already succeeded; errors stay next to the control that failed. */
export function showToast(text: string): void {
    const id = nextId++;

    publish([...toasts, { id, text, leaving: false }]);
    start(id, TOAST_LIFETIME_MS - EXIT_MS);
}

function subscribe(listener: () => void): () => void {
    listeners.add(listener);

    return () => {
        listeners.delete(listener);
    };
}

export function useToasts(): Toast[] {
    return useSyncExternalStore(subscribe, () => toasts);
}
