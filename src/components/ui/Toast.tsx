import type { CSSProperties, ReactNode } from "react";

import { Icon, type IconName } from "../Icon";

import styles from "./Toast.module.css";

export type ToastTone = "success" | "error" | "info";
/** What holds a toast on screen: the pointer over it, or the keyboard focus inside it. */
export type ToastHold = "pointer" | "focus";

// Each tone has its own shape, so the state is never told by colour alone.
const ICONS: Record<ToastTone, IconName> = { success: "success", error: "error", info: "info" };

interface ToastProps {
    text: string;
    tone?: ToastTone;
    /** True while it slides away. */
    leaving?: boolean;
    /** The time the toast stays before it starts to leave, drawn as a bar that empties. */
    lifeMs: number;
    onClose: () => void;
    onHold?: (cause: ToastHold) => void;
    onRelease?: (cause: ToastHold) => void;
}

/**
 * One short notice. It slides in from the edge, shows the time it has left as a bar, asks to be
 * held while the pointer or the focus is on it, and slides out. The clock lives in `state/toasts`.
 */
export function Toast({
    text,
    tone = "success",
    leaving = false,
    lifeMs,
    onClose,
    onHold,
    onRelease,
}: ToastProps) {
    return (
        <div
            className={leaving ? `${styles.toast} ${styles.leaving}` : styles.toast}
            data-tone={tone}
            style={{ "--toast-life": `${lifeMs}ms` } as CSSProperties}
            onPointerEnter={() => onHold?.("pointer")}
            onPointerLeave={() => onRelease?.("pointer")}
            onFocus={() => onHold?.("focus")}
            onBlur={() => onRelease?.("focus")}
        >
            <Icon name={ICONS[tone]} className={styles.mark} />
            <span className={styles.text}>{text}</span>
            <button
                type="button"
                className={styles.close}
                aria-label="Cerrar el aviso"
                onClick={onClose}
            >
                <Icon name="close" />
            </button>
            <span className={styles.timer} aria-hidden="true" />
        </div>
    );
}

/** The corner where toasts pile up. It is a polite live region: what arrives is read once. */
export function ToastRegion({ children }: { children: ReactNode }) {
    return (
        <div className={styles.region} role="status" aria-live="polite">
            {children}
        </div>
    );
}
