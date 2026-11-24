import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TextField } from "./TextField";

describe("TextField", () => {
    it("stops at 200 characters and counts them", () => {
        render(<TextField label="Descripción" value="Casa" onChange={() => undefined} />);

        expect(screen.getByLabelText("Descripción")).toHaveAttribute("maxlength", "200");
        expect(screen.getByText("4/200")).toBeInTheDocument();
        expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });

    it("says so at the limit", () => {
        render(<TextField label="Descripción" value={"x".repeat(200)} onChange={() => {}} />);

        expect(screen.getByRole("status")).toHaveTextContent("máximo de 200");
    });

    it("marks an older text that is longer, without cutting it", () => {
        render(<TextField label="Descripción" value={"x".repeat(250)} onChange={() => {}} />);

        const input = screen.getByLabelText("Descripción");

        expect(input).toHaveAttribute("aria-invalid", "true");
        expect(input).toHaveValue("x".repeat(250));
    });
});
