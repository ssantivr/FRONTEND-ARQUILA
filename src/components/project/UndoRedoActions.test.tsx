import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { useState } from "react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { errorMessage } from "../../hooks/useAsync";
import { showToast } from "../../state/toasts";
import type { DeletedItem } from "../../types/api";
import { UndoRedoActions } from "./UndoRedoActions";

vi.mock("../../state/toasts", async (original) => ({
    ...(await original<typeof import("../../state/toasts")>()),
    showToast: vi.fn(),
}));

const STEEL: DeletedItem = { kind: "material", label: "Acero" };
const server = setupServer();
let undoable: DeletedItem[] = [];

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
beforeEach(() => {
    undoable = [STEEL];
    vi.mocked(showToast).mockClear();
    server.use(
        http.get("*/api/projects/1/undo", () => HttpResponse.json(undoable)),
        http.post("*/api/projects/1/undo", () => {
            const restored = undoable.shift();

            return HttpResponse.json(restored);
        }),
    );
});

/** The project page, reduced to what the buttons need: `run` and the list of deletions. */
function Page() {
    const [list, setList] = useState<DeletedItem[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function reload() {
        const response = await fetch("/api/projects/1/undo");

        setList(await response.json());
    }

    if (list === null) {
        void reload();
    }

    async function run(action: () => Promise<unknown>, onDone: () => void) {
        setError(null);

        try {
            await action();
        } catch (reason) {
            setError(errorMessage(reason));
            return;
        }

        onDone();
        await reload();
    }

    return (
        <>
            <UndoRedoActions projectId={1} undoable={list} run={run} onChanged={() => {}} />
            {error && <p role="alert">{error}</p>}
        </>
    );
}

async function undoTheLastDeletion() {
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Deshacer: material «Acero»" }));
    await screen.findByRole("button", { name: "Rehacer: material «Acero»" });

    return user;
}

describe("UndoRedoActions", () => {
    it("disables redo until something was undone", async () => {
        render(<Page />);

        const redo = await screen.findByRole("button", { name: /^Rehacer/ });

        expect(redo).toHaveAttribute("aria-disabled", "true");
        expect(redo).toHaveAccessibleDescription("No hay nada que rehacer.");
    });

    it("deletes again what undo restored and says so", async () => {
        server.use(
            http.post("*/api/projects/1/redo", () => {
                undoable.unshift(STEEL);

                return HttpResponse.json(STEEL);
            }),
        );
        render(<Page />);

        const user = await undoTheLastDeletion();

        await user.click(screen.getByRole("button", { name: "Rehacer: material «Acero»" }));

        await waitFor(() =>
            expect(showToast).toHaveBeenCalledWith("Se eliminó de nuevo: material «Acero»."),
        );
        expect(await screen.findByRole("button", { name: /^Rehacer/ })).toHaveAttribute(
            "aria-disabled",
            "true",
        );
        expect(screen.getByRole("button", { name: "Deshacer: material «Acero»" })).toBeVisible();
    });

    it("forgets the redo when the server has nothing to redo", async () => {
        server.use(
            http.post("*/api/projects/1/redo", () =>
                HttpResponse.json({ detail: "Nothing to redo" }, { status: 404 }),
            ),
        );
        render(<Page />);

        const user = await undoTheLastDeletion();

        await user.click(screen.getByRole("button", { name: "Rehacer: material «Acero»" }));

        await waitFor(() =>
            expect(showToast).toHaveBeenCalledWith("No hay nada que rehacer.", "info"),
        );
        expect(await screen.findByRole("button", { name: /^Rehacer/ })).toHaveAttribute(
            "aria-disabled",
            "true",
        );
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("shows the error and keeps the redo available when the request fails", async () => {
        server.use(
            http.post("*/api/projects/1/redo", () =>
                HttpResponse.json({ detail: "Internal Server Error" }, { status: 500 }),
            ),
        );
        render(<Page />);

        const user = await undoTheLastDeletion();

        await user.click(screen.getByRole("button", { name: "Rehacer: material «Acero»" }));

        expect(await screen.findByRole("alert")).toBeInTheDocument();
        expect(showToast).not.toHaveBeenCalled();
        expect(
            screen.getByRole("button", { name: "Rehacer: material «Acero»" }),
        ).not.toHaveAttribute("aria-disabled");
    });
});
