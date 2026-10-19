import { CountUp } from "../CountUp";
import { DerivedTag } from "./Tag";

import styles from "./MetricCard.module.css";

interface MetricCardProps {
    label: string;
    value: string;
    /** Always shown when the figure has one: m², m, %, COP. */
    unit?: string;
    /** When given, the figure counts up to this number the first time it appears. */
    count?: { to: number; format: (value: number) => string; step?: number };
    detail?: string;
    /** Calculated by the interface rather than read from the API. */
    derived?: boolean;
}

/** One indicator: a label in small capitals, the figure in tabular digits and its unit. */
export function MetricCard({
    label,
    value,
    unit,
    count,
    detail,
    derived = false,
}: MetricCardProps) {
    return (
        <div className={styles.metric}>
            <span className={styles.head}>
                <span className={styles.label}>{label}</span>
                {derived && <DerivedTag />}
            </span>
            <span className={styles.value}>
                {count === undefined ? (
                    value
                ) : (
                    <CountUp value={count.to} format={count.format} step={count.step} />
                )}
                {unit !== undefined && <span className={styles.unit}>{unit}</span>}
            </span>
            {detail !== undefined && <span className={styles.detail}>{detail}</span>}
        </div>
    );
}
