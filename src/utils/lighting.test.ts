import { describe, expect, it } from "vitest";

import {
    PRESENTATION_LIGHTING,
    formatHour,
    kelvinToHex,
    readLighting,
    skyAt,
    skyOf,
    sunPosition,
} from "./lighting";

describe("skyAt", () => {
    it("is night outside the day and a sunset near its ends", () => {
        expect(skyAt(2)).toBe("night");
        expect(skyAt(6.5)).toBe("sunset");
        expect(skyAt(12)).toBe("day");
        expect(skyAt(17.5)).toBe("sunset");
        expect(skyAt(22)).toBe("night");
    });

    it("gives way to the sky the user fixed", () => {
        expect(skyOf({ ...PRESENTATION_LIGHTING, hour: 12, sky: "night" })).toBe("night");
    });
});

describe("sunPosition", () => {
    it("is highest at noon and never under the horizon by day", () => {
        const noon = sunPosition({ ...PRESENTATION_LIGHTING, hour: 12 });
        const morning = sunPosition({ ...PRESENTATION_LIGHTING, hour: 8 });
        const dawn = sunPosition({ ...PRESENTATION_LIGHTING, hour: 6, sky: "day" });

        expect(noon.elevation).toBeGreaterThan(morning.elevation);
        expect(dawn.elevation).toBeGreaterThan(0);
    });

    it("turns 15 degrees an hour, plus the orientation", () => {
        expect(sunPosition({ ...PRESENTATION_LIGHTING, hour: 12, orientation: 0 }).azimuth).toBe(0);
        expect(sunPosition({ ...PRESENTATION_LIGHTING, hour: 14, orientation: 90 }).azimuth).toBe(
            120,
        );
    });
});

describe("kelvinToHex", () => {
    it("goes from warm to cool", () => {
        const warm = kelvinToHex(2700);
        const cool = kelvinToHex(9000);

        expect(warm >> 16).toBe(255);
        expect(warm & 0xff).toBeLessThan(cool & 0xff);
        expect(cool >> 16).toBeLessThan(255);
    });
});

describe("formatHour", () => {
    it("writes hours and minutes", () => {
        expect(formatHour(7.25)).toBe("07:15");
        expect(formatHour(18)).toBe("18:00");
    });
});

describe("readLighting", () => {
    it("falls back when the stored value is missing or broken", () => {
        expect(readLighting(null)).toEqual(PRESENTATION_LIGHTING);
        expect(readLighting({ hour: "late", sky: "storm" })).toEqual(PRESENTATION_LIGHTING);
    });

    it("keeps what is valid and clamps what is out of range", () => {
        const read = readLighting({ hour: 30, exposure: 1.5, shadows: false, sky: "sunset" });

        expect(read.hour).toBe(24);
        expect(read.exposure).toBe(1.5);
        expect(read.shadows).toBe(false);
        expect(read.sky).toBe("sunset");
    });
});
