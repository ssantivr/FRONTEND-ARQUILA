import { useSyncExternalStore } from "react";

import { materialsApi, recommendationsApi } from "../services/api";
import type { Material, Recommendation, StructureElement } from "../types/api";
import type { ColorMode } from "../utils/elementColors";
import type { ElementSurfaces, SurfaceMaterialId } from "../utils/surfaceMaterials";

export interface AppState {
    projectId: number | null;
    materials: Material[];
    recommendations: Recommendation[];
    selection: StructureElement | null;
    colorMode: ColorMode;
    surfaces: ElementSurfaces;
}

const EMPTY: AppState = {
    projectId: null,
    materials: [],
    recommendations: [],
    selection: null,
    colorMode: "realistic",
    surfaces: {},
};

let state = EMPTY;
const listeners = new Set<() => void>();

/** Applies a change to the given project, dropping what belonged to another one. */
function update(projectId: number, patch: Partial<AppState>): void {
    const base = state.projectId === projectId ? state : { ...EMPTY, colorMode: state.colorMode };

    state = { ...base, ...patch, projectId };

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

export const appState = {
    get: (): AppState => state,
    subscribe,
    open: (projectId: number) => update(projectId, {}),
    setMaterials: (projectId: number, materials: Material[]) => update(projectId, { materials }),
    setRecommendations: (projectId: number, recommendations: Recommendation[]) =>
        update(projectId, { recommendations }),
    select: (projectId: number, selection: StructureElement | null) =>
        update(projectId, { selection }),
    setColorMode: (projectId: number, colorMode: ColorMode) => update(projectId, { colorMode }),
    setSurfaces: (projectId: number, surfaces: ElementSurfaces) =>
        update(projectId, { surfaces }),
    setSurface: (projectId: number, key: string, surface: SurfaceMaterialId) =>
        update(projectId, {
            surfaces: {
                ...(state.projectId === projectId ? state.surfaces : EMPTY.surfaces),
                [key]: surface,
            },
        }),
    /** Reloads what the 3D model colors by; a failed request keeps what was already there. */
    async refresh(projectId: number): Promise<void> {
        update(projectId, {});

        const [materials, recommendations] = await Promise.allSettled([
            materialsApi.listByProject(projectId),
            recommendationsApi.listByProject(projectId),
        ]);

        if (state.projectId !== projectId) {
            return;
        }

        update(projectId, {
            ...(materials.status === "fulfilled" && { materials: materials.value }),
            ...(recommendations.status === "fulfilled" && {
                recommendations: recommendations.value,
            }),
        });
    },
    reset(): void {
        state = EMPTY;
    },
};

export function useAppState<T>(selector: (current: AppState) => T): T {
    return useSyncExternalStore(subscribe, () => selector(state));
}

/** Reads a field only while the store holds the given project. */
export function useProjectState<T>(
    projectId: number,
    selector: (current: AppState) => T,
): T {
    return useAppState((current) => selector(current.projectId === projectId ? current : EMPTY));
}
