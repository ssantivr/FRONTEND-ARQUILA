import styles from "./Spinner.module.css";

interface SpinnerProps {
    /** Read by screen readers («Cargando el modelo…»). Without it the spinner is decoration. */
    label?: string;
    size?: "sm" | "md" | "lg";
}

/** Work in progress whose length is unknown. For a known length use `ProgressBar`. */
export function Spinner({ label, size = "md" }: SpinnerProps) {
    const ring = <span className={`${styles.ring} ${styles[size]}`} aria-hidden="true" />;

    if (label === undefined) {
        return ring;
    }

    return (
        <span role="status" className={styles.wrap}>
            {ring}
            <span className="visually-hidden">{label}</span>
        </span>
    );
}
