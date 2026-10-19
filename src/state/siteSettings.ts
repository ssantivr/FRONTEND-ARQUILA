const PREFIX = "arquila:site:";

export interface TerrainSite {
    /** Setback from every side of the lot, in metres. */
    setback?: number;
    /** Where north points on the site plan, in degrees clockwise from the back of the lot. */
    north?: number;
}

export interface SiteSettings {
    /** The limits of the municipality the user typed, kept as text so «0.6» stays «0.6». */
    maxCos?: string;
    maxCus?: string;
    terrains: Record<string, TerrainSite>;
}

/**
 * What the user set on the plans of a project and the API has nowhere to keep yet: the setback
 * and north of each terrain and the maximum COS and CUS. It lives in this browser's storage,
 * one entry per project, as a bridge until the backend stores it (docs/CAMBIOS_BACKEND.md).
 */
export function readSiteSettings(projectId: number): SiteSettings {
    try {
        const saved: unknown = JSON.parse(
            window.localStorage.getItem(`${PREFIX}${projectId}`) ?? "null",
        );

        if (typeof saved === "object" && saved !== null) {
            const settings = saved as Partial<SiteSettings>;

            return {
                maxCos: typeof settings.maxCos === "string" ? settings.maxCos : undefined,
                maxCus: typeof settings.maxCus === "string" ? settings.maxCus : undefined,
                terrains:
                    typeof settings.terrains === "object" && settings.terrains !== null
                        ? settings.terrains
                        : {},
            };
        }
    } catch {
        // Storage that cannot be read is the same as nothing saved.
    }

    return { terrains: {} };
}

function write(projectId: number, settings: SiteSettings): void {
    try {
        window.localStorage.setItem(`${PREFIX}${projectId}`, JSON.stringify(settings));
    } catch {
        // A full or blocked storage only means the value is not remembered.
    }
}

/** Remembers the maximum COS or CUS of a project. */
export function saveSiteLimits(
    projectId: number,
    limits: Pick<SiteSettings, "maxCos" | "maxCus">,
): void {
    write(projectId, { ...readSiteSettings(projectId), ...limits });
}

/** Remembers the setback or the north of one terrain of a project. */
export function saveTerrainSite(projectId: number, terrainId: number, site: TerrainSite): void {
    const settings = readSiteSettings(projectId);

    write(projectId, {
        ...settings,
        terrains: {
            ...settings.terrains,
            [terrainId]: { ...settings.terrains[terrainId], ...site },
        },
    });
}
