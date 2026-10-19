import { useSyncExternalStore } from "react";

function query(media: string): MediaQueryList | null {
    try {
        return typeof window.matchMedia === "function" ? window.matchMedia(media) : null;
    } catch {
        return null;
    }
}

/**
 * Whether a media query matches now, updated when it changes (the window is resized or turned).
 * False where the browser cannot answer, as in the test environment.
 */
export function useMediaQuery(media: string): boolean {
    return useSyncExternalStore(
        (notify) => {
            const list = query(media);

            list?.addEventListener("change", notify);

            return () => list?.removeEventListener("change", notify);
        },
        () => query(media)?.matches ?? false,
        () => false,
    );
}
