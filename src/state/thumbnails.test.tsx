import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { ProjectCard } from "../components/ProjectCard";
import type { Project } from "../types/api";
import { readThumbnail, saveThumbnail } from "./thumbnails";

const project: Project = {
    id: 3,
    owner_id: 1,
    name: "Casa Mirador",
    description: null,
    location: "Manizales",
    status: "active",
    created_at: "2026-10-01T12:00:00Z",
    updated_at: "2026-10-04T12:00:00Z",
};

beforeEach(() => {
    window.localStorage.clear();
});

describe("thumbnails", () => {
    it("keeps the picture of a project and gives it back", () => {
        expect(readThumbnail(3)).toBeNull();

        saveThumbnail(3, "data:image/jpeg;base64,AAAA");

        expect(readThumbnail(3)).toBe("data:image/jpeg;base64,AAAA");
    });

    it("keeps only the last 24 projects, dropping the oldest", () => {
        for (let id = 1; id <= 26; id += 1) {
            saveThumbnail(id, `data:image/jpeg;base64,${id}`);
        }

        expect(readThumbnail(1)).toBeNull();
        expect(readThumbnail(2)).toBeNull();
        expect(readThumbnail(3)).not.toBeNull();
        expect(readThumbnail(26)).not.toBeNull();
    });

    it("does not count a project twice when its picture is taken again", () => {
        for (let id = 1; id <= 24; id += 1) {
            saveThumbnail(id, "data:image/jpeg;base64,AAAA");
        }

        saveThumbnail(1, "data:image/jpeg;base64,BBBB");

        expect(readThumbnail(1)).toBe("data:image/jpeg;base64,BBBB");
        expect(readThumbnail(2)).not.toBeNull();
    });
});

describe("ProjectCard cover", () => {
    it("shows the drawn cover until the model has a picture, and then the picture", () => {
        const { container } = render(<ProjectCard project={project} onOpen={() => undefined} />);

        expect(container.querySelector(".project-cover-art")).toBeInTheDocument();
        expect(container.querySelector(".project-thumbnail")).not.toBeInTheDocument();

        act(() => saveThumbnail(3, "data:image/jpeg;base64,AAAA"));

        expect(container.querySelector(".project-thumbnail")).toHaveAttribute(
            "src",
            "data:image/jpeg;base64,AAAA",
        );
        expect(container.querySelector(".project-cover-art")).not.toBeInTheDocument();
        // The picture is decoration: the card is still named by the project.
        expect(screen.getByRole("button", { name: /Casa Mirador/ })).toBeInTheDocument();
    });
});
