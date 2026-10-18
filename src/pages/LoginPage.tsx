import { useState, type FormEvent } from "react";

import { Icon } from "../components/Icon";
import { Button } from "../components/ui/Button";
import { LiveForm } from "../components/ui/LiveForm";
import { errorMessage } from "../hooks/useAsync";
import { authApi } from "../services/api";
import type { User } from "../types/api";

import styles from "./LoginPage.module.css";

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

const LEADS: Record<Mode, string> = {
    login: "Entra con tu correo para volver a tus proyectos.",
    register: "Con una cuenta guardas tus proyectos, terrenos y materiales.",
    forgot: "Escribe tu correo y te enviamos un enlace para elegir otra contraseña.",
};

const SUBMIT: Record<Mode, string> = {
    login: "Entrar",
    register: "Crear cuenta",
    forgot: "Enviar enlace",
};

/**
 * Sign in, create an account or ask for a new password, against the API's session cookie
 * (`/auth/login`, `/auth/register`, `/auth/password-reset`). Nothing is kept in the browser: the
 * backend sets the cookie. There is no «remember me»: the API has no session length to choose.
 */
export function LoginPage({ notice, onAuthenticated }: LoginPageProps) {
    const [mode, setMode] = useState<Mode>("login");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(notice ?? null);
    const [submitting, setSubmitting] = useState(false);
    const [revealed, setRevealed] = useState(false);

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
        <div className={`login ${styles.login}`}>
            <h2 className={styles.title}>{TITLES[mode]}</h2>
            <p className={styles.lead}>{LEADS[mode]}</p>
            <LiveForm className={`form-column ${styles.form}`} onSubmit={handleSubmit}>
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
                        placeholder="nombre@estudio.com"
                        required
                    />
                </label>
                {mode !== "forgot" && (
                    <div className={`field-password ${styles.password}`}>
                        <label>
                            Contraseña
                            <input
                                type={revealed ? "text" : "password"}
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
                        <button
                            type="button"
                            className={`field-toggle ${styles.reveal}`}
                            aria-label="Mostrar contraseña"
                            aria-pressed={revealed}
                            title={revealed ? "Ocultar la contraseña" : "Mostrar la contraseña"}
                            onClick={() => setRevealed((visible) => !visible)}
                        >
                            <Icon name={revealed ? "eyeOff" : "eye"} />
                        </button>
                    </div>
                )}
                {mode === "register" && (
                    <p className={styles.hint}>Mínimo {MIN_PASSWORD_LENGTH} caracteres.</p>
                )}
                {mode === "login" && (
                    <button
                        type="button"
                        className={styles.link}
                        onClick={() => switchTo("forgot")}
                    >
                        Olvidé mi contraseña
                    </button>
                )}
                {message && (
                    <p className={`message ${styles.notice}`} role="status">
                        <Icon name="check" />
                        {message}
                    </p>
                )}
                {error && (
                    <p className={`message message-error ${styles.error}`} role="alert">
                        <Icon name="alert" />
                        {error}
                    </p>
                )}
                <Button
                    type="submit"
                    loading={submitting}
                    className={`button-lime ${styles.submit}`}
                >
                    {SUBMIT[mode]}
                </Button>
            </LiveForm>
            <p className={styles.switch}>
                {mode === "login" ? (
                    <>
                        ¿Todavía no tienes cuenta?{" "}
                        <button
                            type="button"
                            className={styles.link}
                            onClick={() => switchTo("register")}
                        >
                            Crear una cuenta nueva
                        </button>
                    </>
                ) : (
                    <button type="button" className={styles.link} onClick={() => switchTo("login")}>
                        Volver a iniciar sesión
                    </button>
                )}
            </p>
        </div>
    );
}
