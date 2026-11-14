import {
    LOGO_HEIGHT,
    LOGO_PIECES,
    LOGO_STROKES,
    LOGO_WIDTH,
    STROKE_OPACITY,
    STROKE_WIDTH,
} from "./logoGeometry";

import styles from "./Logo.module.css";

/**
 * The colour of the drawing: `auto` takes the text colour of the theme, `light` is white for dark
 * bands and photographs, `dark` is graphite for paper. Each one is a single colour.
 */
export type LogoTone = "auto" | "light" | "dark";

const TONE_CLASS: Record<LogoTone, string | undefined> = {
    auto: undefined,
    light: styles.light,
    dark: styles.dark,
};

interface LogoMarkProps {
    /** Height in px; the width follows the drawing. */
    size?: number;
    tone?: LogoTone;
    className?: string;
}

/**
 * The isotype: the technical sketch alone, for the favicon, the collapsed sidebar and the loader.
 * Each group of lines is a `<g data-piece>`, so an entrance or a loader can move them one by one.
 * Decorative: the word next to it, or the label of its parent, names it.
 */
export function LogoMark({ size = 32, tone = "auto", className }: LogoMarkProps) {
    return (
        <svg
            className={[styles.mark, TONE_CLASS[tone], className].filter(Boolean).join(" ")}
            width={(size * LOGO_WIDTH) / LOGO_HEIGHT}
            height={size}
            viewBox={`0 0 ${LOGO_WIDTH} ${LOGO_HEIGHT}`}
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
        >
            {LOGO_PIECES.map((piece) => (
                <g key={piece} data-piece={piece}>
                    {LOGO_STROKES.filter((stroke) => stroke.piece === piece).map((stroke) => (
                        <path
                            key={stroke.d}
                            d={stroke.d}
                            strokeWidth={STROKE_WIDTH[stroke.weight]}
                            strokeOpacity={STROKE_OPACITY[stroke.weight]}
                        />
                    ))}
                </g>
            ))}
        </svg>
    );
}

interface ArquilaLogoProps {
    size?: "sm" | "md" | "lg";
    /** «Diseña · Visualiza · Construye» under the name. */
    tagline?: boolean;
    /** The mark beside the name, or above it for a centred lockup. */
    layout?: "horizontal" | "stacked";
    tone?: LogoTone;
    className?: string;
}

const MARK_SIZE = { sm: 24, md: 32, lg: 56 };

/** The full logo: the mark and the word ARQUILA, which is its accessible name. */
export function ArquilaLogo({
    size = "md",
    tagline = false,
    layout = "horizontal",
    tone = "auto",
    className,
}: ArquilaLogoProps) {
    return (
        <span
            className={[
                styles.logo,
                styles[size],
                layout === "stacked" && styles.stacked,
                TONE_CLASS[tone],
                className,
            ]
                .filter(Boolean)
                .join(" ")}
        >
            <LogoMark size={MARK_SIZE[size]} />
            <span className={styles.words}>
                <span className={styles.name}>ARQUILA</span>
                {tagline && <span className={styles.tagline}>Diseña · Visualiza · Construye</span>}
            </span>
        </span>
    );
}
