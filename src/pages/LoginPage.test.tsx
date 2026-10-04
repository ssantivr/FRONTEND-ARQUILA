import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { authApi } from "../services/api";
import type { User } from "../types/api";
import { LoginPage } from "./LoginPage";

vi.mock("../services/api", () => ({
    authApi: {
        login: vi.fn(),
        register: vi.fn(),
        requestPasswordReset: vi.fn(),
    },
}));

const USER: User = {
    id: 1,
    name: "Ana",
    email: "ana@example.com",
    created_at: "2026-10-01T00:00:00",
};

const api = vi.mocked(authApi);

beforeEach(() => {
    vi.resetAllMocks();
});

describe("LoginPage", () => {
    it("labels every field of the form", () => {
        render(<LoginPage onAuthenticated={() => undefined} />);

        expect(screen.getByRole("heading", { name: "Iniciar sesión" })).toBeInTheDocument();
        expect(screen.getByLabelText("Correo")).toHaveAttribute("type", "email");
        expect(screen.getByLabelText("Contraseña")).toHaveAttribute("type", "password");
        expect(screen.queryByLabelText("Nombre")).not.toBeInTheDocument();
    });

    it("logs in with the trimmed email and hands over the user", async () => {
        const onAuthenticated = vi.fn();
        api.login.mockResolvedValue(USER);

        render(<LoginPage onAuthenticated={onAuthenticated} />);
        await userEvent.type(screen.getByLabelText("Correo"), "  ana@example.com ");
        await userEvent.type(screen.getByLabelText("Contraseña"), "correct-horse");
        await userEvent.click(screen.getByRole("button", { name: "Entrar" }));

        expect(api.login).toHaveBeenCalledWith({
            email: "ana@example.com",
            password: "correct-horse",
        });
        expect(onAuthenticated).toHaveBeenCalledWith(USER);
    });

    it("can be sent with the keyboard alone", async () => {
        const user = userEvent.setup();
        api.login.mockResolvedValue(USER);

        render(<LoginPage onAuthenticated={() => undefined} />);
        await user.tab();
        await user.keyboard("ana@example.com");
        await user.tab();
        await user.keyboard("correct-horse{Enter}");

        expect(api.login).toHaveBeenCalledTimes(1);
    });

    it("blocks the button while the request is running", async () => {
        let finish: (user: User) => void = () => undefined;
        api.login.mockReturnValue(new Promise<User>((resolve) => (finish = resolve)));

        render(<LoginPage onAuthenticated={() => undefined} />);
        await userEvent.type(screen.getByLabelText("Correo"), "ana@example.com");
        await userEvent.type(screen.getByLabelText("Contraseña"), "correct-horse");
        await userEvent.click(screen.getByRole("button", { name: "Entrar" }));

        expect(screen.getByRole("button", { name: "Entrar" })).toBeDisabled();

        finish(USER);

        expect(await screen.findByRole("button", { name: "Entrar" })).toBeEnabled();
    });

    it("shows the translated error and lets the user try again", async () => {
        const onAuthenticated = vi.fn();
        api.login.mockRejectedValue(new Error("Invalid email or password"));

        render(<LoginPage onAuthenticated={onAuthenticated} />);
        await userEvent.type(screen.getByLabelText("Correo"), "ana@example.com");
        await userEvent.type(screen.getByLabelText("Contraseña"), "wrong-password");
        await userEvent.click(screen.getByRole("button", { name: "Entrar" }));

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Correo o contraseña incorrectos.",
        );
        expect(screen.getByRole("button", { name: "Entrar" })).toBeEnabled();
        expect(onAuthenticated).not.toHaveBeenCalled();
    });

    it("asks for the name and a minimum password length when registering", async () => {
        api.register.mockResolvedValue(USER);

        render(<LoginPage onAuthenticated={() => undefined} />);
        await userEvent.click(screen.getByRole("button", { name: "Crear una cuenta nueva" }));

        expect(screen.getByRole("heading", { name: "Crear cuenta" })).toBeInTheDocument();
        expect(screen.getByLabelText("Contraseña")).toHaveAttribute("minlength", "8");

        await userEvent.type(screen.getByLabelText("Nombre"), "Ana");
        await userEvent.type(screen.getByLabelText("Correo"), "ana@example.com");
        await userEvent.type(screen.getByLabelText("Contraseña"), "correct-horse");
        await userEvent.click(screen.getByRole("button", { name: "Crear cuenta" }));

        expect(api.register).toHaveBeenCalledWith({
            name: "Ana",
            email: "ana@example.com",
            password: "correct-horse",
        });
    });

    it("confirms the reset request without asking for a password", async () => {
        api.requestPasswordReset.mockResolvedValue(undefined);

        render(<LoginPage onAuthenticated={() => undefined} />);
        await userEvent.click(screen.getByRole("button", { name: "Olvidé mi contraseña" }));

        expect(screen.queryByLabelText("Contraseña")).not.toBeInTheDocument();

        await userEvent.type(screen.getByLabelText("Correo"), "ana@example.com");
        await userEvent.click(screen.getByRole("button", { name: "Enviar enlace" }));

        expect(api.requestPasswordReset).toHaveBeenCalledWith("ana@example.com");
        expect(await screen.findByRole("status")).toHaveTextContent("te enviamos un enlace");
    });

    it("shows the notice it receives", () => {
        render(<LoginPage notice="Contraseña cambiada." onAuthenticated={() => undefined} />);

        expect(screen.getByRole("status")).toHaveTextContent("Contraseña cambiada.");
    });
});
