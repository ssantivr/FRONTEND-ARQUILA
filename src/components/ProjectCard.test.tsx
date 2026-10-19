import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { Project } from "../types/api";
import { ProjectCard } from "./ProjectCard";

const project: Project = {
    id: 7,
    owner_id: 1,
    name: "Casa Andina",
    description: null,
    location: null,
    status: "active",
    created_at: "2026-10-01T12:00:00Z",
    updated_at: "2026-10-04T12:00:00Z",
};

describe("ProjectCard", () => {
    it("shows the name, a placeholder for the missing location and the last update", () => {
        render(<ProjectCard project={project} onOpen={() => undefined} />);

        const card = screen.getByRole("button", { name: /Casa Andina/ });

        expect(card).toHaveTextContent("Sin ubicación");
        expect(card).toHaveTextContent("Actualizado 4 oct 2026");
    });

    it("draws the cover from the initials and hides it from assistive technology", () => {
        const { container } = render(<ProjectCard project={project} onOpen={() => undefined} />);
        const cover = container.querySelector(".project-cover");

        expect(cover).toHaveTextContent("CA");
        expect(cover).toHaveAttribute("aria-hidden", "true");
    });

    it("opens its project", async () => {
        const onOpen = vi.fn();

        render(<ProjectCard project={project} onOpen={onOpen} />);
        await userEvent.click(screen.getByRole("button", { name: /Casa Andina/ }));

        expect(onOpen).toHaveBeenCalledWith(7);
    });
});
