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

afterEach(async () => {
    vi.useRealTimers();
    // The motion switch and the theme mark are shared by the whole page: leave them as found.
    (await import("./motion")).setReduceMotion(false);
    delete document.documentElement.dataset.themeSwitching;
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
        const fill = container.querySelector<HTMLElement>('[role="progressbar"] > span');

        expect(fill?.style.transform).toBe("scaleX(0.4)");
        expect(fill?.style.width).toBe("");
    });
});

describe("change of theme", () => {
    it("changes at once, without the colour transition, when movement is reduced", async () => {
        const { setReduceMotion } = await import("./motion");

        setReduceMotion(true);
        setTheme("light");
        setTheme("dark");

        expect(document.documentElement.dataset.theme).toBe("dark");
        expect(document.documentElement).not.toHaveAttribute("data-theme-switching");

        setReduceMotion(false);
    });

    it("changes at once where the browser has no view transitions", () => {
        setTheme("light");
        setTheme("dark");

        expect(document.documentElement.dataset.theme).toBe("dark");
        expect(document.documentElement).not.toHaveAttribute("data-theme-switching");
    });

    it("cross-fades inside a view transition and lets go of the mark when it ends", async () => {
        let end = () => undefined as void;
        const finished = new Promise<void>((resolve) => {
            end = resolve;
        });
        const start = vi.fn((run: () => void) => {
            run();

            return { finished };
        });

        setTheme("light");
        Object.defineProperty(document, "startViewTransition", {
            configurable: true,
            value: start,
        });

        try {
            setTheme("dark");

            expect(start).toHaveBeenCalledTimes(1);
            expect(document.documentElement.dataset.theme).toBe("dark");
            expect(document.documentElement).toHaveAttribute("data-theme-switching");

            await act(async () => end());

            expect(document.documentElement).not.toHaveAttribute("data-theme-switching");
        } finally {
            Reflect.deleteProperty(document, "startViewTransition");
        }
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
    });

    it("hands the change to the browser's transition where there is one", () => {
        const update = vi.fn();
        const start = vi.fn((run: () => void) => run());

        fakeTransitions(start);
        withViewTransition(update);

        expect(start).toHaveBeenCalledTimes(1);
        expect(update).toHaveBeenCalledTimes(1);
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
