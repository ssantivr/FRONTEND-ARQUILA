import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RenderImage } from "./RenderImage";

describe("RenderImage", () => {
    it("labels the sample scene as such and reveals it once it has loaded", () => {
        render(<RenderImage place="home" />);

        const image = screen.getByRole("img", { name: /Escena de muestra/ });

        expect(screen.getByText("Escena de muestra")).toBeInTheDocument();
        expect(image).not.toHaveClass("render-ready");

        fireEvent.load(image);

        expect(image).toHaveClass("render-ready");
    });

    it("uses a different sample picture in each place", () => {
        const home = render(<RenderImage place="home" />);
        const homeSource = home.container.querySelector("img")?.getAttribute("src");

        home.unmount();

        const auth = render(<RenderImage place="auth" />);

        expect(auth.container.querySelector("img")?.getAttribute("src")).not.toBe(homeSource);
    });

    it("falls back to the decorative drawing when the image cannot load", () => {
        const { container } = render(<RenderImage place="auth" />);

        fireEvent.error(screen.getByRole("img"));

        expect(screen.queryByRole("img")).not.toBeInTheDocument();
        expect(container.querySelector("svg.hero-art")).toHaveAttribute("aria-hidden", "true");
    });
});
