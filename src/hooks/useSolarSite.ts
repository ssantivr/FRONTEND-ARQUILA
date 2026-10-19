import { useMemo } from "react";

import { terrainsApi } from "../services/api";
import type { Terrain } from "../types/api";
import type { SolarSite } from "../utils/lighting";
import { useAsync } from "./useAsync";

interface SolarSiteState {
    /** The first terrain of the project with latitude and longitude, if any. */
    site: SolarSite | null;
    /** The terrain the coordinates come from, or the first one when none has them. */
    terrain: Terrain | null;
    loading: boolean;
}

/** Where the project's lot is on the globe, for the sun to be the real one over it. */
export function useSolarSite(projectId: number | null): SolarSiteState {
    const terrains = useAsync(
        () => (projectId === null ? Promise.resolve([]) : terrainsApi.listByProject(projectId)),
        [projectId],
    );
    const list = terrains.data ?? [];
    const located = list.find((item) => item.latitude !== null && item.longitude !== null) ?? null;
    const latitude = located?.latitude ?? null;
    const longitude = located?.longitude ?? null;
    // One object per pair of coordinates, so the scene is not lit again on every render.
    const site = useMemo(
        () => (latitude === null || longitude === null ? null : { latitude, longitude }),
        [latitude, longitude],
    );

    return { site, terrain: located ?? list[0] ?? null, loading: terrains.loading };
}
