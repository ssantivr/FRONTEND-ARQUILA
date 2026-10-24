import { useId, type InputHTMLAttributes } from "react";

import styles from "./Switch.module.css";

interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "role"> {
    label: string;
    /** One line under the label that says what changes. */
    description?: string;
}

/**
 * An on/off setting that applies at once. It is a native checkbox with `role="switch"`, so it is
 * reached with Tab, toggled with Space and read as «activado» or «desactivado».
 */
export function Switch({ label, description, className, ...rest }: SwitchProps) {
    const id = useId();
    const describedBy = description === undefined ? undefined : `${id}-description`;

    return (
        <div className={[styles.row, className].filter(Boolean).join(" ")}>
            <span className={styles.text}>
                <label htmlFor={id} className={styles.label}>
                    {label}
                </label>
                {description !== undefined && (
                    <span id={describedBy} className={styles.description}>
                        {description}
                    </span>
                )}
            </span>
            <input
                {...rest}
                id={id}
                type="checkbox"
                role="switch"
                className={styles.switch}
                aria-describedby={describedBy}
            />
        </div>
    );
}
