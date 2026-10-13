import { useState } from "react";

import { describeStatus } from "../components/AssistantPanel";
import { PageBand } from "../components/PageBand";
import { Panel } from "../components/Panel";
import { errorMessage, useAsync } from "../hooks/useAsync";
import { authApi, conversationsApi, healthApi } from "../services/api";
import { BASE_URL } from "../services/http";
import { setReduceMotion, useReduceMotion } from "../state/motion";
import { setThemePreference, useThemePreference, type ThemePreference } from "../state/theme";
import type { User } from "../types/api";

interface SettingsPageProps {
    user: User;
    onLogout: () => void;
}

const dateFormat = new Intl.DateTimeFormat("es", { dateStyle: "long" });

const THEMES: { id: ThemePreference; label: string }[] = [
    { id: "light", label: "Claro" },
    { id: "dark", label: "Oscuro" },
    { id: "auto", label: "Automático" },
];

export function SettingsPage({ user, onLogout }: SettingsPageProps) {
    const themePreference = useThemePreference();
    const reduceMotion = useReduceMotion();
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
            <PageBand
                title={user.name}
                text={`${user.email} · Cuenta creada el ${dateFormat.format(new Date(user.created_at))}`}
                aside={
                    <button type="button" className="button-secondary" onClick={onLogout}>
                        Cerrar sesión
                    </button>
                }
            />
            <div className="settings-grid">
                <Panel title="Apariencia">
                    <div className="setting">
                        <div>
                            <span id="settings-theme" className="setting-title">
                                Tema
                            </span>
                            <span className="setting-text">
                                Automático sigue al sistema y cambia con él.
                            </span>
                        </div>
                        <div className="segmented" role="group" aria-labelledby="settings-theme">
                            {THEMES.map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    aria-pressed={themePreference === item.id}
                                    onClick={() => setThemePreference(item.id)}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <label className="setting">
                        <span>
                            <span className="setting-title">Reducir movimiento</span>
                            <span className="setting-text">
                                Sin transiciones ni movimientos animados de cámara.
                            </span>
                        </span>
                        <input
                            type="checkbox"
                            className="switch"
                            checked={reduceMotion}
                            onChange={(event) => setReduceMotion(event.target.checked)}
                        />
                    </label>
                    <p className="setting-note">
                        Estas preferencias se guardan en este navegador, no en tu cuenta: en otro
                        equipo o navegador tendrás que elegirlas de nuevo.
                    </p>
                </Panel>
                <Panel title="Contraseña">
                    <div className="setting">
                        <div>
                            <span className="setting-title">Cambiar la contraseña</span>
                            <span className="setting-text">
                                Se envía a tu correo un enlace para elegir una contraseña nueva. Si
                                el servidor no tiene correo configurado, el enlace se escribe en su
                                consola.
                            </span>
                        </div>
                        <button
                            type="button"
                            disabled={resetState === "sending"}
                            onClick={requestReset}
                        >
                            Enviarme el enlace
                        </button>
                    </div>
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
                    <dl className="setting-facts">
                        <div className="setting">
                            <dt className="setting-title">API</dt>
                            <dd>
                                {health.data ? (
                                    <span className="badge badge-active">Conectada</span>
                                ) : health.error ? (
                                    <>
                                        <span className="badge badge-priority-high">
                                            Sin conexión
                                        </span>{" "}
                                        {health.error}
                                    </>
                                ) : (
                                    "Consultando…"
                                )}
                            </dd>
                        </div>
                        <div className="setting">
                            <dt className="setting-title">Dirección de la API</dt>
                            <dd>
                                <code>{BASE_URL}</code>
                            </dd>
                        </div>
                        <div className="setting">
                            <dt className="setting-title">Asistente de IA</dt>
                            <dd>
                                {assistant.data
                                    ? describeStatus(assistant.data)
                                    : (assistant.error ?? "Consultando…")}
                            </dd>
                        </div>
                    </dl>
                    <p className="setting-note">
                        El proveedor de IA y el correo se configuran en el archivo <code>.env</code>{" "}
                        del servidor, no desde aquí.
                    </p>
                </Panel>
            </div>
        </>
    );
}
