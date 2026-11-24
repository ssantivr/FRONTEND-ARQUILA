import { useState, type FormEvent } from "react";

import { Panel } from "../components/Panel";
import { PasswordInput } from "../components/PasswordInput";
import { errorMessage } from "../hooks/useAsync";
import { authApi } from "../services/api";
import { MIN_PASSWORD_LENGTH, PasswordRules, passwordIsStrong } from "../components/PasswordRules";

interface ResetPasswordPageProps {
    token: string;
    onDone: (changed: boolean) => void;
}

export function ResetPasswordPage({ token, onDone }: ResetPasswordPageProps) {
    const [password, setPassword] = useState("");
    const [repeated, setRepeated] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();

        if (!passwordIsStrong(password)) {
            setError("La contraseña todavía no cumple los requisitos.");
            return;
        }

        if (password !== repeated) {
            setError("Las dos contraseñas no coinciden.");
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
        <div className="login">
            <Panel title="Elegir contraseña nueva">
                <form className="form-column" onSubmit={handleSubmit}>
                    <PasswordInput
                        label="Contraseña nueva"
                        describedBy="new-password-rules"
                        value={password}
                        onChange={setPassword}
                        concealed={submitting}
                        minLength={MIN_PASSWORD_LENGTH}
                        autoComplete="new-password"
                    />
                    <PasswordInput
                        label="Repetir contraseña"
                        value={repeated}
                        onChange={setRepeated}
                        concealed={submitting}
                        autoComplete="new-password"
                    />
                    <PasswordRules id="new-password-rules" password={password} />
                    {error && (
                        <p className="message message-error" role="alert">
                            {error}
                        </p>
                    )}
                    <button type="submit" disabled={submitting}>
                        Guardar contraseña
                    </button>
                    <button
                        type="button"
                        className="button-secondary"
                        onClick={() => onDone(false)}
                    >
                        Cancelar
                    </button>
                </form>
            </Panel>
        </div>
    );
}
