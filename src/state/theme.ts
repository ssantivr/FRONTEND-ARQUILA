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

/** Until the user picks a theme, follow the one their system asks for. */
function preferred(): Theme {
    try {
        return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    } catch {
        return "dark";
    }
}

let theme: Theme = readStored() ?? preferred();

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
