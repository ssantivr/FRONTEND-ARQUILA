import { LogoMark } from "./Logo";

import styles from "./Loader.module.css";

interface LoaderProps {
    /** What is loading, read by screen readers and shown under the mark («Cargando el modelo…»). */
    label: string;
    /** Hides the text, keeping it for screen readers. */
    quiet?: boolean;
    /** Height to reserve, so nothing moves when the content arrives. */
    minHeight?: number;
}

/**
 * The loader of a whole screen or panel: the volumes of the mark light up one after the other.
 * With reduced motion they stay still and the text says the same.
 */
export function Loader({ label, quiet = false, minHeight }: LoaderProps) {
    return (
        <div className={styles.loader} role="status" style={{ minHeight }}>
            <LogoMark size={40} className={styles.mark} />
            <span className={quiet ? "visually-hidden" : styles.label}>{label}</span>
        </div>
    );
}
