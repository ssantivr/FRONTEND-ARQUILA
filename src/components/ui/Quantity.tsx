import { DerivedTag } from "./Tag";

import styles from "./Quantity.module.css";

interface QuantityProps {
    /** The figure, already formatted for Spanish («1.240,5»), or null when it is not known. */
    value: string | null;
    /** Always shown: m, m², m³, °, %, K, lx… */
    unit?: string;
    /** Calculated by the interface rather than read from the API. */
    derived?: boolean;
    /** What a missing value says. */
    missing?: string;
    size?: "sm" | "md" | "lg" | "xl";
}

/**
 * A technical figure: tabular digits, its unit always visible and, when the interface computed it,
 * the «Derivado» mark. A missing value says so instead of showing a zero.
 */
export function Quantity({
    value,
    unit,
    derived = false,
    missing = "Sin dato",
    size = "md",
}: QuantityProps) {
    if (value === null) {
        return <span className={`${styles.missing} ${styles[size]}`}>{missing}</span>;
    }

    return (
        <span className={`${styles.quantity} ${styles[size]}`}>
            <span className={styles.value}>{value}</span>
            {unit !== undefined && <span className={styles.unit}>{unit}</span>}
            {derived && <DerivedTag />}
        </span>
    );
}
