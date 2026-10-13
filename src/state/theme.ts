import { useSyncExternalStore } from "react";

import { prefersReducedMotion } from "./motion";

export type Theme = "light" | "dark";
/** What the user chose: a fixed theme, or "auto" to follow the system. */
export type ThemePreference = Theme | "auto";

const STORAGE_KEY = "arquila:theme";
const SYSTEM_QUERY = "(prefers-color-scheme: light)";
const SWITCH_ATTRIBUTE = "themeSwitching";
/** A little longer than `--dur` (180 ms), the colour transition it leaves room for. */
const SWITCH_MS = 220;
const listeners = new Set<() => void>();
let switchTimer = 0;

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
 * Sets the theme on the page. When it changes while the app is in use, the page is marked for a
 * moment so `motion.css` can cross the colours over; on the first paint nothing is animated.
 */
function apply(animate = false): void {
    const previous = theme;

    theme = preference === "auto" ? systemTheme() : preference;

    if (animate && previous !== theme && !prefersReducedMotion()) {
        document.documentElement.dataset[SWITCH_ATTRIBUTE] = "";
        window.clearTimeout(switchTimer);
        switchTimer = window.setTimeout(() => {
            delete document.documentElement.dataset[SWITCH_ATTRIBUTE];
        }, SWITCH_MS);
    }

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
