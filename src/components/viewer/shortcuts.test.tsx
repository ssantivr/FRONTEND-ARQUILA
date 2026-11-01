import { fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GLOBAL_SHORTCUTS, globalHelpRequested, VIEWER_SHORTCUTS } from "./shortcuts";

/** Presses `?` on `target` and tells whether the application would open its help. */
function pressHelp(target: Element | Document, init: KeyboardEventInit = {}): boolean {
    const seen = vi.fn();

    function listen(event: KeyboardEvent) {
        seen(globalHelpRequested(event));
    }

    window.addEventListener("keydown", listen);
    fireEvent.keyDown(target, { key: "?", ...init });
    window.removeEventListener("keydown", listen);

    return seen.mock.calls[0]?.[0] === true;
}

afterEach(() => {
    document.body.replaceChildren();
});

describe("the help shortcut", () => {
    it("opens from anywhere that is not a field", () => {
        const { container } = render(<button type="button">Algo</button>);

        expect(pressHelp(document.body)).toBe(true);
        expect(pressHelp(container.querySelector("button")!)).toBe(true);
    });

    it.each([
        ["a text field", <input key="i" aria-label="Campo" />],
        ["a checkbox", <input key="c" type="checkbox" aria-label="Casilla" />],
        ["a text area", <textarea key="t" aria-label="Texto" />],
        ["a select", <select key="s" aria-label="Lista" />],
    ])("does not fire from %s", (_, field) => {
        const { container } = render(field);

        expect(pressHelp(container.firstElementChild!)).toBe(false);
    });

    it("does not fire inside a window, or with a modifier held", () => {
        const { container } = render(
            <div role="dialog" aria-label="Ventana">
                <button type="button">Dentro</button>
            </div>,
        );

        expect(pressHelp(container.querySelector("button")!)).toBe(false);
        expect(pressHelp(document.body, { ctrlKey: true })).toBe(false);
    });

    it("leaves the key to the viewer when the focus is on it", () => {
        render(
            <div data-viewer-keys="">
                <button type="button">Vista</button>
            </div>,
        );

        expect(pressHelp(document.body)).toBe(false);
    });

    it("lists each key once, with the help among those of the whole application", () => {
        const all = [...VIEWER_SHORTCUTS, ...GLOBAL_SHORTCUTS].map((item) => item.action);

        expect(new Set(all).size).toBe(all.length);
        expect(GLOBAL_SHORTCUTS.some((item) => item.keys.includes("?"))).toBe(true);
    });
});
