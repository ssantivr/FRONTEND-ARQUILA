import { useSyncExternalStore } from "react";

const PREFIX = "arquila:thumb:";
const INDEX_KEY = "arquila:thumbs";
const MAX_THUMBNAILS = 24;
const WIDTH = 480;
const HEIGHT = 270;
const QUALITY = 0.82;

const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
    listeners.add(listener);

    return () => listeners.delete(listener);
}

function readIndex(): number[] {
    try {
        const saved: unknown = JSON.parse(window.localStorage.getItem(INDEX_KEY) ?? "[]");

        return Array.isArray(saved) ? saved.filter((id) => typeof id === "number") : [];
    } catch {
        return [];
    }
}

/** The picture of a project's 3D model saved in this browser, or `null` if there is none yet. */
export function readThumbnail(projectId: number): string | null {
    try {
        return window.localStorage.getItem(`${PREFIX}${projectId}`);
    } catch {
        return null;
    }
}

/**
 * Keeps the picture of a project's model. Only the last 24 projects are kept, so the pictures
 * never fill the browser's storage; if it is full anyway, the picture is simply not saved.
 */
export function saveThumbnail(projectId: number, image: string): void {
    try {
        const index = [projectId, ...readIndex().filter((id) => id !== projectId)];

        index.splice(MAX_THUMBNAILS).forEach((id) => {
            window.localStorage.removeItem(`${PREFIX}${id}`);
        });
        window.localStorage.setItem(`${PREFIX}${projectId}`, image);
        window.localStorage.setItem(INDEX_KEY, JSON.stringify(index));
    } catch {
        return;
    }

    listeners.forEach((listener) => listener());
}

/**
 * Reduces a capture of the viewer to a 480 × 270 JPEG, cropped to cover that frame. A full
 * capture weighs megabytes; the reduced one, a few tens of kilobytes. Resolves to `null` where
 * the browser cannot draw it.
 */
export function shrinkCapture(image: string): Promise<string | null> {
    return new Promise((resolve) => {
        const source = new Image();

        source.onerror = () => resolve(null);
        source.onload = () => {
            const canvas = document.createElement("canvas");
            const context = canvas.getContext("2d");

            if (context === null || source.width === 0 || source.height === 0) {
                resolve(null);

                return;
            }

            const scale = Math.max(WIDTH / source.width, HEIGHT / source.height);
            const width = source.width * scale;
            const height = source.height * scale;

            canvas.width = WIDTH;
            canvas.height = HEIGHT;
            context.drawImage(source, (WIDTH - width) / 2, (HEIGHT - height) / 2, width, height);
            resolve(canvas.toDataURL("image/jpeg", QUALITY));
        };
        source.src = image;
    });
}

/** The saved picture of a project's model; the component redraws when a new one is saved. */
export function useThumbnail(projectId: number): string | null {
    return useSyncExternalStore(
        subscribe,
        () => readThumbnail(projectId),
        () => null,
    );
}
