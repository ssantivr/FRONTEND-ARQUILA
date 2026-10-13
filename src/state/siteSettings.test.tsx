import { beforeEach, describe, expect, it } from "vitest";

import { readSiteSettings, saveSiteLimits, saveTerrainSite } from "./siteSettings";

beforeEach(() => {
    window.localStorage.clear();
});

describe("siteSettings", () => {
    it("starts empty for a project nobody has configured", () => {
        expect(readSiteSettings(7)).toEqual({ terrains: {} });
    });

    it("remembers the setback and the north of each terrain, without mixing them", () => {
        saveTerrainSite(7, 1, { setback: 4.5 });
        saveTerrainSite(7, 1, { north: 90 });
        saveTerrainSite(7, 2, { setback: 2 });

        expect(readSiteSettings(7).terrains).toEqual({
            "1": { setback: 4.5, north: 90 },
            "2": { setback: 2 },
        });
    });

    it("remembers the limits of a project as they were written", () => {
        saveSiteLimits(7, { maxCos: "0.55" });
        saveSiteLimits(7, { maxCus: "2.10" });

        expect(readSiteSettings(7)).toMatchObject({ maxCos: "0.55", maxCus: "2.10" });
    });

    it("keeps each project apart", () => {
        saveSiteLimits(7, { maxCos: "0.5" });

        expect(readSiteSettings(8)).toEqual({ terrains: {} });
    });

    it("ignores what it cannot read", () => {
        window.localStorage.setItem("arquila:site:7", "{ esto no es JSON");

        expect(readSiteSettings(7)).toEqual({ terrains: {} });

        window.localStorage.setItem("arquila:site:7", JSON.stringify({ maxCos: 3 }));

        expect(readSiteSettings(7)).toEqual({ terrains: {} });
    });
});
