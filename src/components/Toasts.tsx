import type { CSSProperties } from "react";

import { TOAST_LIFETIME_MS, leaveToast, pauseToast, resumeToast, useToasts } from "../state/toasts";

const LIFE = { "--toast-life": `${TOAST_LIFETIME_MS}ms` } as CSSProperties;

/**
 * Short confirmations at the bottom right. Each one slides in from the edge, shows the time it
 * has left as a bar, waits while the pointer or the focus is on it, and slides out.
 */
export function Toasts() {
    const toasts = useToasts();

    return (
        <div className="toasts" role="status" aria-live="polite">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={toast.leaving ? "toast toast-leaving" : "toast"}
                    style={LIFE}
                    onPointerEnter={() => pauseToast(toast.id)}
                    onPointerLeave={() => resumeToast(toast.id)}
                    onFocus={() => pauseToast(toast.id)}
                    onBlur={() => resumeToast(toast.id)}
                >
                    <span>{toast.text}</span>
                    <button
                        type="button"
                        className="toast-close"
                        aria-label="Cerrar el aviso"
                        onClick={() => leaveToast(toast.id)}
                    >
                        ×
                    </button>
                    <span className="toast-timer" aria-hidden="true" />
                </div>
            ))}
        </div>
    );
}
