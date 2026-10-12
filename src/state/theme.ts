import { useSyncExternalStore } from "react";

export type Theme = "light" | "dark";
/** What the user chose: a fixed theme, or "auto" to follow the system. */
export type ThemePreference = Theme | "auto";

const STORAGE_KEY = "arquila:theme";
const SYSTEM_QUERY = "(prefers-color-scheme: light)";
const listeners = new Set<() => void>();

function readStored(): ThemePreference | null {
    try {
        const stored = window.localStorage.getItem(STORAGE_KEY);

        return stored === "light" || stored === "dark" || stored === "auto" ? stored : null;
    } catch {
        return null;
    }
}

function systemTheme(): Theme {
    try {
        return window.matchMedia(SYSTEM_QUERY).matches ? "light" : "dark";
    } catch {
        return "dark";
    }
}

let preference: ThemePreference = readStored() ?? "auto";
let theme: Theme = preference === "auto" ? systemTheme() : preference;

function apply(): void {
    theme = preference === "auto" ? systemTheme() : preference;
    document.documentElement.dataset.theme = theme;

    for (const listener of listeners) {
        listener();
    }
}

apply();

try {
    // While the preference is "auto", the app follows the system when it changes.
    window.matchMedia(SYSTEM_QUERY).addEventListener("change", () => {
        if (preference === "auto") {
            apply();
        }
    });
} catch {}

export function getTheme(): Theme {
    return theme;
}

export function getThemePreference(): ThemePreference {
    return preference;
}

export function setThemePreference(next: ThemePreference): void {
    preference = next;

    try {
        window.localStorage.setItem(STORAGE_KEY, next);
    } catch {}

    apply();
}

export function setTheme(next: Theme): void {
    setThemePreference(next);
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

export function useThemePreference(): ThemePreference {
    return useSyncExternalStore(subscribe, getThemePreference);
}
