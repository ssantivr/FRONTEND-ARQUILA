import type { ReactNode } from "react";

import styles from "./Blueprint.module.css";

/**
 * The drawing-sheet motif of ARQUILA: a faint technical grid, the corner marks of a title block,
 * dimension lines and grid axes. All of it is decoration (`aria-hidden`) except the text of a
 * dimension line, which is a real value when one is given.
 */

interface BlueprintGridProps {
    /** `fade` dissolves the grid towards the edges, for heroes and empty states. */
    fade?: boolean;
    /** Size of the minor cell in px; the major line falls every five cells. */
    cell?: 8 | 12 | 16;
    className?: string;
}

/** A technical grid behind the content. Its parent must be `position: relative`. */
export function BlueprintGrid({ fade = true, cell = 16, className }: BlueprintGridProps) {
    return (
        <span
            className={[styles.grid, fade && styles.fade, styles[`cell${cell}`], className]
                .filter(Boolean)
                .join(" ")}
            aria-hidden="true"
        />
    );
}

/** The four corner marks of a title block. Its parent must be `position: relative`. */
export function CornerMarks({ inset = 8, className }: { inset?: number; className?: string }) {
    return (
        <span
            className={[styles.corners, className].filter(Boolean).join(" ")}
            style={{ inset }}
            aria-hidden="true"
        >
            <span />
            <span />
            <span />
            <span />
        </span>
    );
}

interface DimensionLineProps {
    /**
     * The measure, with its unit («12,40 m»). When it is a value of the project it is read like
     * any text; without it the line is only decoration.
     */
    label?: ReactNode;
    orientation?: "horizontal" | "vertical";
    className?: string;
}

/** A dimension line: thin, with oblique ticks at the ends and the measure in the middle. */
export function DimensionLine({
    label,
    orientation = "horizontal",
    className,
}: DimensionLineProps) {
    return (
        <span
            className={[styles.dimension, styles[orientation], className].filter(Boolean).join(" ")}
            aria-hidden={label === undefined ? true : undefined}
        >
            <span className={styles.tick} aria-hidden="true" />
            <span className={styles.rule} aria-hidden="true" />
            {label !== undefined && <span className={styles.measure}>{label}</span>}
            <span className={styles.rule} aria-hidden="true" />
            <span className={styles.tick} aria-hidden="true" />
        </span>
    );
}

/** Grid axes like those of a structural plan: bubbles with letters or numbers on a thin line. */
export function GridAxes({ labels, className }: { labels: string[]; className?: string }) {
    return (
        <span className={[styles.axes, className].filter(Boolean).join(" ")} aria-hidden="true">
            {labels.map((label) => (
                <span key={label} className={styles.axis}>
                    <span className={styles.bubble}>{label}</span>
                </span>
            ))}
        </span>
    );
}
