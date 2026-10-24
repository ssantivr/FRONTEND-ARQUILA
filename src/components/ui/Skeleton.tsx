import styles from "./Skeleton.module.css";

export type SkeletonShape = "lines" | "cards" | "rows";

interface SkeletonProps {
    /** Shape of the placeholder, so it matches what is about to appear. */
    shape?: SkeletonShape;
    /** How many bars to draw; each shape has a sensible default. */
    count?: number;
    /** Read by screen readers while the content loads. */
    label?: string;
    /**
     * Height the content will take. Reserving it keeps the page still when the data arrives
     * (cumulative layout shift 0).
     */
    height?: number | string;
}

const DEFAULT_COUNT: Record<SkeletonShape, number> = {
    lines: 3,
    cards: 4,
    rows: 5,
};

/** Placeholder with the shape of the content that is loading, announced as a status. */
export function Skeleton({ shape = "lines", count, label = "Cargando…", height }: SkeletonProps) {
    return (
        <div
            // `skeleton` is the hook that screens not yet rebuilt use to place it (removed in R9).
            className={`skeleton ${styles.skeleton} ${styles[shape]}`}
            role="status"
            style={height === undefined ? undefined : { minHeight: height }}
        >
            <span className="visually-hidden">{label}</span>
            {Array.from({ length: count ?? DEFAULT_COUNT[shape] }, (_, index) => (
                <span key={index} className={styles.bar} aria-hidden="true" />
            ))}
        </div>
    );
}
