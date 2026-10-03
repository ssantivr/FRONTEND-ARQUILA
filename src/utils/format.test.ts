import { describe, expect, it } from "vitest";

import { formatFileSize, formatNumber, optionalNumber, optionalText } from "./format";

describe("formatNumber", () => {
    it("uses a dash for missing values and a decimal comma", () => {
        expect(formatNumber(null)).toBe("—");
        expect(formatNumber(8.5)).toBe("8,5");
        expect(formatNumber(2.555)).toBe("2,56");
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
