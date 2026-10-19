import type { CSSProperties } from "react";

import {
    TOAST_EXIT_MS,
    TOAST_LIFETIME_MS,
    leaveToast,
    pauseToast,
    resumeToast,
    useToasts,
} from "../state/toasts";
import { Icon } from "./Icon";

import styles from "./Toasts.module.css";

// The bar empties in exactly the time the toast stays before it starts to leave.
const LIFE = { "--toast-life": `${TOAST_LIFETIME_MS - TOAST_EXIT_MS}ms` } as CSSProperties;

/**
 * Short confirmations at the bottom right. Each one slides in from the edge, shows the time it
 * has left as a bar, waits while the pointer or the focus is on it, and slides out.
 */
export function Toasts() {
    const toasts = useToasts();

    return (
        <div className={styles.toasts} role="status" aria-live="polite">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={toast.leaving ? `${styles.toast} ${styles.leaving}` : styles.toast}
                    style={LIFE}
                    onPointerEnter={() => pauseToast(toast.id, "pointer")}
                    onPointerLeave={() => resumeToast(toast.id, "pointer")}
                    onFocus={() => pauseToast(toast.id, "focus")}
                    onBlur={() => resumeToast(toast.id, "focus")}
                >
                    <Icon name="success" className={styles.mark} />
                    <span className={styles.text}>{toast.text}</span>
                    <button
                        type="button"
                        className={styles.close}
                        aria-label="Cerrar el aviso"
                        onClick={() => leaveToast(toast.id)}
                    >
                        <Icon name="close" />
                    </button>
                    <span className={styles.timer} aria-hidden="true" />
                </div>
            ))}
        </div>
    );
}
