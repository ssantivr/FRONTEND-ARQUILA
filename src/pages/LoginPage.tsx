import { useState, type FormEvent } from "react";

import { Panel } from "../components/Panel";
import { errorMessage } from "../hooks/useAsync";
import { authApi } from "../services/api";
import type { User } from "../types/api";

interface LoginPageProps {
    notice?: string;
    onAuthenticated: (user: User) => void;
}

type Mode = "login" | "register" | "forgot";

export const MIN_PASSWORD_LENGTH = 8;

const TITLES: Record<Mode, string> = {
    login: "Iniciar sesión",
    register: "Crear cuenta",
    forgot: "Recuperar contraseña",
};

export function LoginPage({ notice, onAuthenticated }: LoginPageProps) {
    const [mode, setMode] = useState<Mode>("login");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(notice ?? null);
    const [submitting, setSubmitting] = useState(false);

    function switchTo(next: Mode) {
        setMode(next);
        setError(null);
        setMessage(null);
    }

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();
        setSubmitting(true);
        setError(null);
        setMessage(null);

        try {
            if (mode === "forgot") {
                await authApi.requestPasswordReset(email.trim());
                setMessage(
                    "Si ese correo tiene una cuenta, te enviamos un enlace para elegir una contraseña nueva. Vale 30 minutos.",
                );
            } else if (mode === "register") {
                onAuthenticated(
                    await authApi.register({ name: name.trim(), email: email.trim(), password }),
                );
            } else {
                onAuthenticated(await authApi.login({ email: email.trim(), password }));
            }
        } catch (reason) {
            setError(errorMessage(reason));
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="login">
            <Panel title={TITLES[mode]}>
                <form className="form-column" onSubmit={handleSubmit}>
                    {mode === "register" && (
                        <label>
                            Nombre
                            <input
                                value={name}
                                onChange={(event) => setName(event.target.value)}
                                maxLength={120}
                                autoComplete="name"
                                required
                            />
                        </label>
                    )}
                    <label>
                        Correo
                        <input
                            type="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            maxLength={255}
                            autoComplete="email"
                            required
                        />
                    </label>
                    {mode !== "forgot" && (
                        <label>
                            Contraseña
                            <input
                                type="password"
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                minLength={mode === "register" ? MIN_PASSWORD_LENGTH : undefined}
                                maxLength={128}
                                autoComplete={
                                    mode === "register" ? "new-password" : "current-password"
                                }
                                required
                            />
                        </label>
                    )}
                    {mode === "register" && (
                        <p className="message">Mínimo {MIN_PASSWORD_LENGTH} caracteres.</p>
                    )}
                    {message && (
                        <p className="message" role="status">
                            {message}
                        </p>
                    )}
                    {error && (
                        <p className="message message-error" role="alert">
                            {error}
                        </p>
                    )}
                    <button type="submit" disabled={submitting}>
                        {mode === "login" && "Entrar"}
                        {mode === "register" && "Crear cuenta"}
                        {mode === "forgot" && "Enviar enlace"}
                    </button>
                    {mode === "login" ? (
                        <>
                            <button
                                type="button"
                                className="button-secondary"
                                onClick={() => switchTo("register")}
                            >
                                Crear una cuenta nueva
                            </button>
                            <button
                                type="button"
                                className="button-secondary"
                                onClick={() => switchTo("forgot")}
                            >
                                Olvidé mi contraseña
                            </button>
                        </>
                    ) : (
                        <button
                            type="button"
                            className="button-secondary"
                            onClick={() => switchTo("login")}
                        >
                            Volver a iniciar sesión
                        </button>
                    )}
                </form>
            </Panel>
        </div>
    );
}
