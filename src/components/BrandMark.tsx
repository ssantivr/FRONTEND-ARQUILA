/**
 * The ARQUILA mark: four lime bars that close a square like a plan seen from above (the floor,
 * the back wall, a lintel and a short wall). The same shape the sidebar draws in CSS, here as SVG
 * so the entry animation can put each bar in place. Decorative: the word next to it names it.
 */
export function BrandMark({ size = 30, className }: { size?: number; className?: string }) {
    return (
        <svg
            className={className}
            width={size}
            height={size}
            viewBox="0 0 30 30"
            aria-hidden="true"
            focusable="false"
        >
            <rect data-piece="floor" x="0" y="23" width="30" height="7" fill="var(--lime)" />
            <rect data-piece="wall" x="0" y="0" width="7" height="30" fill="var(--lime)" />
            <rect data-piece="lintel" x="13" y="0" width="17" height="7" fill="var(--lime)" />
            <rect data-piece="post" x="23" y="0" width="7" height="16" fill="var(--lime)" />
        </svg>
    );
}
