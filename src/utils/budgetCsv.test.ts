import { describe, expect, it } from "vitest";

import type { Material } from "../types/api";
import {
    CSV_DECIMAL,
    CSV_DELIMITER,
    budgetCsv,
    budgetFileName,
    csvCell,
    lineTotalCents,
    toHundredths,
} from "./budgetCsv";

function material(overrides: Partial<Material>): Material {
    return {
        id: 1,
        project_id: 1,
        name: "Cemento",
        category: "Obra gris",
        unit: "saco",
        quantity: 10,
        unit_cost: 8.5,
        created_at: "2026-10-01T12:00:00Z",
        ...overrides,
    };
}

const BOM = "﻿";

function rows(csv: string): string[] {
    return csv.slice(BOM.length).split("\r\n");
}

describe("budget CSV", () => {
    it("uses the documented delimiter and decimal mark for a Spanish Excel", () => {
        expect(CSV_DELIMITER).toBe(";");
        expect(CSV_DECIMAL).toBe(",");
    });

    it("starts with a UTF-8 BOM, ends lines with CRLF and keeps accents as UTF-8", () => {
        const csv = budgetCsv([material({ name: "Ladrillo cerámico", category: "Mampostería" })]);
        const bytes = new TextEncoder().encode(csv);

        expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
        expect(rows(csv)[0]).toBe("Nombre;Categoría;Unidad;Cantidad;Costo unitario;Subtotal");
        expect(rows(csv)[1]).toBe("Ladrillo cerámico;Mampostería;saco;10,00;8,50;85,00");
        expect(csv.endsWith("\r\n")).toBe(true);
    });

    it("adds a total row and leaves no currency symbol", () => {
        const csv = budgetCsv([
            material({ name: "A", quantity: 2, unit_cost: 10 }),
            material({ name: "B", quantity: 1.5, unit_cost: 4.25 }),
        ]);

        expect(rows(csv)[3]).toBe("Total;;;;;26,38");
        expect(csv).not.toMatch(/[$€]|USD/);
    });

    it("computes in integer cents, without floating-point drift", () => {
        // 0.1 × 3 is 0.30000000000000004 in floating point.
        expect(lineTotalCents(toHundredths(3), toHundredths(0.1))).toBe(30n);
        // 0.33 × 0.5 = 0.165: half a cent goes up.
        expect(lineTotalCents(toHundredths(0.33), toHundredths(0.5))).toBe(17n);
        // The largest value the columns take (NUMERIC(12, 2)), squared, stays exact:
        // 999999999999 × 999999999999 = 999999999998000000000001 ten-thousandths.
        expect(lineTotalCents(toHundredths(9999999999.99), toHundredths(9999999999.99))).toBe(
            9999999999980000000000n,
        );
    });

    it("adds ten lines of 0.10 to exactly 1,00", () => {
        const csv = budgetCsv(
            Array.from({ length: 10 }, (_, index) =>
                material({ id: index, name: `M${index}`, quantity: 1, unit_cost: 0.1 }),
            ),
        );

        expect(rows(csv)[11]).toBe("Total;;;;;1,00");
    });

    it("neutralizes cells a spreadsheet would run as a formula", () => {
        for (const start of ["=", "+", "-", "@", "\t", "\r"]) {
            expect(csvCell(`${start}1+1`)).toMatch(/^"?'/);
        }

        expect(csvCell('=HYPERLINK("http://x")')).toBe('"\'=HYPERLINK(""http://x"")"');
        expect(csvCell("Arena fina")).toBe("Arena fina");
    });

    it("quotes cells with the delimiter, quotes or line breaks", () => {
        expect(csvCell("Varilla; 12 mm")).toBe('"Varilla; 12 mm"');
        expect(csvCell('Tubo 2"')).toBe('"Tubo 2"""');
        expect(csvCell("dos\nlíneas")).toBe('"dos\nlíneas"');
    });

    it("neutralizes the text columns of a material and leaves the numbers as numbers", () => {
        const csv = budgetCsv([material({ name: "=1+1", category: "@SUM(A1)", unit: "-u" })]);

        expect(rows(csv)[1]).toBe("'=1+1;'@SUM(A1);'-u;10,00;8,50;85,00");
    });

    it("writes an empty category as an empty cell", () => {
        expect(rows(budgetCsv([material({ category: null })]))[1]).toBe(
            "Cemento;;saco;10,00;8,50;85,00",
        );
    });

    it("names the file after the project, without characters a file system refuses", () => {
        expect(budgetFileName("Casa Los Arrayanes")).toBe("presupuesto-casa-los-arrayanes.csv");
        expect(budgetFileName("Cabaña Mindo / Fase 2: ¿final?")).toBe(
            "presupuesto-cabana-mindo-fase-2-final.csv",
        );
        expect(budgetFileName('..\\<>:"|?*')).toBe("presupuesto-proyecto.csv");
        expect(budgetFileName("x".repeat(200))).toBe(`presupuesto-${"x".repeat(60)}.csv`);
    });
});
