import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { activityApi } from "../../services/api";
import { NO_FILTERS, ProjectActivityPanel, toApiFilters } from "./ProjectActivityPanel";

vi.mock("../../services/api", () => ({
    activityApi: { listByProject: vi.fn() },
}));

beforeEach(() => {
    vi.resetAllMocks();
});

describe("history filters", () => {
    const empty = { items: [], total: 0, page: 1, page_size: 20 };
    let previousZone: string | undefined;

    // H3: a fixed time zone, so the local days are tested whatever the machine's zone.
    beforeAll(() => {
        previousZone = process.env.TZ;
        process.env.TZ = "America/Bogota";
    });

    afterAll(() => {
        if (previousZone === undefined) {
            delete process.env.TZ;
        } else {
            process.env.TZ = previousZone;
        }
    });

    it("sends nothing when no filter is set", () => {
        expect(toApiFilters(NO_FILTERS)).toEqual({ filters: {}, rangeError: false });
    });

    it("turns the days into whole local days as UTC instants", () => {
        expect(
            toApiFilters({
                origin: "ai",
                sourceModule: "plans",
                fromDay: "2026-11-10",
                toDay: "2026-11-11",
            }),
        ).toEqual({
            filters: {
                origin: "ai",
                sourceModule: "plans",
                // Bogota is UTC-5 all year: local midnight is 05:00 UTC.
                from: "2026-11-10T05:00:00.000Z",
                to: "2026-11-12T05:00:00.000Z",
            },
            rangeError: false,
        });
    });

    it("follows a day that lasts 23 hours", () => {
        process.env.TZ = "America/New_York";

        try {
            // Daylight saving starts on 2026-03-08: the day opens at UTC-5 and closes at UTC-4.
            expect(
                toApiFilters({ ...NO_FILTERS, fromDay: "2026-03-08", toDay: "2026-03-08" }).filters,
            ).toEqual({ from: "2026-03-08T05:00:00.000Z", to: "2026-03-09T04:00:00.000Z" });
        } finally {
            process.env.TZ = "America/Bogota";
        }
    });

    it("does not send a range that ends before it starts", () => {
        expect(toApiFilters({ ...NO_FILTERS, fromDay: "2026-11-12", toDay: "2026-11-10" })).toEqual(
            { filters: {}, rangeError: true },
        );
    });

    it("leaves out a day outside the years the field accepts", () => {
        expect(toApiFilters({ ...NO_FILTERS, fromDay: "0099-01-01" }).filters).toEqual({});
        expect(toApiFilters({ ...NO_FILTERS, toDay: "12026-01-01" }).filters).toEqual({});
        expect(toApiFilters({ ...NO_FILTERS, toDay: "9999-12-31" }).filters).toEqual({});
    });

    it("goes back to the first page when a filter changes", async () => {
        vi.mocked(activityApi.listByProject).mockResolvedValue({ ...empty, total: 45 });
        render(<ProjectActivityPanel projectId={7} />);

        await userEvent.click(await screen.findByRole("button", { name: "Siguiente" }));
        await waitFor(() =>
            expect(activityApi.listByProject).toHaveBeenLastCalledWith(7, 2, 20, {}),
        );

        await userEvent.selectOptions(screen.getByLabelText("Módulo"), "Modelo 3D");
        await waitFor(() =>
            expect(activityApi.listByProject).toHaveBeenLastCalledWith(7, 1, 20, {
                sourceModule: "viewer",
            }),
        );

        await userEvent.selectOptions(screen.getByLabelText("Origen"), "IA");
        await waitFor(() =>
            expect(activityApi.listByProject).toHaveBeenLastCalledWith(7, 1, 20, {
                sourceModule: "viewer",
                origin: "ai",
            }),
        );
    });

    it("sends the days typed in the fields as a UTC range", async () => {
        vi.mocked(activityApi.listByProject).mockResolvedValue(empty);
        render(<ProjectActivityPanel projectId={7} />);

        await userEvent.type(await screen.findByLabelText("Desde"), "2026-11-10");
        await userEvent.type(screen.getByLabelText("Hasta"), "2026-11-11");

        await waitFor(() =>
            expect(activityApi.listByProject).toHaveBeenLastCalledWith(7, 1, 20, {
                from: "2026-11-10T05:00:00.000Z",
                to: "2026-11-12T05:00:00.000Z",
            }),
        );
    });

    it("lists the 18 modules by their Spanish names", async () => {
        vi.mocked(activityApi.listByProject).mockResolvedValue(empty);
        render(<ProjectActivityPanel projectId={7} />);

        const options = within(await screen.findByLabelText("Módulo")).getAllByRole("option");

        expect(options).toHaveLength(19);
        expect(options[0]).toHaveTextContent("Todos");
        expect(options.map((option) => option.textContent)).toContain("Renderizado");
    });

    it("says when nothing matches, clears the filters and keeps the focus", async () => {
        vi.mocked(activityApi.listByProject).mockResolvedValue(empty);
        render(<ProjectActivityPanel projectId={7} />);

        expect(await screen.findByText("Sin cambios registrados")).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Quitar filtros" })).toBeNull();

        await userEvent.selectOptions(screen.getByLabelText("Origen"), "Sistema");

        expect(
            await screen.findByText("Ningún cambio coincide con los filtros"),
        ).toBeInTheDocument();
        await userEvent.click(screen.getByRole("button", { name: "Quitar filtros" }));

        await waitFor(() =>
            expect(activityApi.listByProject).toHaveBeenLastCalledWith(7, 1, 20, {}),
        );
        expect(screen.getByLabelText("Origen")).toHaveValue("");
        expect(screen.getByLabelText("Origen")).toHaveFocus();
    });

    it("explains a range that ends before it starts and marks both dates", async () => {
        vi.mocked(activityApi.listByProject).mockResolvedValue(empty);
        render(<ProjectActivityPanel projectId={7} />);

        await userEvent.type(await screen.findByLabelText("Desde"), "2026-11-12");
        await userEvent.type(screen.getByLabelText("Hasta"), "2026-11-10");

        expect(
            await screen.findByText(
                "«Hasta» es anterior a «Desde». Corrige el rango para filtrar.",
            ),
        ).toBeInTheDocument();
        expect(screen.getByLabelText("Desde")).toHaveAttribute("aria-invalid", "true");
        expect(screen.getByLabelText("Hasta")).toHaveAttribute("aria-invalid", "true");
        expect(activityApi.listByProject).toHaveBeenLastCalledWith(7, 1, 20, {});
    });
});
