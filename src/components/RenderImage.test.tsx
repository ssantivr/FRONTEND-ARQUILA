import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { setTheme } from "../state/theme";
import { RenderImage } from "./RenderImage";

afterEach(() => {
    setTheme("light");
});

describe("RenderImage", () => {
    it("says the picture is a sample model drawn by the viewer and reveals it once loaded", () => {
        render(<RenderImage />);

        const image = screen.getByRole("img", { name: /Modelo de muestra dibujado con el visor/ });

        expect(screen.getByText("Modelo de muestra · visor 3D")).toBeInTheDocument();
        expect(image).not.toHaveClass("render-ready");

        fireEvent.load(image);

        expect(image).toHaveClass("render-ready");
    });

    it("shows the building by day in the light theme and by night in the dark one", () => {
        setTheme("light");

        const day = render(<RenderImage />);
        const daySource = day.container.querySelector("img")?.getAttribute("src");

        expect(screen.getByRole("img", { name: /de día/ })).toBeInTheDocument();
        day.unmount();
        setTheme("dark");
        render(<RenderImage />);

        expect(screen.getByRole("img", { name: /de noche/ })).toBeInTheDocument();
        expect(screen.getByRole("img").getAttribute("src")).not.toBe(daySource);
    });

    it("falls back to the decorative drawing when the image cannot load", () => {
        const { container } = render(<RenderImage />);

        fireEvent.error(screen.getByRole("img"));

        expect(screen.queryByRole("img")).not.toBeInTheDocument();
        expect(container.querySelector("svg.hero-art")).toHaveAttribute("aria-hidden", "true");
    });
});
