import { useCallback, useEffect, useState } from "react";

import { PRESENTATION_LIGHTING, readLighting, type LightingSettings } from "../utils/lighting";

const key = (projectId: number) => `arquila:lighting:${projectId}`;

export function loadLighting(projectId: number): LightingSettings {
    try {
        const stored = window.localStorage.getItem(key(projectId));

        return stored === null ? PRESENTATION_LIGHTING : readLighting(JSON.parse(stored));
    } catch {
        return PRESENTATION_LIGHTING;
    }
}

/**
 * The presentation light of a project. The API has nowhere to keep it, so it lives in this
 * browser: the lighting screen writes it and the render screen reads it.
 */
export function useLighting(
    projectId: number | null,
): [LightingSettings, (next: LightingSettings) => void] {
    const [settings, setSettings] = useState(() =>
        projectId === null ? PRESENTATION_LIGHTING : loadLighting(projectId),
    );

    useEffect(() => {
        setSettings(projectId === null ? PRESENTATION_LIGHTING : loadLighting(projectId));
    }, [projectId]);

    const change = useCallback(
        (next: LightingSettings) => {
            setSettings(next);

            if (projectId !== null) {
                try {
                    window.localStorage.setItem(key(projectId), JSON.stringify(next));
                } catch {
                    // Storage full or blocked: the light still applies until the page is left.
                }
            }
        },
        [projectId],
    );

    return [settings, change];
}
