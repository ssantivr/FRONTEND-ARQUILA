export const PREVIEW_QUALITIES = ["low", "medium", "high"] as const;

export type PreviewQuality = (typeof PREVIEW_QUALITIES)[number];

/** The value `user_preferences.preview_quality` takes for a new account. */
export const DEFAULT_QUALITY: PreviewQuality = "medium";

export interface QualityProfile {
    /** Ceiling for `devicePixelRatio`: the canvas never draws more pixels than this asks for. */
    maxPixelRatio: number;
    shadowMapSize: number;
    /** Ambient occlusion, the most expensive pass. */
    occlusion: boolean;
    /** Antialiasing samples of the post-processing target. */
    msaaSamples: number;
}

const PROFILES: Record<PreviewQuality, QualityProfile> = {
    low: { maxPixelRatio: 1, shadowMapSize: 1024, occlusion: false, msaaSamples: 0 },
    medium: { maxPixelRatio: 2, shadowMapSize: 2048, occlusion: true, msaaSamples: 4 },
    high: { maxPixelRatio: 2, shadowMapSize: 4096, occlusion: true, msaaSamples: 8 },
};

export function isPreviewQuality(value: unknown): value is PreviewQuality {
    return PREVIEW_QUALITIES.some((quality) => quality === value);
}

export function qualityProfile(quality: PreviewQuality): QualityProfile {
    return PROFILES[quality];
}

/** The profile a device can actually draw: a shadow map never outgrows its largest texture. */
export function fittedProfile(quality: PreviewQuality, maxTextureSize: number): QualityProfile {
    const profile = PROFILES[quality];

    return { ...profile, shadowMapSize: Math.min(profile.shadowMapSize, maxTextureSize) };
}

export function pixelRatioFor(profile: QualityProfile, devicePixelRatio: number): number {
    return Math.min(devicePixelRatio, profile.maxPixelRatio);
}
