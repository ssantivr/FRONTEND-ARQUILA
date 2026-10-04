import { useState } from "react";

import { describeStatus } from "../components/AssistantPanel";
import { Panel } from "../components/Panel";
import { errorMessage, useAsync } from "../hooks/useAsync";
import { authApi, conversationsApi, healthApi } from "../services/api";
import type { User } from "../types/api";

interface SettingsPageProps {
    user: User;
    onLogout: () => void;
}

const dateFormat = new Intl.DateTimeFormat("es", { dateStyle: "long" });

export function SettingsPage({ user, onLogout }: SettingsPageProps) {
    const assistant = useAsync(() => conversationsApi.status(), []);
    const health = useAsync(() => healthApi.check(), []);
    const [resetState, setResetState] = useState<"idle" | "sending" | "sent">("idle");
    const [resetError, setResetError] = useState<string | null>(null);

    async function requestReset() {
        setResetState("sending");
        setResetError(null);

        try {
            await authApi.requestPasswordReset(user.email);
            setResetState("sent");
        } catch (reason) {
            setResetError(errorMessage(reason));
            setResetState("idle");
        }
    }

    return (
        <>
            <Panel title="Cuenta">
                <dl className="definition-list">
                    <dt>Nombre</dt>
                    <dd>{user.name}</dd>
                    <dt>Correo</dt>
                    <dd>{user.email}</dd>
                    <dt>Cuenta creada</dt>
                    <dd>{dateFormat.format(new Date(user.created_at))}</dd>
                </dl>
                <div className="filters">
                    <button type="button" className="button-secondary" onClick={onLogout}>
                        Cerrar sesión
                    </button>
                </div>
            </Panel>
            <Panel title="Contraseña">
                <p className="message">
                    Se envía a tu correo un enlace para elegir una contraseña nueva. Si el
                    servidor no tiene correo configurado, el enlace se escribe en su consola.
                </p>
                <button type="button" disabled={resetState === "sending"} onClick={requestReset}>
                    Enviarme el enlace
                </button>
                {resetState === "sent" && (
                    <p className="message" role="status">
                        Enlace solicitado para {user.email}.
                    </p>
                )}
                {resetError && (
                    <p className="message message-error" role="alert">
                        {resetError}
                    </p>
                )}
            </Panel>
            <Panel title="Sistema">
                <dl className="definition-list">
                    <dt>Asistente de IA</dt>
                    <dd>
                        {assistant.data
                            ? describeStatus(assistant.data)
                            : (assistant.error ?? "Consultando…")}
                    </dd>
                    <dt>API</dt>
                    <dd>
                        {health.data
                            ? "Conectada"
                            : health.error
                              ? `Sin conexión: ${health.error}`
                              : "Consultando…"}
                    </dd>
                    <dt>Dirección de la API</dt>
                    <dd>{import.meta.env.VITE_API_URL ?? "/api"}</dd>
                </dl>
                <p className="message">
                    El proveedor de IA y el correo se configuran en el archivo <code>backend/.env</code> del
                    servidor, no desde aquí.
                </p>
            </Panel>
        </>
    );
}
