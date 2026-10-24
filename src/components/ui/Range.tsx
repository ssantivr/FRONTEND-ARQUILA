import type { CSSProperties } from "react";

import styles from "./Range.module.css";

interface RangeProps {
    label: string;
    value: number;
    /** The value as the user reads it, with its unit. */
    display: string;
    min: number;
    max: number;
    step: number;
    onChange: (value: number) => void;
    disabled?: boolean;
    /** Why it is disabled, shown under the slider. */
    disabledReason?: string;
}

/** A slider with its name on the left and its current value, with unit, on the right. */
export function Range({
    label,
    value,
    display,
    min,
    max,
    step,
    onChange,
    disabled,
    disabledReason,
}: RangeProps) {
    const fill = max === min ? 0 : ((value - min) / (max - min)) * 100;
    const blocked = disabled === true || disabledReason !== undefined;

    return (
        <label className={blocked ? `${styles.range} ${styles.disabled}` : styles.range}>
            <span className={styles.head}>
                <span className={styles.label}>{label}</span>
                {/* Not an <output>: the label would name that element instead of the slider. */}
                <span className={styles.value}>{display}</span>
            </span>
            <input
                type="range"
                className={styles.input}
                style={{ "--fill": `${fill}%` } as CSSProperties}
                min={min}
                max={max}
                step={step}
                value={value}
                disabled={blocked}
                aria-valuetext={display}
                onChange={(event) => onChange(Number(event.target.value))}
            />
            {disabledReason !== undefined && (
                <span className={styles.reason}>{disabledReason}</span>
            )}
        </label>
    );
}
