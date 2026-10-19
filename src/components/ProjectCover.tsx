interface ProjectCoverProps {
    id: number;
    name: string;
}

const SHEETS = ["var(--cover-1)", "var(--cover-2)", "var(--cover-3)", "var(--cover-4)"];
const LINE = "var(--cover-line)";
const LIME = "var(--lime)";

/** Small repeatable generator: the same project always gets the same drawing. */
function seeded(seed: number): () => number {
    let state = (seed * 2654435761) % 4294967296 || 1;

    return () => {
        state = (state * 1664525 + 1013904223) % 4294967296;

        return state / 4294967296;
    };
}

function seedOf(id: number, name: string): number {
    return [...name].reduce((sum, letter) => sum + letter.charCodeAt(0), id * 31);
}

/**
 * Decorative cover, drawn like the elevation of a drafting sheet: thin lines over a grid, axes,
 * a hatched ground and a dimension line. It varies by the project's id and name ONLY: the number
 * of floors, the width, the roof and the trees come from a pseudo-random sequence seeded with
 * those two values.
 *
 * It does NOT reflect a project type, because the API has no such field, nor anything about the
 * real building: a one-storey house may get a three-storey drawing. For the same reason it
 * carries no figures: a number on it would read as a measurement. Renaming a project changes its
 * cover. It is an emblem to tell cards apart, hidden from assistive technology.
 */
