import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { authApi } from "../services/api";
import { ResetPasswordPage } from "./ResetPasswordPage";

vi.mock("../services/api", () => ({
    authApi: { confirmPasswordReset: vi.fn() },
}));

const api = vi.mocked(authApi);

beforeEach(() => {
    vi.resetAllMocks();
});

describe("ResetPasswordPage", () => {
    it("does not send two passwords that differ, and says why next to the field", async () => {
        render(<ResetPasswordPage token="0123456789abc" onDone={() => undefined} />);

        await userEvent.type(screen.getByLabelText("Contraseña nueva"), "correct-horse");
        await userEvent.type(screen.getByLabelText("Repetir contraseña"), "correct-hors");
        await userEvent.click(screen.getByRole("button", { name: "Guardar contraseña" }));

        const repeated = screen.getByLabelText("Repetir contraseña");

        expect(api.confirmPasswordReset).not.toHaveBeenCalled();
        expect(repeated).toHaveAttribute("aria-invalid", "true");
        expect(repeated).toHaveAccessibleDescription("Las dos contraseñas no coinciden.");
        expect(repeated).toHaveFocus();
    });

    it("sends the new password with the token of the link and reports it changed", async () => {
        const onDone = vi.fn();
        api.confirmPasswordReset.mockResolvedValue(undefined);

        render(<ResetPasswordPage token="0123456789abc" onDone={onDone} />);
        await userEvent.type(screen.getByLabelText("Contraseña nueva"), "correct-horse");
        await userEvent.type(screen.getByLabelText("Repetir contraseña"), "correct-horse");
        await userEvent.click(screen.getByRole("button", { name: "Guardar contraseña" }));

        expect(api.confirmPasswordReset).toHaveBeenCalledWith("0123456789abc", "correct-horse");
        expect(onDone).toHaveBeenCalledWith(true);
    });

    it("shows the translated error of an expired link", async () => {
        api.confirmPasswordReset.mockRejectedValue(
            new Error("The reset link is invalid or has expired"),
        );

        render(<ResetPasswordPage token="0123456789abc" onDone={() => undefined} />);
        await userEvent.type(screen.getByLabelText("Contraseña nueva"), "correct-horse");
        await userEvent.type(screen.getByLabelText("Repetir contraseña"), "correct-horse");
        await userEvent.click(screen.getByRole("button", { name: "Guardar contraseña" }));

        expect(await screen.findByRole("alert")).toHaveTextContent("ya caducó");
    });
});
