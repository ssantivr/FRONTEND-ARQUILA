import { useState, type FormEvent } from "react";

import { Panel } from "../components/Panel";
import { errorMessage } from "../hooks/useAsync";
import { authApi } from "../services/api";
import { ApiError } from "../services/http";
import type { User } from "../types/api";

interface LoginPageProps {
    onAuthenticated: (user: User) => void;
}

const MIN_PASSWORD_LENGTH = 8;

export function LoginPage({ onAuthenticated }: LoginPageProps) {
    const [mode, setMode] = useState<"login" | "register">("login");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const isRegister = mode === "register";

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();
        setSubmitting(true);
        setError(null);

        try {
            const user = isRegister
                ? await authApi.register({ name: name.trim(), email: email.trim(), password })
                : await authApi.login({ email: email.trim(), password });
            onAuthenticated(user);
        } catch (reason) {
            if (reason instanceof ApiError && reason.status === 429) {
                setError("Demasiados intentos fallidos. Espera un minuto e inténtalo de nuevo.");
            } else if (reason instanceof ApiError && reason.status === 401) {
                setError("Correo o contraseña incorrectos.");
            } else {
                setError(errorMessage(reason));
            }
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="login">
            <Panel title={isRegister ? "Crear cuenta" : "Iniciar sesión"}>
                <form className="form-column" onSubmit={handleSubmit}>
                    {isRegister && (
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
                    <label>
                        Contraseña
                        <input
                            type="password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            minLength={isRegister ? MIN_PASSWORD_LENGTH : undefined}
                            maxLength={128}
                            autoComplete={isRegister ? "new-password" : "current-password"}
                            required
                        />
                    </label>
                    {isRegister && (
                        <p className="message">Mínimo {MIN_PASSWORD_LENGTH} caracteres.</p>
                    )}
                    {error && (
                        <p className="message message-error" role="alert">
                            {error}
                        </p>
                    )}
                    <button type="submit" disabled={submitting}>
                        {isRegister ? "Crear cuenta" : "Entrar"}
                    </button>
                    <button
                        type="button"
                        className="button-secondary"
                        onClick={() => {
                            setMode(isRegister ? "login" : "register");
                            setError(null);
                        }}
                    >
                        {isRegister ? "Ya tengo cuenta" : "Crear una cuenta nueva"}
                    </button>
                </form>
            </Panel>
        </div>
    );
}
