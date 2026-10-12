import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ErrorBoundary } from "./ErrorBoundary";

let broken = true;

function Screen() {
    if (broken) {
        throw new Error("boom");
    }

    return <p>Pantalla lista</p>;
}

beforeEach(() => {
    broken = true;
    // React reports the caught error on the console; the test output stays readable without it.
    vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe("ErrorBoundary", () => {
    it("replaces a crashed screen with a message instead of an empty page", () => {
        render(
            <ErrorBoundary>
                <Screen />
            </ErrorBoundary>,
        );

        expect(screen.getByRole("alert")).toHaveTextContent("Esta pantalla tuvo un problema");
    });

    it("shows the screen again when retrying works", async () => {
        render(
            <ErrorBoundary>
                <Screen />
            </ErrorBoundary>,
        );

        broken = false;
        await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));

        expect(screen.getByText("Pantalla lista")).toBeInTheDocument();
    });
});
