/**
 * Decorative drawing of a contemporary house. It is an illustration, not a render of any project,
 * so it is hidden from assistive technology.
 */
export function ArchitectureArt() {
    return (
        <svg
            className="hero-art"
            viewBox="0 0 560 300"
            preserveAspectRatio="xMidYMax slice"
            aria-hidden="true"
        >
            <rect className="art-sky" width="560" height="300" />
            {[60, 120, 180].map((y) => (
                <line key={y} className="art-line" x1="0" x2="560" y1={y} y2={y} />
            ))}
            {[80, 200, 320, 440].map((x) => (
                <line key={x} className="art-line" x1={x} x2={x} y1="0" y2="300" />
            ))}
            <circle className="art-sun" cx="430" cy="70" r="46" />
            <path className="art-hill" d="M0 240 Q120 190 250 232 T560 214 V240 Z" />
            <rect className="art-ground" y="240" width="560" height="60" />

            <circle className="art-tree" cx="70" cy="196" r="34" />
            <circle className="art-tree-light" cx="96" cy="212" r="24" />
            <rect className="art-wood" x="78" y="214" width="6" height="28" />

            <rect className="art-wall-shade" x="150" y="150" width="150" height="90" />
            <rect className="art-glass" x="164" y="166" width="122" height="74" />
            <rect className="art-glass-lit" x="164" y="166" width="58" height="74" />
            <rect className="art-wall" x="138" y="140" width="176" height="12" />

            <rect className="art-wall" x="270" y="84" width="190" height="156" />
            <rect className="art-wood" x="270" y="84" width="54" height="156" />
            <rect className="art-glass" x="340" y="104" width="104" height="52" />
            <rect className="art-glass-lit" x="340" y="176" width="48" height="64" />
            <rect className="art-glass" x="396" y="176" width="48" height="64" />
            <rect className="art-wall-shade" x="258" y="74" width="214" height="12" />

            <circle className="art-tree-light" cx="500" cy="204" r="30" />
            <circle className="art-tree" cx="524" cy="186" r="22" />
            <rect className="art-wood" x="504" y="216" width="6" height="26" />
        </svg>
    );
}
