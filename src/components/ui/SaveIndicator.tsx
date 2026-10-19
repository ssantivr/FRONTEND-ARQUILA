import { Icon } from "../Icon";
import { Spinner } from "./Spinner";

import styles from "./SaveIndicator.module.css";

export type SaveState = "idle" | "saving" | "saved" | "error";

const TEXT: Record<SaveState, string> = {
    idle: "",
    saving: "Guardando…",
    saved: "Cambios guardados",
    error: "Error al guardar",
};

/**
 * Whether the last change reached the server. It says it with a word and an icon, never with the
 * colour alone, and the live region is always in the page so a screen reader hears each change.
 * `idle` (nothing sent yet) shows nothing: there is no save to report.
 */
export function SaveIndicator({ state }: { state: SaveState }) {
    return (
        <span
            className={[styles.indicator, styles[state]].filter(Boolean).join(" ")}
            role="status"
            aria-live="polite"
        >
            {state === "saving" && <Spinner size="sm" />}
            {state === "saved" && <Icon name="check" />}
            {state === "error" && <Icon name="alert" />}
            {TEXT[state]}
        </span>
    );
}
