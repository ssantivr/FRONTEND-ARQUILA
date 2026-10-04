import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AsyncStatus } from "./AsyncStatus";

describe("AsyncStatus", () => {
    it("announces that the data is loading", () => {
        render(<AsyncStatus loading error={null} isEmpty emptyText="Sin datos." />);

        expect(screen.getByRole("status")).toHaveTextContent("Cargando…");
        expect(screen.queryByText("Sin datos.")).not.toBeInTheDocument();
    });

    it("shows the empty text once the load finishes without data", () => {
        render(<AsyncStatus loading={false} error={null} isEmpty emptyText="Sin datos." />);

        expect(screen.getByText("Sin datos.")).toBeInTheDocument();
        expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });

    it("renders nothing when there is data", () => {
        const { container } = render(
            <AsyncStatus loading error={null} isEmpty={false} emptyText="Sin datos." />,
        );

        expect(container).toBeEmptyDOMElement();
    });

    it("shows the error as an alert and lets the user retry", async () => {
        const onRetry = vi.fn();

        render(
            <AsyncStatus
                loading={false}
                error="No se pudo conectar con el servidor."
                isEmpty
                emptyText="Sin datos."
                onRetry={onRetry}
            />,
        );

        expect(screen.getByRole("alert")).toHaveTextContent("No se pudo conectar con el servidor.");

        await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));

        expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it("blocks the retry button while the retry is running", () => {
        render(
            <AsyncStatus loading error="Falló." isEmpty emptyText="" onRetry={() => undefined} />,
        );

        expect(screen.getByRole("button", { name: "Reintentando…" })).toBeDisabled();
    });

    it("shows the error without a button when there is nothing to retry", () => {
        render(<AsyncStatus loading={false} error="Falló." isEmpty emptyText="" />);

        expect(screen.getByRole("alert")).toHaveTextContent("Falló.");
        expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });
});
