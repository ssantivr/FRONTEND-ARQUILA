import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import CostChart from "./CostChart";

describe("CostChart", () => {
    it("gives the same figures as a table for screen readers", () => {
        render(
            <CostChart
                label="Costo por categoría del proyecto"
                items={[
                    { category: "Estructura", amount: 2806, share: 41 },
                    { category: "Acabados", amount: 2640, share: 38 },
                ]}
            />,
        );

        const table = screen.getByRole("table", { name: "Costo por categoría del proyecto" });
        const [, first, second] = within(table).getAllByRole("row");

        expect(first).toHaveTextContent("Estructura");
        expect(first).toHaveTextContent("41 %");
        expect(second).toHaveTextContent("Acabados");
        expect(second).toHaveTextContent("38 %");
    });
});

describe("CostSummary", () => {
    it("shows the figures as a list when the chart cannot be drawn", async () => {
        vi.resetModules();
        vi.doMock("./CostChart", () => ({
            default: () => {
                throw new Error("sin gráfico");
            },
        }));
        const silence = vi.spyOn(console, "error").mockImplementation(() => undefined);
        const { CostSummary: Summary } = await import("./CostSummary");

        render(
            <Summary
                label="Costo por categoría del proyecto"
                items={[{ category: "Estructura", amount: 2806, share: 41 }]}
            />,
        );

        const item = await screen.findByRole("listitem");

        expect(item).toHaveTextContent("Estructura");
        expect(item).toHaveTextContent("41 %");

        silence.mockRestore();
        vi.doUnmock("./CostChart");
    });
});
