import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FormActions } from "../components/RowActions";
import { ProgressBar } from "../components/ui/ProgressBar";
import { SaveStatusProvider } from "./saveStatus";
import { setTheme } from "./theme";
import { withViewTransition } from "./viewTransition";

function Forms({ pending, failed = false }: { pending: boolean; failed?: boolean }) {
    return (
        <SaveStatusProvider value={{ pending, failed }}>
            <form onSubmit={(event) => event.preventDefault()}>
                <FormActions
                    editing={false}
                    addLabel="Agregar material"
                    onCancel={() => undefined}
                />
            </form>
            <form onSubmit={(event) => event.preventDefault()}>
                <FormActions editing={false} addLabel="Agregar cuarto" onCancel={() => undefined} />
            </form>
        </SaveStatusProvider>
    );
}

afterEach(() => {
    vi.useRealTimers();
    delete document.documentElement.dataset.motion;
});

describe("saving feedback on the button that sent the form", () => {
    it("shows «Guardando…» and then «Guardado» only on the form that was sent", async () => {
        const { rerender } = render(<Forms pending={false} />);

        await userEvent.click(screen.getByRole("button", { name: "Agregar material" }));
        rerender(<Forms pending />);

        expect(screen.getByRole("button", { name: "Guardando…" })).toBeDisabled();
        expect(screen.getByRole("button", { name: "Agregar cuarto" })).toBeEnabled();

        vi.useFakeTimers();
        rerender(<Forms pending={false} />);

        expect(screen.getByRole("button", { name: "Guardado" })).toBeEnabled();

        act(() => vi.advanceTimersByTime(1400));

        expect(screen.getByRole("button", { name: "Agregar material" })).toBeInTheDocument();
    });

    it("does not claim it was saved when the change failed", async () => {
        const { rerender } = render(<Forms pending={false} />);

        await userEvent.click(screen.getByRole("button", { name: "Agregar material" }));
        rerender(<Forms pending />);
        rerender(<Forms pending={false} failed />);

        expect(screen.queryByRole("button", { name: "Guardado" })).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Agregar material" })).toBeEnabled();
    });
});

describe("movement that does not shift the layout", () => {
    it("fills a progress bar with a transform, not with its width", () => {
        const { container } = render(<ProgressBar label="Avance" value={0.4} />);
        const fill = container.querySelector<HTMLElement>(".bar-progress > span");

        expect(fill?.style.transform).toBe("scaleX(0.4)");
        expect(fill?.style.width).toBe("");
    });
});

describe("change of theme", () => {
    it("marks the page for one colour transition and then lets go", () => {
        vi.useFakeTimers();
        setTheme("light");
        act(() => vi.advanceTimersByTime(1000));

        setTheme("dark");

        expect(document.documentElement.dataset.theme).toBe("dark");
        expect(document.documentElement).toHaveAttribute("data-theme-switching");

        act(() => vi.advanceTimersByTime(220));

        expect(document.documentElement).not.toHaveAttribute("data-theme-switching");
    });
});

describe("change of screen", () => {
    function fakeTransitions(start: unknown) {
        Object.defineProperty(document, "startViewTransition", {
            configurable: true,
            value: start,
        });
    }

    afterEach(() => {
        Reflect.deleteProperty(document, "startViewTransition");
    });

    it("just changes where the browser has no view transitions", () => {
        const update = vi.fn();

        withViewTransition(update);

        expect(update).toHaveBeenCalledTimes(1);
        expect(document.documentElement).not.toHaveAttribute("data-view-transition");
    });

    it("uses the browser's transition where there is one, and cleans up after it", async () => {
        let finish: () => void = () => undefined;
        const finished = new Promise<void>((resolve) => {
            finish = resolve;
        });
        const update = vi.fn();

        fakeTransitions(
            vi.fn((run: () => void) => {
                run();

                return { finished };
            }),
        );

        withViewTransition(update);

        expect(update).toHaveBeenCalledTimes(1);
        expect(document.documentElement).toHaveAttribute("data-view-transition");

        finish();
        await finished;
        await Promise.resolve();

        expect(document.documentElement).not.toHaveAttribute("data-view-transition");
    });

    it("skips the transition when the user turned movement off", () => {
        const start = vi.fn();
        const update = vi.fn();

        fakeTransitions(start);
        document.documentElement.dataset.motion = "reduced";
        window.localStorage.setItem("arquila:reduce-motion", "on");

        // The preference is read from the store, which the switch in Configuración sets.
        return import("./motion").then(({ setReduceMotion }) => {
            setReduceMotion(true);
            withViewTransition(update);

            expect(start).not.toHaveBeenCalled();
            expect(update).toHaveBeenCalledTimes(1);

            setReduceMotion(false);
        });
    });
});
