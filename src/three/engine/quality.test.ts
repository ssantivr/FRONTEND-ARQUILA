import { describe, expect, it } from "vitest";

import {
    DEFAULT_QUALITY,
    PREVIEW_QUALITIES,
    fittedProfile,
    isPreviewQuality,
    pixelRatioFor,
    qualityProfile,
} from "./quality";

describe("quality", () => {
    it("keeps the settings the viewer always had at the default quality", () => {
        expect(DEFAULT_QUALITY).toBe("medium");
        expect(qualityProfile(DEFAULT_QUALITY)).toEqual({
            maxPixelRatio: 2,
            shadowMapSize: 2048,
            occlusion: true,
            msaaSamples: 4,
        });
    });

    it("never spends more at a lower quality", () => {
        const [low, medium, high] = PREVIEW_QUALITIES.map(qualityProfile);

        expect(low.maxPixelRatio).toBeLessThanOrEqual(medium.maxPixelRatio);
        expect(medium.maxPixelRatio).toBeLessThanOrEqual(high.maxPixelRatio);
        expect(low.shadowMapSize).toBeLessThan(medium.shadowMapSize);
        expect(medium.shadowMapSize).toBeLessThan(high.shadowMapSize);
        expect(low.occlusion).toBe(false);
        expect(low.msaaSamples).toBe(0);
    });

    it("recognises only the values the API admits", () => {
        expect(isPreviewQuality("high")).toBe(true);
        expect(isPreviewQuality("ultra")).toBe(false);
        expect(isPreviewQuality(undefined)).toBe(false);
    });

    it("limits the pixel ratio to the profile and keeps a lower one", () => {
        expect(pixelRatioFor(qualityProfile("low"), 3)).toBe(1);
        expect(pixelRatioFor(qualityProfile("medium"), 3)).toBe(2);
        expect(pixelRatioFor(qualityProfile("medium"), 1.5)).toBe(1.5);
    });

    it("keeps the shadow map inside what the device can draw", () => {
        expect(fittedProfile("high", 2048).shadowMapSize).toBe(2048);
        expect(fittedProfile("high", 16384).shadowMapSize).toBe(4096);
    });
});
