import { describe, expect, it } from "vitest";

import { formatFileSize, formatMoney, formatNumber, optionalNumber, optionalText } from "./format";

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
});