export function ProjectCover({ id, name }: ProjectCoverProps) {
    const random = seeded(seedOf(id, name));
    const pick = <T,>(options: T[]): T => options[Math.floor(random() * options.length)];
    const sheet = pick(SHEETS);
    const floors = 1 + Math.floor(random() * 3);
    const width = 96 + Math.floor(random() * 64);
    const left = 78 + Math.floor(random() * 52);
    const gable = random() < 0.4;
    const wing = random() < 0.6;
    const floorHeight = 22;
    const height = floors * floorHeight;
    const ground = 92;
    const top = ground - height;
    const right = left + width;
    const columns = Math.max(2, Math.floor(width / 30));
    const bay = (width - 12) / columns;
    const trees = 1 + Math.floor(random() * 3);
    const wingWidth = Math.round(width / 2.4);
    const axes = [left, left + width / 2, right, ...(wing ? [right + wingWidth] : [])];

    return (
        <svg
            className="project-cover-art"
            viewBox="0 0 320 120"
            preserveAspectRatio="xMidYMid slice"
            aria-hidden="true"
        >
            <rect width="320" height="120" fill={sheet} />
            <g stroke="var(--white)" strokeWidth="0.5">
                {Array.from({ length: 19 }, (_, index) => (
                    <line
                        key={`v${index}`}
                        x1={(index + 1) * 16}
                        x2={(index + 1) * 16}
                        y1="0"
                        y2="120"
                        strokeOpacity={(index + 1) % 5 === 0 ? 0.12 : 0.05}
                    />
                ))}
                {Array.from({ length: 7 }, (_, index) => (
                    <line
                        key={`h${index}`}
                        x1="0"
                        x2="320"
                        y1={(index + 1) * 16 - 4}
                        y2={(index + 1) * 16 - 4}
                        strokeOpacity={(index + 1) % 5 === 0 ? 0.12 : 0.05}
                    />
                ))}
            </g>

            {/* Axes: a dashed line through each edge, with its bubble above. */}
            <g stroke={LIME} strokeWidth="0.6" fill="none" strokeOpacity="0.55">
                {axes.map((x) => (
                    <g key={x}>
                        <line x1={x} x2={x} y1="15" y2={ground + 6} strokeDasharray="5 2 1 2" />
                        <circle cx={x} cy="10" r="5" />
                    </g>
                ))}
            </g>

            {/* Ground: the line of the terrain and its hatch. */}
            <g stroke={LINE} strokeLinecap="round">
                <line x1="0" x2="320" y1={ground} y2={ground} strokeWidth="1.4" />
                {Array.from({ length: 27 }, (_, index) => (
                    <line
                        key={index}
                        x1={index * 12 + 8}
                        x2={index * 12}
                        y1={ground + 1}
                        y2={ground + 7}
                        strokeWidth="0.6"
                        strokeOpacity="0.4"
                    />
                ))}
            </g>

            <g
                stroke={LINE}
                strokeWidth="1.1"
                fill="rgba(227, 239, 229, 0.05)"
                strokeLinejoin="round"
            >
                {wing && (
                    <>
                        <rect
                            x={right}
                            y={ground - floorHeight}
                            width={wingWidth}
                            height={floorHeight}
                        />
                        <rect
                            x={right + wingWidth / 2 - 7}
                            y={ground - floorHeight + 6}
                            width="14"
                            height={floorHeight - 12}
                            strokeWidth="0.8"
                        />
                    </>
                )}
                <rect x={left} y={top} width={width} height={height} />
                {gable ? (
                    <path
                        d={`M${left - 6} ${top} L${left + width / 2} ${top - 18} L${right + 6} ${top} Z`}
                    />
                ) : (
                    <rect x={left - 4} y={top - 5} width={width + 8} height="5" />
                )}
                {Array.from({ length: floors - 1 }, (_, floor) => (
                    <line
                        key={floor}
                        x1={left}
                        x2={right}
                        y1={top + (floor + 1) * floorHeight}
                        y2={top + (floor + 1) * floorHeight}
                        strokeWidth="0.8"
                    />
                ))}
            </g>

            {/* Openings: a door at the first bay of the ground floor, a window in every other one. */}
            <g stroke={LINE} strokeWidth="0.8">
                {Array.from({ length: floors }, (_, floor) =>
                    Array.from({ length: columns }, (_, column) => {
                        const x = left + 6 + column * bay + 3;
                        const y = top + floor * floorHeight;
                        const lit = random() < 0.35;

                        if (floor === floors - 1 && column === 0) {
                            return (
                                <rect
                                    key={`${floor}-${column}`}
                                    x={x + bay / 2 - 7}
                                    y={y + 5}
                                    width="9"
                                    height={floorHeight - 5}
                                    fill="none"
                                />
                            );
                        }

                        return (
                            <g key={`${floor}-${column}`}>
                                <rect
                                    x={x}
                                    y={y + 6}
                                    width={bay - 6}
                                    height={floorHeight - 12}
                                    fill={lit ? LIME : "none"}
                                    fillOpacity="0.55"
                                />
                                <line
                                    x1={x + (bay - 6) / 2}
                                    x2={x + (bay - 6) / 2}
                                    y1={y + 6}
                                    y2={y + floorHeight - 6}
                                    strokeWidth="0.5"
                                />
                            </g>
                        );
                    }),
                )}
            </g>

            {/* Trees as a draughtsman draws them: a trunk and an open crown. */}
            <g stroke={LINE} strokeWidth="0.8" fill="none" strokeOpacity="0.8">
                {Array.from({ length: trees }, (_, index) => {
                    const x =
                        index % 2 === 0
                            ? left - 26 - index * 12
                            : right + (wing ? wingWidth : 0) + 24 + index * 10;
                    const crown = 8 + (index % 2) * 3;

                    return (
                        <g key={index}>
                            <line x1={x} x2={x} y1={ground} y2={ground - 12} />
                            <circle cx={x} cy={ground - 12 - crown} r={crown} />
                            <path
                                d={`M${x - crown * 0.5} ${ground - 12 - crown} h${crown} M${x} ${ground - 12 - crown * 1.5} v${crown}`}
                                strokeWidth="0.5"
                            />
                        </g>
                    );
                })}
            </g>

            {/* A dimension line under the building: ticks only, no figure. */}
            <g stroke={LIME} strokeWidth="0.7" strokeOpacity="0.8">
                <line x1={left} x2={right} y1={ground + 14} y2={ground + 14} />
                {[left, right].map((x) => (
                    <g key={x}>
                        <line x1={x} x2={x} y1={ground + 10} y2={ground + 18} />
                        <line x1={x - 3} x2={x + 3} y1={ground + 17} y2={ground + 11} />
                    </g>
                ))}
            </g>
        </svg>
    );
}
