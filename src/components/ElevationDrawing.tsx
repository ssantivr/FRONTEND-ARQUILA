import { useRef } from "react";

import type { Drawing } from "../utils/elevations";
import { downloadSvg } from "../utils/svg";

const VIEW_WIDTH = 660;
const VIEW_HEIGHT = 420;
const DRAW_LEFT = 70;
const DRAW_TOP = 50;
const DRAW_WIDTH = 460;
const DRAW_HEIGHT = 260;
const MARK_X = 575;

const COLORS = {
    background: "#0b1722",
    grid: "#16293a",
    text: "#f4f7fa",
    muted: "#8fa3b5",
    wall: "#e6edf3",
    facade: "#1b3248",
    accent: "#20c7f5",
    glass: "rgba(32, 199, 245, 0.28)",
    door: "#f2c94c",
    roof: "#c98a7d",
    roofFill: "#3f2a2c",
    ground: "#39d98a",
};

const TEXT = { fontFamily: "system-ui, sans-serif", fontSize: 10, fill: COLORS.text };
const MARK = { ...TEXT, fontSize: 9, fill: COLORS.accent, fontFamily: "ui-monospace, Consolas, monospace" };

interface ElevationDrawingProps {
    drawing: Drawing;
    title: string;
    fileName: string;
    sectioned: boolean;
}

export function ElevationDrawing({ drawing, title, fileName, sectioned }: ElevationDrawingProps) {
    const svg = useRef<SVGSVGElement>(null);
    const from = Math.min(0, drawing.roof.from);
    const to = Math.max(drawing.width, drawing.roof.to);
    const scale = Math.min(DRAW_WIDTH / (to - from), DRAW_HEIGHT / drawing.height);
    const left = DRAW_LEFT + (DRAW_WIDTH - (to - from) * scale) / 2;
    const ground = DRAW_TOP + DRAW_HEIGHT;
    const toX = (u: number) => left + (u - from) * scale;
    const toY = (height: number) => ground - height * scale;
    const roof = drawing.roof;
    const gridId = `elevation-grid-${fileName.replace(/\W+/g, "-")}`;

    return (
        <figure className="terrain-diagrams site-plan floor-plan">
            <svg
                ref={svg}
                xmlns="http://www.w3.org/2000/svg"
                viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
                role="img"
                aria-label={`${title}: ${drawing.boxes.length} ${sectioned ? "espacios cortados" : "niveles"}, altura total ${drawing.height.toFixed(2)} metros`}
            >
                <defs>
                    <pattern id={gridId} width={20} height={20} patternUnits="userSpaceOnUse">
                        <path d="M20 0H0V20" fill="none" stroke={COLORS.grid} strokeWidth={1} />
                    </pattern>
                </defs>
                <rect width={VIEW_WIDTH} height={VIEW_HEIGHT} fill={COLORS.background} />
                <rect width={VIEW_WIDTH} height={VIEW_HEIGHT} fill={`url(#${gridId})`} />

                <rect
                    x={DRAW_LEFT - 30}
                    y={ground}
                    width={DRAW_WIDTH + 60}
                    height={26}
                    fill="rgba(57, 217, 138, 0.1)"
                    stroke={COLORS.ground}
                    strokeWidth={1}
                />

                {roof.gable ? (
                    <polygon
                        points={`${toX(roof.from)},${toY(roof.base)} ${toX(roof.to)},${toY(roof.base)} ${toX((roof.from + roof.to) / 2)},${toY(roof.base + roof.rise)}`}
                        fill={sectioned ? "none" : COLORS.roofFill}
                        stroke={COLORS.roof}
                        strokeWidth={sectioned ? 3 : 1.5}
                        strokeLinejoin="round"
                    />
                ) : (
                    <rect
                        x={toX(roof.from)}
                        y={toY(roof.base + roof.rise)}
                        width={(roof.to - roof.from) * scale}
                        height={roof.rise * scale}
                        fill={sectioned ? "none" : COLORS.roofFill}
                        stroke={COLORS.roof}
                        strokeWidth={sectioned ? 3 : 1.5}
                    />
                )}

                {drawing.boxes.map((box, index) => (
                    <g key={index}>
                        <rect
                            x={toX(box.from)}
                            y={toY(box.base + box.height)}
                            width={(box.to - box.from) * scale}
                            height={box.height * scale}
                            fill={sectioned ? "none" : COLORS.facade}
                            stroke={COLORS.wall}
                            strokeWidth={sectioned ? 3 : 1.5}
                        />
                        {sectioned && (box.to - box.from) * scale >= 60 && (
                            <text
                                x={toX((box.from + box.to) / 2)}
                                y={toY(box.base + box.height / 2) + 4}
                                {...TEXT}
                                fontWeight={600}
                                textAnchor="middle"
                            >
                                {box.label.toUpperCase()}
                            </text>
                        )}
                    </g>
                ))}

                {drawing.openings.map((opening, index) => {
                    const x = toX(opening.from);
                    const y = toY(opening.base + opening.height);
                    const width = (opening.to - opening.from) * scale;
                    const height = opening.height * scale;

                    return opening.kind === "door" ? (
                        <rect
                            key={index}
                            x={x}
                            y={y}
                            width={width}
                            height={height}
                            fill="rgba(242, 201, 76, 0.18)"
                            stroke={COLORS.door}
                            strokeWidth={1.4}
                        />
                    ) : (
                        <g key={index} stroke={COLORS.accent} strokeWidth={1.2}>
                            <rect x={x} y={y} width={width} height={height} fill={COLORS.glass} />
                            <line x1={x + width / 2} y1={y} x2={x + width / 2} y2={y + height} />
                        </g>
                    );
                })}

                {drawing.marks.map((mark) => (
                    <g key={mark}>
                        <line
                            x1={toX(to) + 6}
                            y1={toY(mark)}
                            x2={MARK_X + 62}
                            y2={toY(mark)}
                            stroke={COLORS.accent}
                            strokeWidth={0.8}
                            strokeDasharray="4 3"
                            opacity={0.6}
                        />
                        <polygon
                            points={`${MARK_X},${toY(mark) - 7} ${MARK_X + 12},${toY(mark) - 7} ${MARK_X + 6},${toY(mark)}`}
                            fill={COLORS.accent}
                        />
                        <text x={MARK_X + 16} y={toY(mark) - 3} {...MARK}>
                            N+{mark.toFixed(2)}
                        </text>
                    </g>
                ))}

                <text x={DRAW_LEFT - 30} y={VIEW_HEIGHT - 40} {...TEXT} fontSize={15} fontWeight={700}>
                    {title.toUpperCase()}
                </text>
                <text x={DRAW_LEFT - 30} y={VIEW_HEIGHT - 22} {...MARK} fill={COLORS.muted}>
                    Ancho {drawing.width.toFixed(2).replace(".", ",")} m · altura total{" "}
                    {drawing.height.toFixed(2).replace(".", ",")} m
                </text>
            </svg>
            <div className="filters">
                <button
                    type="button"
                    className="button-secondary"
                    onClick={() => {
                        if (svg.current !== null) {
                            downloadSvg(svg.current, fileName);
                        }
                    }}
                >
                    Descargar dibujo (SVG)
                </button>
            </div>
        </figure>
    );
}
