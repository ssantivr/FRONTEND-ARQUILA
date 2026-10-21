import { useRef, useState, type FormEvent } from "react";

import { Icon } from "../components/Icon";
import { Button } from "../components/ui/Button";
import { PasswordInput } from "../components/ui/Input";
import { errorMessage } from "../hooks/useAsync";
import { useFieldErrors } from "../hooks/useFieldErrors";
import { authApi } from "../services/api";
import {
    MAX_PASSWORD_LENGTH,
    MIN_PASSWORD_LENGTH,
    checkPassword,
    checkRepeated,
} from "../utils/authForm";

import styles from "./LoginPage.module.css";

interface ResetPasswordPageProps {
    token: string;
    onDone: (changed: boolean) => void;
}

type FieldName = "password" | "repeated";

/** The page the link of the recovery e-mail opens: choose a new password, twice. */
export function ResetPasswordPage({ token, onDone }: ResetPasswordPageProps) {
    const [password, setPassword] = useState("");
    const [repeated, setRepeated] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const form = useRef<HTMLFormElement>(null);
    const fields = useFieldErrors<FieldName>({
        password: () => checkPassword(password, true),
        repeated: () => checkRepeated(repeated, password),
    });

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();

        const wrong = fields.validate(["password", "repeated"]);

        if (wrong !== null) {
            form.current?.querySelector<HTMLElement>(`[name="${wrong}"]`)?.focus();

            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            await authApi.confirmPasswordReset(token, password);
            onDone(true);
        } catch (reason) {
            setError(errorMessage(reason));
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className={styles.login}>
            <h2 className={styles.title}>Elegir contraseña nueva</h2>
            <p className={styles.lead}>
                Al guardarla se cierran las sesiones abiertas de tu cuenta en otros equipos.
            </p>
            <form ref={form} className={styles.form} noValidate onSubmit={handleSubmit}>
                <PasswordInput
                    label="Contraseña nueva"
                    name="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    onBlur={() => password !== "" && fields.reveal("password")}
                    error={fields.errorOf("password")}
                    hint={`Mínimo ${MIN_PASSWORD_LENGTH} caracteres.`}
                    minLength={MIN_PASSWORD_LENGTH}
                    maxLength={MAX_PASSWORD_LENGTH}
                    autoComplete="new-password"
                    required
                />
                <PasswordInput
                    label="Repetir contraseña"
                    name="repeated"
                    value={repeated}
                    onChange={(event) => setRepeated(event.target.value)}
                    onBlur={() => repeated !== "" && fields.reveal("repeated")}
                    error={fields.errorOf("repeated")}
                    maxLength={MAX_PASSWORD_LENGTH}
                    autoComplete="new-password"
                    required
                />
                {error && (
                    <p className={styles.error} role="alert">
                        <Icon name="error" />
                        <span>{error}</span>
                    </p>
                )}
                <Button type="submit" size="lg" block loading={submitting}>
                    Guardar contraseña
                </Button>
                <Button variant="tertiary" block onClick={() => onDone(false)}>
                    Cancelar
                </Button>
            </form>
        </div>
    );
}
