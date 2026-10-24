import styles from "./ProgressBar.module.css";

interface ProgressBarProps {
    label: string;
    /** Share of the total, from 0 to 1. Values outside that range are clamped. */
    value: number;
    /** Shows the label and the percentage above the bar. */
    showValue?: boolean;
    size?: "sm" | "md";
}

/** Progress of known length, in lime. For work of unknown length use `Spinner`. */
export function ProgressBar({ label, value, showValue = false, size = "sm" }: ProgressBarProps) {
    const percent = Math.round(Math.min(Math.max(value, 0), 1) * 100);
    const bar = (
        <span
            className={`${styles.track} ${styles[size]}`}
            role="progressbar"
            aria-label={label}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
        >
            <span className={styles.fill} style={{ transform: `scaleX(${percent / 100})` }} />
        </span>
    );

    if (!showValue) {
        return bar;
    }

    return (
        <span className={styles.labelled}>
            <span className={styles.head} aria-hidden="true">
                <span>{label}</span>
                <span className={styles.percent}>{percent} %</span>
            </span>
            {bar}
        </span>
    );
}
