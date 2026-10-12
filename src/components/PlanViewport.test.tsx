import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { PlanViewport } from "./PlanViewport";

function renderPlan() {
    const { container } = render(
        <PlanViewport width={400} height={200} unitsPerMetre={20}>
            <svg viewBox="0 0 400 200" role="img" aria-label="Planta de muestra" />
        </PlanViewport>,
    );
    const sheet = container.querySelector(".plan-sheet") as HTMLElement;

    // jsdom lays nothing out, so the sheet is given the size it would have on screen.
    sheet.getBoundingClientRect = () => new DOMRect(0, 0, 800, 400);

    return { sheet, stage: container.querySelector(".plan-stage") as HTMLElement };
}

function clickAt(stage: HTMLElement, x: number, y: number) {
    fireEvent.pointerDown(stage, { clientX: x, clientY: y });
    fireEvent.pointerUp(stage, { clientX: x, clientY: y });
}

describe("PlanViewport", () => {
    it("zooms in steps, stops at the fitted size and fits again on request", async () => {
        renderPlan();

        expect(screen.getByRole("button", { name: "Alejar el plano" })).toBeDisabled();

        await userEvent.click(screen.getByRole("button", { name: "Acercar el plano" }));
        expect(screen.getByLabelText("Zoom del plano")).toHaveTextContent("125 %");

        await userEvent.click(screen.getByRole("button", { name: "Ajustar" }));
        expect(screen.getByLabelText("Zoom del plano")).toHaveTextContent("100 %");
    });

    it("measures the distance between two points in metres", async () => {
        const { stage } = renderPlan();

        await userEvent.click(screen.getByRole("button", { name: "Medir" }));
        expect(screen.getByText("Marca dos puntos del plano.")).toBeInTheDocument();

        // 800 px on screen are 400 drawing units, and 20 units are one metre.
        clickAt(stage, 0, 0);
        clickAt(stage, 400, 0);

        expect(screen.getByText("Distancia: 10 m")).toBeInTheDocument();
    });

    it("moves an enlarged plan with the arrow keys", async () => {
        const { sheet, stage } = renderPlan();

        await userEvent.click(screen.getByRole("button", { name: "Acercar el plano" }));
        fireEvent.keyDown(stage, { key: "ArrowRight" });

        expect(sheet.style.transform).toBe("translate(-40px, 0px) scale(1.25)");
    });
});
