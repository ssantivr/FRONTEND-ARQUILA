import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RenderImage } from "./RenderImage";

describe("RenderImage", () => {
    it("describes the render and reveals it once it has loaded", () => {
        render(<RenderImage time="day" />);

        const image = screen.getByRole("img", {
            name: "Casa de muestra modelada con el visor 3D de ARQUILA",
        });

        expect(image).not.toHaveClass("render-ready");

        fireEvent.load(image);

        expect(image).toHaveClass("render-ready");
    });

    it("falls back to the decorative drawing when the image cannot load", () => {
        const { container } = render(<RenderImage time="night" />);

        fireEvent.error(screen.getByRole("img"));

        expect(screen.queryByRole("img")).not.toBeInTheDocument();
        expect(container.querySelector("svg.hero-art")).toHaveAttribute("aria-hidden", "true");
    });
});
