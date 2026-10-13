import { cloneElement, useId, useState, type ReactElement } from "react";

import styles from "./Tooltip.module.css";

interface TriggerProps {
    "aria-describedby"?: string;
}

interface TooltipProps {
    /** What the control does, in a few words. */
    text: string;
    /** Keys that do the same, shown after the text. */
    shortcut?: string;
    side?: "top" | "right" | "bottom";
    /** The control the tooltip describes. It must already have its own accessible name. */
    children: ReactElement<TriggerProps>;
}

/**
 * A short hint next to a control, shown on hover and on keyboard focus and hidden with Escape.
 * The hint is linked with `aria-describedby`, so a screen reader reads it after the name.
 */
export function Tooltip({ text, shortcut, side = "top", children }: TooltipProps) {
    const id = useId();
    const [dismissed, setDismissed] = useState(false);

    return (
        <span
            className={styles.anchor}
            data-dismissed={dismissed || undefined}
            onKeyDown={(event) => {
                if (event.key === "Escape") {
                    setDismissed(true);
                }
            }}
            onPointerLeave={() => setDismissed(false)}
            onBlur={() => setDismissed(false)}
        >
            {cloneElement(children, { "aria-describedby": id })}
            <span id={id} role="tooltip" className={`${styles.tip} ${styles[side]}`}>
                {text}
                {shortcut !== undefined && <kbd className={styles.key}>{shortcut}</kbd>}
            </span>
        </span>
    );
}
