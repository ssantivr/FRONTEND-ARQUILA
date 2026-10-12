import { useSyncExternalStore } from "react";

export interface Toast {
    id: number;
    text: string;
}

const LIFETIME_MS = 4000;
const listeners = new Set<() => void>();
let toasts: Toast[] = [];
let nextId = 1;

function publish(next: Toast[]): void {
    toasts = next;

    for (const listener of listeners) {
        listener();
    }
}

export function dismissToast(id: number): void {
    publish(toasts.filter((toast) => toast.id !== id));
}

/** Confirms an action that already succeeded; errors stay next to the control that failed. */
export function showToast(text: string): void {
    const id = nextId++;

    publish([...toasts, { id, text }]);
    window.setTimeout(() => dismissToast(id), LIFETIME_MS);
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
