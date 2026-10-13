import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

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
