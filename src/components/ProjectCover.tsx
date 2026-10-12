interface ProjectCoverProps {
    id: number;
    name: string;
}

const SKIES = ["#12382a", "#17432f", "#0f2e22", "#1d5a48"];
const WALLS = ["#e9eee6", "#d9c9a8", "#c9d6cf", "#e2d5c3"];
const ACCENTS = ["#a8794f", "#7fb2a0", "#8a5a3c", "#5d8a76"];

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
 * Decorative cover. It varies by the project's id and name ONLY: the number of floors, the width,
 * the roof and the trees come from a pseudo-random sequence seeded with those two values.
 *
 * It does NOT reflect a project type, because the API has no such field, nor anything about the
 * real building: a one-storey house may get a three-storey drawing. Renaming a project changes
 * its cover. It is an emblem to tell cards apart, hidden from assistive technology.
 */
export function ProjectCover({ id, name }: ProjectCoverProps) {
    const random = seeded(seedOf(id, name));
    const pick = <T,>(options: T[]): T => options[Math.floor(random() * options.length)];
    const sky = pick(SKIES);
    const wall = pick(WALLS);
    const accent = pick(ACCENTS);
    const floors = 1 + Math.floor(random() * 3);
    const width = 90 + Math.floor(random() * 70);
    const left = 70 + Math.floor(random() * 60);
    const gable = random() < 0.4;
    const wing = random() < 0.6;
    const floorHeight = 24;
    const height = floors * floorHeight;
    const ground = 96;
    const top = ground - height;
    const columns = Math.max(2, Math.floor(width / 30));
    const trees = 1 + Math.floor(random() * 3);

    return (
        <svg
            className="project-cover-art"
            viewBox="0 0 320 120"
            preserveAspectRatio="xMidYMid slice"
            aria-hidden="true"
        >
            <rect width="320" height="120" fill={sky} />
            {[40, 80].map((y) => (
                <line key={y} x1="0" x2="320" y1={y} y2={y} stroke="#ffffff" strokeOpacity="0.07" />
            ))}
            {[64, 128, 192, 256].map((x) => (
                <line key={x} x1={x} x2={x} y1="0" y2="120" stroke="#ffffff" strokeOpacity="0.07" />
            ))}
            <circle cx={250 - left / 3} cy="30" r="16" fill="#b8f36b" fillOpacity="0.18" />
            <rect y={ground} width="320" height={120 - ground} fill="#0b211a" />

            {wing && (
                <rect
                    x={left + width - 4}
                    y={ground - floorHeight}
                    width={width / 2.4}
                    height={floorHeight}
                    fill={accent}
                />
            )}
            <rect x={left} y={top} width={width} height={height} fill={wall} />
            {gable ? (
                <path
                    d={`M${left - 6} ${top} L${left + width / 2} ${top - 20} L${left + width + 6} ${top} Z`}
                    fill={accent}
                />
            ) : (
                <rect x={left - 5} y={top - 5} width={width + 10} height="6" fill="#bcc7bb" />
            )}
            {Array.from({ length: floors }, (_, floor) =>
                Array.from({ length: columns }, (_, column) => {
                    const lit = random() < 0.35;

                    return (
                        <rect
                            key={`${floor}-${column}`}
                            x={left + 8 + (column * (width - 16)) / columns}
                            y={top + 6 + floor * floorHeight}
                            width={(width - 16) / columns - 6}
                            height={floorHeight - 12}
                            fill={lit ? "#b8f36b" : "#7fb2a0"}
                            fillOpacity={lit ? 0.9 : 0.75}
                        />
                    );
                }),
            )}
            {Array.from({ length: trees }, (_, index) => {
                const x = index % 2 === 0 ? left - 26 - index * 12 : left + width + 60 + index * 10;

                return (
                    <g key={index}>
                        <rect x={x - 1.5} y={ground - 12} width="3" height="12" fill="#a8794f" />
                        <circle cx={x} cy={ground - 18} r={9 + (index % 2) * 3} fill="#2f8a56" />
                    </g>
                );
            })}
        </svg>
    );
}
