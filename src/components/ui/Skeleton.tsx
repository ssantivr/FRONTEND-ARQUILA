export type SkeletonShape = "lines" | "cards" | "rows";

interface SkeletonProps {
    /** Shape of the placeholder, so it matches what is about to appear. */
    shape?: SkeletonShape;
    /** How many bars to draw; each shape has a sensible default. */
    count?: number;
    /** Read by screen readers while the content loads. */
    label?: string;
}

const DEFAULT_COUNT: Record<SkeletonShape, number> = {
    lines: 3,
    cards: 4,
    rows: 5,
};

/** Placeholder with the shape of the content that is loading, announced as a status. */
export function Skeleton({ shape = "lines", count, label = "Cargando…" }: SkeletonProps) {
    return (
        <div className={`skeleton skeleton-${shape}`} role="status">
            <span className="skeleton-text">{label}</span>
            {Array.from({ length: count ?? DEFAULT_COUNT[shape] }, (_, index) => (
                <span key={index} className="skeleton-bar" aria-hidden="true" />
            ))}
        </div>
    );
}
