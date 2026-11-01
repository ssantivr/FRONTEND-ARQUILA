import { describe, expect, it } from "vitest";

import {
    formatDate,
    formatFileSize,
    formatMoney,
    formatNumber,
    formatRelative,
    optionalNumber,
    optionalText,
} from "./format";

describe("formatRelative", () => {
    const now = new Date("2026-10-31T12:00:00Z");

    it.each([
        ["2026-10-31T11:59:40Z", "hace un momento"],
        ["2026-10-31T11:55:00Z", "hace 5 minutos"],
        ["2026-10-31T10:00:00Z", "hace 2 horas"],
        ["2026-10-30T12:00:00Z", "ayer"],
        ["2026-10-20T12:00:00Z", "hace 11 días"],
    ])("says how long ago %s was", (value, words) => {
        expect(formatRelative(value, now)).toBe(words);
    });

    it("does not make up a time for a date it cannot read", () => {
        expect(formatRelative("no es una fecha", now)).toBe("—");
    });
});

describe("formatNumber", () => {
    it("uses a dash for missing values and a decimal comma", () => {
        expect(formatNumber(null)).toBe("—");
        expect(formatNumber(8.5)).toBe("8,5");
        expect(formatNumber(2.555)).toBe("2,56");
    });

    it("groups thousands from four digits on", () => {
        expect(formatNumber(4980)).toBe("4.980");
        expect(formatNumber(21000)).toBe("21.000");
    });
});

describe("formatMoney", () => {
    it("groups thousands the same way for four and five digits", () => {
        expect(formatMoney(6047)).toMatch(/^6\.047,00/);
        expect(formatMoney(44880)).toMatch(/^44\.880,00/);
    });
});

describe("optional form values", () => {
    it("turns empty inputs into undefined", () => {
        expect(optionalText("   ")).toBeUndefined();
        expect(optionalText("  clay ")).toBe("clay");
        expect(optionalNumber("")).toBeUndefined();
        expect(optionalNumber("12.5")).toBe(12.5);
        expect(optionalNumber("0")).toBe(0);
    });
});

describe("formatFileSize", () => {
    it("picks the unit by size", () => {
        expect(formatFileSize(512)).toBe("512 B");
        expect(formatFileSize(2048)).toBe("2 KB");
        expect(formatFileSize(5 * 1024 * 1024)).toBe("5 MB");
    });

    it("writes a date in Spanish and marks an unreadable one", () => {
        expect(formatDate("2026-10-04T12:00:00Z")).toMatch(/4 oct 2026/);
        expect(formatDate("no es una fecha")).toBe("—");
    });
});
