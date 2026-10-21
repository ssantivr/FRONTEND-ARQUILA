import { useRef, useState, type FormEvent } from "react";

import { Icon } from "../components/Icon";
import { Button } from "../components/ui/Button";
import { Input, PasswordInput } from "../components/ui/Input";
import { errorMessage } from "../hooks/useAsync";
import { useFieldErrors } from "../hooks/useFieldErrors";
import { authApi } from "../services/api";
import type { User } from "../types/api";
import {
    MAX_EMAIL_LENGTH,
    MAX_NAME_LENGTH,
    MAX_PASSWORD_LENGTH,
    MIN_PASSWORD_LENGTH,
    checkEmail,
    checkName,
    checkPassword,
} from "../utils/authForm";

import styles from "./LoginPage.module.css";

export { MIN_PASSWORD_LENGTH };

interface LoginPageProps {
    notice?: string;
    onAuthenticated: (user: User) => void;
}

type Mode = "login" | "register" | "forgot";
type FieldName = "name" | "email" | "password";

const FIELDS: Record<Mode, readonly FieldName[]> = {
    login: ["email", "password"],
    register: ["name", "email", "password"],
    forgot: ["email"],
};

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
 * backend sets an `HttpOnly` cookie, and the screen only moves on with the user the API returns.
 * There is no «remember me»: the API has no session length to choose.
 */
export function LoginPage({ notice, onAuthenticated }: LoginPageProps) {
    const [mode, setMode] = useState<Mode>("login");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(notice ?? null);
    const [submitting, setSubmitting] = useState(false);
    const form = useRef<HTMLFormElement>(null);
    const fields = useFieldErrors<FieldName>({
        name: () => checkName(name),
        email: () => checkEmail(email),
        password: () => checkPassword(password, mode === "register"),
    });

    function switchTo(next: Mode) {
        setMode(next);
        setError(null);
        setMessage(null);
        fields.reset();
    }

    /** A field left with something written in it shows what is wrong with it. */
    function leave(field: FieldName, value: string) {
        if (value !== "") {
            fields.reveal(field);
        }
    }

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();

        const wrong = fields.validate(FIELDS[mode]);

        if (wrong !== null) {
            form.current?.querySelector<HTMLElement>(`[name="${wrong}"]`)?.focus();

            return;
        }

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
        <div className={styles.login}>
            <h2 className={styles.title}>{TITLES[mode]}</h2>
            <p className={styles.lead}>{LEADS[mode]}</p>
            <form ref={form} className={styles.form} noValidate onSubmit={handleSubmit}>
                {mode === "register" && (
                    <Input
                        label="Nombre"
                        name="name"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        onBlur={() => leave("name", name)}
                        error={fields.errorOf("name")}
                        maxLength={MAX_NAME_LENGTH}
                        autoComplete="name"
                        required
                    />
                )}
                <Input
                    label="Correo"
                    name="email"
                    type="email"
                    icon="mail"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    onBlur={() => leave("email", email)}
                    error={fields.errorOf("email")}
                    maxLength={MAX_EMAIL_LENGTH}
                    autoComplete="email"
                    placeholder="nombre@estudio.com"
                    required
                />
                {mode !== "forgot" && (
                    <PasswordInput
                        label="Contraseña"
                        name="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        onBlur={() => leave("password", password)}
                        error={fields.errorOf("password")}
                        hint={
                            mode === "register"
                                ? `Mínimo ${MIN_PASSWORD_LENGTH} caracteres.`
                                : undefined
                        }
                        minLength={mode === "register" ? MIN_PASSWORD_LENGTH : undefined}
                        maxLength={MAX_PASSWORD_LENGTH}
                        autoComplete={mode === "register" ? "new-password" : "current-password"}
                        required
                    />
                )}
                {mode === "login" && (
                    <button
                        type="button"
                        className={`${styles.link} ${styles.forgot}`}
                        onClick={() => switchTo("forgot")}
                    >
                        Olvidé mi contraseña
                    </button>
                )}
                {message && (
                    <p className={styles.notice} role="status">
                        <Icon name="success" />
                        <span>{message}</span>
                    </p>
                )}
                {error && (
                    <p className={styles.error} role="alert">
                        <Icon name="error" />
                        <span>{error}</span>
                    </p>
                )}
                <Button type="submit" size="lg" block loading={submitting}>
                    {SUBMIT[mode]}
                </Button>
            </form>
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
