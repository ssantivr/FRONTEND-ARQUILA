import { describe, expect, it } from "vitest";

import {
    PRESENTATION_LIGHTING,
    compassPoint,
    engineAzimuth,
    formatHour,
    kelvinToHex,
    readLighting,
    skyAt,
    skyOf,
    solarPosition,
    sunPosition,
    utcOffsetOf,
} from "./lighting";

const MANIZALES = { latitude: 5.07, longitude: -75.51 };
const LONDON = { latitude: 51.5, longitude: -0.12 };

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
        const read = readLighting({
            hour: 30,
            exposure: 1.5,
            shadows: false,
            sky: "sunset",
            date: "2026-12-21",
        });

        expect(read.date).toBe("2026-12-21");
        expect(readLighting({ date: "mañana" }).date).toBe(PRESENTATION_LIGHTING.date);

        expect(read.hour).toBe(24);
        expect(read.exposure).toBe(1.5);
        expect(read.shadows).toBe(false);
        expect(read.sky).toBe("sunset");
    });
});

describe("solarPosition", () => {
    it("puts the June noon sun almost overhead and to the north, near the equator", () => {
        const noon = solarPosition(MANIZALES, "2026-06-21", 12);

        // 90° − (23,44° − 5,07°) = 71,6°, with the sun north of a lot north of the equator.
        expect(noon.elevation).toBeGreaterThan(70);
        expect(noon.elevation).toBeLessThan(73);
        expect(Math.min(noon.azimuth, 360 - noon.azimuth)).toBeLessThan(15);
    });

    it("rises in the east, sets in the west and is under the horizon at night", () => {
        expect(solarPosition(MANIZALES, "2026-03-20", 8).azimuth).toBeGreaterThan(45);
        expect(solarPosition(MANIZALES, "2026-03-20", 8).azimuth).toBeLessThan(135);
        expect(solarPosition(MANIZALES, "2026-03-20", 16).azimuth).toBeGreaterThan(225);
        expect(solarPosition(MANIZALES, "2026-03-20", 16).azimuth).toBeLessThan(315);
        expect(solarPosition(MANIZALES, "2026-03-20", 0).elevation).toBeLessThan(0);
    });

    it("changes with the date far from the equator", () => {
        const summer = solarPosition(LONDON, "2026-06-21", 12).elevation;
        const winter = solarPosition(LONDON, "2026-12-21", 12).elevation;

        // 90 − 51,5 ± 23,44: 62° in June and 15° in December.
        expect(summer).toBeGreaterThan(60);
        expect(winter).toBeLessThan(17);
        expect(utcOffsetOf(LONDON)).toBe(0);
        expect(utcOffsetOf(MANIZALES)).toBe(-5);
    });
});

describe("engineAzimuth", () => {
    // The engine's light before it is turned, as (x, z), turned as Three.js turns about +Y.
    function turned(degrees: number): { x: number; z: number } {
        const angle = (degrees * Math.PI) / 180;
        const [x, z] = [-0.5, 0.6];

        return {
            x: x * Math.cos(angle) + z * Math.sin(angle),
            z: z * Math.cos(angle) - x * Math.sin(angle),
        };
    }

    it("lights from the front of the lot when the sun is south and north is at the back", () => {
        const south = turned(engineAzimuth(180, 0));

        expect(Math.abs(south.x)).toBeLessThan(1e-9);
        expect(south.z).toBeGreaterThan(0);
    });

    it("lights from the right of the lot when the sun is east", () => {
        const east = turned(engineAzimuth(90, 0));

        expect(east.x).toBeGreaterThan(0);
        expect(Math.abs(east.z)).toBeLessThan(1e-9);
    });
});

describe("sunPosition with a site", () => {
    it("is the real sun by day and the moon, across from it, at night", () => {
        const day = sunPosition(
            { ...PRESENTATION_LIGHTING, date: "2026-06-21", hour: 12 },
            MANIZALES,
        );
        const night = sunPosition(
            { ...PRESENTATION_LIGHTING, date: "2026-06-21", hour: 1 },
            MANIZALES,
        );

        expect(day.solar?.elevation).toBeCloseTo(day.elevation);
        expect(skyOf({ ...PRESENTATION_LIGHTING, hour: 1 }, MANIZALES)).toBe("night");
        expect(night.elevation).toBe(42);
    });
});

describe("compassPoint", () => {
    it("names the eight directions", () => {
        expect(compassPoint(0)).toBe("N");
        expect(compassPoint(100)).toBe("E");
        expect(compassPoint(225)).toBe("SO");
        expect(compassPoint(350)).toBe("N");
    });
});
