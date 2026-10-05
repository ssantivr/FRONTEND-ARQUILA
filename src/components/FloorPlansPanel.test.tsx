import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { structureApi } from "../services/api";
import type { Structure } from "../types/api";
import { FloorPlansPanel } from "./FloorPlansPanel";

vi.mock("../services/api", () => ({
    structureApi: { get: vi.fn() },
}));

const EMPTY: Structure = { project_id: 1, roof: "gable", terrains: [], rooms: [], components: [] };

const structure = vi.mocked(structureApi);

beforeEach(() => {
    vi.resetAllMocks();
    structure.get.mockResolvedValue(EMPTY);
});

describe("FloorPlansPanel", () => {
    it("loads the structure again when the plans of the project change", async () => {
        const view = render(<FloorPlansPanel projectId={1} projectName="Casa" version={0} />);

        await screen.findByText(/Agrega cuartos/);
        expect(structure.get).toHaveBeenCalledTimes(1);

        view.rerender(<FloorPlansPanel projectId={1} projectName="Casa" version={1} />);

        await waitFor(() => expect(structure.get).toHaveBeenCalledTimes(2));
    });
});
