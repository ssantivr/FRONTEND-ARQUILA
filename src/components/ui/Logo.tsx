import { LOGO_FACES, LOGO_HEIGHT, LOGO_PIECES, LOGO_WIDTH } from "./logoGeometry";

import styles from "./Logo.module.css";

interface LogoMarkProps {
    /** Height in px; the width follows the drawing. */
    size?: number;
    className?: string;
}

/**
 * The isometric mark alone. Each volume is a `<g data-piece>`, so an entrance or a loader can
 * move them one by one. Decorative: the word next to it, or the label of its parent, names it.
 */
export function LogoMark({ size = 32, className }: LogoMarkProps) {
    return (
        <svg
            className={[styles.mark, className].filter(Boolean).join(" ")}
            width={(size * LOGO_WIDTH) / LOGO_HEIGHT}
            height={size}
            viewBox={`-1 -1 ${(LOGO_WIDTH + 2).toFixed(2)} ${(LOGO_HEIGHT + 2).toFixed(2)}`}
            aria-hidden="true"
            focusable="false"
        >
            {LOGO_PIECES.map((piece) => (
                <g key={piece} data-piece={piece} className={styles.piece}>
                    {LOGO_FACES.filter((face) => face.piece === piece).map((face) => (
                        <path key={face.side} d={face.d} className={styles[face.side]} />
                    ))}
                </g>
            ))}
        </svg>
    );
}

interface LogoProps {
    size?: "sm" | "md" | "lg";
    /** «Diseña · Planifica · Construye» under the name. */
    tagline?: boolean;
    /** `onDark` on the forest bands and the dark theme; `auto` follows the theme. */
    tone?: "auto" | "onDark";
    className?: string;
}

const MARK_SIZE = { sm: 24, md: 32, lg: 56 };

/** The mark and the word ARQUILA, which is its accessible name. */
export function Logo({ size = "md", tagline = false, tone = "auto", className }: LogoProps) {
    return (
        <span
            className={[styles.logo, styles[size], tone === "onDark" && styles.onDark, className]
                .filter(Boolean)
                .join(" ")}
        >
            <LogoMark size={MARK_SIZE[size]} />
            <span className={styles.words}>
                <span className={styles.name}>ARQUILA</span>
                {tagline && <span className={styles.tagline}>Diseña · Planifica · Construye</span>}
            </span>
        </span>
    );
}
