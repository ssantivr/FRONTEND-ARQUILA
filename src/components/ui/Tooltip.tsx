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
    /**
     * `end` lines the hint up with the right edge of the control instead of its centre, for a
     * control at the right edge of the screen, whose hint would otherwise run past it.
     */
    align?: "center" | "end";
    /** False when the text only repeats the control's name: it is then shown but not announced. */
    describes?: boolean;
    /** The control the tooltip describes. It must already have its own accessible name. */
    children: ReactElement<TriggerProps>;
}

/**
 * A short hint next to a control, shown on hover and on keyboard focus and hidden with Escape.
 * The hint is linked with `aria-describedby`, so a screen reader reads it after the name.
 */
export function Tooltip({
    text,
    shortcut,
    side = "top",
    align = "center",
    describes = true,
    children,
}: TooltipProps) {
    const id = useId();
    const [dismissed, setDismissed] = useState(false);

    return (
        <span
            className={styles.anchor}
            data-dismissed={dismissed || undefined}
            onKeyDown={(event) => {
                // Escape closes the hint and nothing else: it must not also reach the screen behind.
                if (event.key === "Escape" && !dismissed) {
                    event.stopPropagation();
                    setDismissed(true);
                }
            }}
            onPointerLeave={() => setDismissed(false)}
            onBlur={() => setDismissed(false)}
        >
            {describes ? cloneElement(children, { "aria-describedby": id }) : children}
            <span
                id={id}
                role="tooltip"
                aria-hidden={describes ? undefined : true}
                className={[styles.tip, styles[side], align === "end" && styles.end]
                    .filter(Boolean)
                    .join(" ")}
            >
                {text}
                {shortcut !== undefined && <kbd className={styles.key}>{shortcut}</kbd>}
            </span>
        </span>
    );
}
