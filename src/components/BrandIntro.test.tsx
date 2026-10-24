import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { setReduceMotion } from "../state/motion";
import { BrandIntro, INTRO_MS } from "./BrandIntro";

beforeEach(() => {
    window.sessionStorage.clear();
    vi.useFakeTimers();
});

afterEach(() => {
    vi.useRealTimers();
    setReduceMotion(false);
});

describe("BrandIntro", () => {
    it("plays once, hidden from screen readers, and goes away by itself", () => {
        render(<BrandIntro />);

        const intro = screen.getByTestId("brand-intro");

        expect(intro).toHaveAttribute("aria-hidden", "true");

        act(() => vi.advanceTimersByTime(INTRO_MS));

        expect(screen.queryByTestId("brand-intro")).not.toBeInTheDocument();
    });

    it("ends at once with any key or click", () => {
        render(<BrandIntro />);

        fireEvent.keyDown(window, { key: "Escape" });

        expect(screen.queryByTestId("brand-intro")).not.toBeInTheDocument();
    });

    it("does not play again in the same tab", () => {
        const { unmount } = render(<BrandIntro />);

        unmount();
        render(<BrandIntro />);

        expect(screen.queryByTestId("brand-intro")).not.toBeInTheDocument();
    });

    it("does not play when less movement is asked for", () => {
        setReduceMotion(true);
        render(<BrandIntro />);

        expect(screen.queryByTestId("brand-intro")).not.toBeInTheDocument();
    });
});
