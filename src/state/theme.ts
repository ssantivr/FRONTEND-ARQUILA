import { useSyncExternalStore } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "arquila:theme";
const listeners = new Set<() => void>();

function readStored(): Theme | null {
    try {
        const stored = window.localStorage.getItem(STORAGE_KEY);

        return stored === "light" || stored === "dark" ? stored : null;
    } catch {
        return null;
    }
}

let theme: Theme = readStored() ?? "dark";

function apply(): void {
    document.documentElement.dataset.theme = theme;
}

apply();

export function getTheme(): Theme {
    return theme;
}

export function setTheme(next: Theme): void {
    theme = next;
    apply();

    try {
        window.localStorage.setItem(STORAGE_KEY, next);
    } catch {}

    for (const listener of listeners) {
        listener();
    }
}

function subscribe(listener: () => void): () => void {
    listeners.add(listener);

    return () => {
        listeners.delete(listener);
    };
}

export function useTheme(): Theme {
    return useSyncExternalStore(subscribe, getTheme);
}
