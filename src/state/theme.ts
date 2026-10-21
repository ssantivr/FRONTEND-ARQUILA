import { useSyncExternalStore } from "react";

import { canTransition, withViewTransition } from "./viewTransition";

export type Theme = "light" | "dark";
/** What the user chose: a fixed theme, or "auto" to follow the system. */
export type ThemePreference = Theme | "auto";

const STORAGE_KEY = "arquila:theme";
const SYSTEM_QUERY = "(prefers-color-scheme: light)";
const SWITCH_ATTRIBUTE = "themeSwitching";
const listeners = new Set<() => void>();
/** Changes still cross-fading: a second one may start before the first has ended. */
let switching = 0;

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

/**
 * Sets the theme on the page, without reloading it. When it changes while the app is in use and
 * the browser can, the page is marked for the change so `motion.css` cross-fades a picture of the
 * old colours into the new ones (opacity only); otherwise, and on the first paint, it is at once.
 */
function apply(animate = false): void {
    const previous = theme;
    const root = document.documentElement;

    theme = preference === "auto" ? systemTheme() : preference;

    function commit() {
        root.dataset.theme = theme;

        for (const listener of listeners) {
            listener();
        }
    }

    if (!animate || previous === theme || !canTransition()) {
        commit();

        return;
    }

    switching += 1;
    root.dataset[SWITCH_ATTRIBUTE] = "";
    void withViewTransition(commit).then(() => {
        switching -= 1;

        if (switching === 0) {
            delete root.dataset[SWITCH_ATTRIBUTE];
        }
    });
}

apply();

try {
    // While the preference is "auto", the app follows the system when it changes.
    window.matchMedia(SYSTEM_QUERY).addEventListener("change", () => {
        if (preference === "auto") {
            apply(true);
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

    apply(true);
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
