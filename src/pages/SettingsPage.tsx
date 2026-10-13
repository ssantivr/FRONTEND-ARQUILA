import { useState } from "react";

import { describeStatus } from "../components/AssistantPanel";
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

const THEMES: { id: ThemePreference; label: string; note: string }[] = [
    { id: "light", label: "Claro", note: "Fondo claro" },
    { id: "dark", label: "Oscuro", note: "Fondo verde oscuro" },
    { id: "auto", label: "Automático", note: "Sigue al sistema" },
];

/** A small drawing of the app in a theme. The automatic option shows both halves. */
function ThemePreview({ theme }: { theme: ThemePreference }) {
    const sides = theme === "auto" ? (["light", "dark"] as const) : [theme];

    return (
        <span className="theme-preview" aria-hidden="true">
            {sides.map((side) => (
                <span key={side} className="theme-preview-side" data-theme={side}>
                    <span className="theme-preview-nav" />
                    <span className="theme-preview-page">
                        <span className="theme-preview-line" />
                        <span className="theme-preview-card" />
                    </span>
                </span>
            ))}
        </span>
    );
}

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
        <div className="settings">
            <header className="settings-account">
                <span className="avatar avatar-lg" aria-hidden="true">
                    {user.name.trim().charAt(0).toUpperCase()}
                </span>
                <div>
                    <h2>{user.name}</h2>
                    <p>
                        {user.email} · Cuenta creada el{" "}
                        {dateFormat.format(new Date(user.created_at))}
                    </p>
                </div>
                <button type="button" className="button-secondary" onClick={onLogout}>
                    Cerrar sesión
                </button>
            </header>

            <section className="settings-section" aria-labelledby="settings-appearance">
                <div className="settings-section-head">
                    <h3 id="settings-appearance">Apariencia</h3>
                    <p>
                        Estas preferencias se guardan en este navegador, no en tu cuenta: en otro
                        equipo o navegador tendrás que elegirlas de nuevo.
                    </p>
                </div>
                <div className="setting setting-stacked">
                    <span id="settings-theme" className="setting-title">
                        Tema
                    </span>
                    <div className="theme-options" role="group" aria-labelledby="settings-theme">
                        {THEMES.map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                className="theme-option"
                                aria-pressed={themePreference === item.id}
                                onClick={() => setThemePreference(item.id)}
                            >
                                <ThemePreview theme={item.id} />
                                <span className="theme-option-label">{item.label}</span>
                                <span className="theme-option-note">{item.note}</span>
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
            </section>

            <section className="settings-section" aria-labelledby="settings-password">
                <div className="settings-section-head">
                    <h3 id="settings-password">Contraseña</h3>
                </div>
                <div className="setting">
                    <div>
                        <span className="setting-title">Cambiar la contraseña</span>
                        <span className="setting-text">
                            Se envía a tu correo un enlace para elegir una contraseña nueva. Si el
                            servidor no tiene correo configurado, el enlace se escribe en su
                            consola.
                        </span>
                    </div>
                    <button
                        type="button"
                        className="button-secondary"
                        disabled={resetState === "sending"}
                        aria-busy={resetState === "sending"}
                        onClick={requestReset}
                    >
                        {resetState === "sending" ? "Enviando…" : "Enviarme el enlace"}
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
            </section>

            <section className="settings-section" aria-labelledby="settings-system">
                <div className="settings-section-head">
                    <h3 id="settings-system">Sistema</h3>
                    <p>
                        El proveedor de IA y el correo se configuran en el archivo <code>.env</code>{" "}
                        del servidor, no desde aquí.
                    </p>
                </div>
                <dl className="setting-facts">
                    <div className="setting">
                        <dt className="setting-title">API</dt>
                        <dd>
                            {health.data ? (
                                <span className="badge badge-active">Conectada</span>
                            ) : health.error ? (
                                <>
                                    <span className="badge badge-priority-high">Sin conexión</span>{" "}
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
            </section>
        </div>
    );
}
