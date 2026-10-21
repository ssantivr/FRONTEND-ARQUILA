import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Project } from "../types/api";
import { ProjectTile } from "./ProjectTile";

function project(overrides: Partial<Project> = {}): Project {
    return {
        id: 3,
        owner_id: 1,
        name: "Casa Andina",
        description: null,
        location: null,
        status: "active",
        created_at: "2026-10-01T12:00:00Z",
        updated_at: "2026-10-04T12:00:00Z",
        ...overrides,
    };
}

afterEach(() => window.localStorage.clear());

describe("ProjectTile", () => {
    it("shows what the API gives and leaves out what it does not", () => {
        render(<ProjectTile project={project()} onOpen={() => undefined} />);

        const card = screen.getByRole("button", { name: /Casa Andina/ });

        expect(card).toHaveTextContent("Activo");
        expect(card.querySelector("time")).toHaveAttribute("datetime", "2026-10-04T12:00:00Z");
        // No location and no picture of the model yet: nothing is made up in their place.
        expect(card).not.toHaveTextContent("Sin ubicación");
        expect(card.querySelector("img")).toBeNull();
    });

    it("shows the place when the project has one, and opens it", async () => {
        const onOpen = vi.fn();

        render(<ProjectTile project={project({ location: "Quito" })} onOpen={onOpen} />);
        await userEvent.click(screen.getByRole("button", { name: /Casa Andina/ }));

        expect(screen.getByText("Quito")).toBeInTheDocument();
        expect(onOpen).toHaveBeenCalledWith(3);
    });

    it("uses the picture of the project's own model once one was taken", () => {
        window.localStorage.setItem("arquila:thumb:3", "data:image/jpeg;base64,AAAA");

        const { container } = render(<ProjectTile project={project()} onOpen={() => undefined} />);

        expect(container.querySelector("img")).toHaveAttribute(
            "src",
            "data:image/jpeg;base64,AAAA",
        );
    });

    it("prefers the cover chosen in the API and falls back to the model if it fails", () => {
        window.localStorage.setItem("arquila:thumb:3", "data:image/jpeg;base64,AAAA");

        const { container } = render(
            <ProjectTile project={project({ cover_file_id: 12 })} onOpen={() => undefined} />,
        );
        const image = container.querySelector("img");

        expect(image?.getAttribute("src")).toMatch(/\/files\/12\/content$/);
        fireEvent.error(image as HTMLImageElement);
        expect(container.querySelector("img")).toHaveAttribute(
            "src",
            "data:image/jpeg;base64,AAAA",
        );
    });

    it("shows the progress only when the API sends it", () => {
        const { rerender } = render(<ProjectTile project={project()} onOpen={() => undefined} />);

        expect(screen.queryByRole("progressbar")).toBeNull();

        rerender(<ProjectTile project={project({ progress: 45 })} onOpen={() => undefined} />);
        expect(screen.getByRole("progressbar", { name: "Avance" })).toHaveAttribute(
            "aria-valuenow",
            "45",
        );
    });
});
