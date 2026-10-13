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
export const TOAST_EXIT_MS = 180;

/** What can hold a toast on screen: the pointer over it, or the keyboard focus inside it. */
export type PauseCause = "pointer" | "focus";

interface Clock {
    /** The running timer, or 0 while the toast is paused. */
    timer: number;
    /** When the running timer started, to know how much is left if it is paused. */
    startedAt: number;
    remaining: number;
    /** Every reason the toast is being held; it only goes on when none is left. */
    held: Set<PauseCause>;
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
    // A toast already on its way out keeps the timer that will remove it: asking twice (a
    // double click on its button, or a click as its time runs out) must not cancel it.
    if (!toasts.some((toast) => toast.id === id && !toast.leaving)) {
        return;
    }

    window.clearTimeout(clocks.get(id)?.timer);
    publish(toasts.map((toast) => (toast.id === id ? { ...toast, leaving: true } : toast)));
    clocks.set(id, {
        timer: window.setTimeout(() => dismissToast(id), TOAST_EXIT_MS),
        startedAt: Date.now(),
        remaining: TOAST_EXIT_MS,
        held: new Set(),
    });
}

function isLeaving(id: number): boolean {
    return toasts.find((toast) => toast.id === id)?.leaving !== false;
}

/** Stops the clock of a toast while the pointer or the focus is on it. */
export function pauseToast(id: number, cause: PauseCause): void {
    const clock = clocks.get(id);

    if (clock === undefined || isLeaving(id)) {
        return;
    }

    // Already held for another reason: the time left was worked out then, and still stands.
    if (clock.held.size === 0) {
        window.clearTimeout(clock.timer);
        clock.timer = 0;
        clock.remaining = Math.max(clock.remaining - (Date.now() - clock.startedAt), 0);
    }

    clock.held.add(cause);
}

/** Starts the clock again with the time that was left, once nothing holds the toast. */
export function resumeToast(id: number, cause: PauseCause): void {
    const clock = clocks.get(id);

    if (clock === undefined || isLeaving(id) || !clock.held.delete(cause) || clock.held.size > 0) {
        return;
    }

    clock.startedAt = Date.now();
    clock.timer = window.setTimeout(() => leaveToast(id), clock.remaining);
}

/** Confirms an action that already succeeded; errors stay next to the control that failed. */
export function showToast(text: string): void {
    const id = nextId++;
    const remaining = TOAST_LIFETIME_MS - TOAST_EXIT_MS;

    publish([...toasts, { id, text, leaving: false }]);
    clocks.set(id, {
        timer: window.setTimeout(() => leaveToast(id), remaining),
        startedAt: Date.now(),
        remaining,
        held: new Set(),
    });
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
