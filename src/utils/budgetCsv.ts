import type { Material } from "../types/api";

/**
 * The budget of a project as a CSV file, built from the materials already on screen.
 *
 * Made for a spreadsheet set to Spanish (Excel, LibreOffice): there the comma is the decimal mark,
 * so the list separator is the semicolon (`docs/DECISIONES.md`). Both are constants so a change
 * is one line. The amounts carry no currency symbol because the data has no currency column.
 */
export const CSV_DELIMITER = ";";
export const CSV_DECIMAL = ",";

const BOM = "﻿";
const LINE_END = "\r\n";
const HEADER = ["Nombre", "Categoría", "Unidad", "Cantidad", "Costo unitario", "Subtotal"];
// A spreadsheet runs a cell starting with one of these as a formula (CSV injection).
const FORMULA_START = /^[=+\-@\t\r]/;
const NEEDS_QUOTES = /["\r\n]/;
const MAX_NAME_LENGTH = 60;

/**
 * Hundredths of a value of `NUMERIC(12, 2)` (quantity) or cents of a price, as an exact integer.
 * The API sends at most two decimals, so rounding only removes the binary error of the float.
 */
export function toHundredths(value: number): bigint {
    return BigInt(Math.round(value * 100));
}

/**
 * The subtotal of a line in cents: hundredths × cents are ten-thousandths, rounded half up to the
 * cent. In `bigint`, so the largest values of the columns are still exact.
 */
export function lineTotalCents(quantityHundredths: bigint, unitCents: bigint): bigint {
    return (quantityHundredths * unitCents + 50n) / 100n;
}

function decimal(hundredths: bigint): string {
    const whole = hundredths / 100n;
    const rest = (hundredths % 100n).toString().padStart(2, "0");

    return `${whole}${CSV_DECIMAL}${rest}`;
}

/** One cell of text: neutralized if a spreadsheet would read it as a formula, quoted if needed. */
export function csvCell(text: string): string {
    const safe = FORMULA_START.test(text) ? `'${text}` : text;

    return NEEDS_QUOTES.test(safe) || safe.includes(CSV_DELIMITER)
        ? `"${safe.replace(/"/g, '""')}"`
        : safe;
}

export function budgetCsv(materials: Material[]): string {
    let totalCents = 0n;
    const lines = materials.map((material) => {
        const quantity = toHundredths(material.quantity);
        const unitCost = toHundredths(material.unit_cost);
        const subtotal = lineTotalCents(quantity, unitCost);

        totalCents += subtotal;

        return [
            csvCell(material.name),
            csvCell(material.category ?? ""),
            csvCell(material.unit),
            decimal(quantity),
            decimal(unitCost),
            decimal(subtotal),
        ];
    });
    const total = ["Total", "", "", "", "", decimal(totalCents)];

    return (
        BOM +
        [HEADER, ...lines, total].map((cells) => cells.join(CSV_DELIMITER) + LINE_END).join("")
    );
}

/** `presupuesto-<project>.csv`, in lower case ASCII letters, digits and hyphens. */
export function budgetFileName(projectName: string): string {
    const slug = projectName
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, MAX_NAME_LENGTH)
        .replace(/-+$/, "");

    return `presupuesto-${slug === "" ? "proyecto" : slug}.csv`;
}

export function downloadBudgetCsv(materials: Material[], projectName: string): void {
    const blob = new Blob([budgetCsv(materials)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = budgetFileName(projectName);
    link.click();
    URL.revokeObjectURL(url);
}
