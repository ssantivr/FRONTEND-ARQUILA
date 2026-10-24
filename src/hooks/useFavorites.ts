import { useState } from "react";

function read(key: string): string[] {
    try {
        const stored: unknown = JSON.parse(window.localStorage.getItem(key) ?? "[]");

        return Array.isArray(stored) ? stored.filter((item) => typeof item === "string") : [];
    } catch {
        return [];
    }
}

/**
 * Favourites kept in this browser only: the API has nowhere to store them, so they do not follow
 * the user to another device.
 */
export function useFavorites(key: string): {
    isFavorite: (id: string) => boolean;
    toggle: (id: string) => void;
} {
    const [favorites, setFavorites] = useState(() => read(key));

    function toggle(id: string) {
        setFavorites((previous) => {
            const next = previous.includes(id)
                ? previous.filter((item) => item !== id)
                : [...previous, id];

            try {
                window.localStorage.setItem(key, JSON.stringify(next));
            } catch {}

            return next;
        });
    }

    return { isFavorite: (id) => favorites.includes(id), toggle };
}
