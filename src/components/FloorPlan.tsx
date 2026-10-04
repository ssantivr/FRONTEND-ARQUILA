import { useRef } from "react";

import type { StructureComponent, StructureRoom } from "../types/api";
import type { PlanLevel } from "../utils/building";
import { formatNumber } from "../utils/format";
import { downloadSvg } from "../utils/svg";

const VIEW_WIDTH = 520;
const VIEW_HEIGHT = 390;
const DRAW_LEFT = 70;
const DRAW_TOP = 50;
const DRAW_WIDTH = 400;
const DRAW_HEIGHT = 270;
const DIMENSION_GAP = 22;
const MIN_LABEL_WIDTH = 48;
const MIN_LABEL_HEIGHT = 26;

const COLORS = {
    background: "#0f1d2a",
    text: "#f4f7fa",
    muted: "#8fa3b5",
    wall: "#20c7f5",
    room: "rgba(21, 151, 229, 0.18)",
    volume: "rgba(143, 163, 181, 0.12)",
    structure: "#f4f7fa",
    beam: "#f2c94c",
};

const TEXT = { fontFamily: "system-ui, sans-serif", fontSize: 10, fill: COLORS.text };
const NOTE = { ...TEXT, fontSize: 9, fill: COLORS.muted };

type Element = StructureRoom | StructureComponent;

function left(element: Element): number {
    return element.x_m - element.width_m / 2;
}

function front(element: Element): number {
    return element.y_m - element.depth_m / 2;
}

export function FloorPlan({ level, projectName }: { level: PlanLevel; projectName: string }) {
    const svg = useRef<SVGSVGElement>(null);
    const elements: Element[] = [...level.rooms, ...level.components];
    const minX = Math.min(...elements.map(left));
    const maxX = Math.max(...elements.map((element) => left(element) + element.width_m));
    const minY = Math.min(...elements.map(front));
    const maxY = Math.max(...elements.map((element) => front(element) + element.depth_m));
    const width = maxX - minX;
    const depth = maxY - minY;
    const scale = Math.min(DRAW_WIDTH / width, DRAW_HEIGHT / depth);
    const originX = DRAW_LEFT + (DRAW_WIDTH - width * scale) / 2;
    const originY = DRAW_TOP + (DRAW_HEIGHT - depth * scale) / 2;
    const right = originX + width * scale;
    const bottom = originY + depth * scale;

    function box(element: Element) {
        return {
            x: originX + (left(element) - minX) * scale,
            y: originY + (maxY - front(element) - element.depth_m) * scale,
            width: element.width_m * scale,
            height: element.depth_m * scale,
        };
    }

    return (
        <figure className="terrain-diagrams site-plan">
            <figcaption>
                {level.title} · {formatNumber(level.area)} m² · {level.rooms.length} espacios ·
                N+{level.base.toFixed(2)}
            </figcaption>
            <svg
                ref={svg}
                xmlns="http://www.w3.org/2000/svg"
                viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
                role="img"
                aria-label={`Planta de ${level.title}: ${level.rooms.length} espacios, ${formatNumber(width)} por ${formatNumber(depth)} metros`}
            >
                <rect width={VIEW_WIDTH} height={VIEW_HEIGHT} fill={COLORS.background} />
                <text x={20} y={24} {...TEXT} fontSize={12} fontWeight={600}>
                    {level.title} · N+{level.base.toFixed(2)}
                </text>
                <text x={VIEW_WIDTH - 20} y={24} {...NOTE} textAnchor="end">
                    {formatNumber(level.area)} m² · altura {formatNumber(level.height)} m
                </text>

                {level.rooms.map((room) => {
                    const rect = box(room);
                    const labelled =
                        rect.width >= MIN_LABEL_WIDTH && rect.height >= MIN_LABEL_HEIGHT;

                    return (
                        <g key={`${room.kind}-${room.id}`}>
                            <rect
                                {...rect}
                                fill={room.kind === "room" ? COLORS.room : COLORS.volume}
                                stroke={COLORS.wall}
                                strokeWidth={1.5}
                                strokeDasharray={room.kind === "room" ? undefined : "5 4"}
                            >
                                <title>
                                    {room.name}: {formatNumber(room.width_m)} ×{" "}
                                    {formatNumber(room.depth_m)} m,{" "}
                                    {formatNumber(room.width_m * room.depth_m)} m²
                                </title>
                            </rect>
                            {labelled && (
                                <>
                                    <text
                                        x={rect.x + rect.width / 2}
                                        y={rect.y + rect.height / 2 - 2}
                                        {...TEXT}
                                        textAnchor="middle"
                                    >
                                        {room.kind === "room" ? room.name : "Sin cuartos"}
                                    </text>
                                    <text
                                        x={rect.x + rect.width / 2}
                                        y={rect.y + rect.height / 2 + 11}
                                        {...NOTE}
                                        textAnchor="middle"
                                    >
                                        {formatNumber(room.width_m * room.depth_m)} m²
                                    </text>
                                </>
                            )}
                        </g>
                    );
                })}

                {level.components.map((component) => (
                    <rect
                        key={`${component.kind}-${component.id}`}
                        {...box(component)}
                        fill={component.kind === "beam" ? "none" : COLORS.structure}
                        stroke={component.kind === "beam" ? COLORS.beam : COLORS.structure}
                        strokeWidth={1}
                        strokeDasharray={component.kind === "beam" ? "4 3" : undefined}
                    >
                        <title>{component.name}</title>
                    </rect>
                ))}

                <g stroke={COLORS.muted} strokeWidth={1}>
                    <line
                        x1={originX}
                        y1={bottom + DIMENSION_GAP}
                        x2={right}
                        y2={bottom + DIMENSION_GAP}
                    />
                    <line x1={originX} y1={bottom + 6} x2={originX} y2={bottom + DIMENSION_GAP + 4} />
                    <line x1={right} y1={bottom + 6} x2={right} y2={bottom + DIMENSION_GAP + 4} />
                    <line
                        x1={originX - DIMENSION_GAP}
                        y1={originY}
                        x2={originX - DIMENSION_GAP}
                        y2={bottom}
                    />
                    <line x1={originX - DIMENSION_GAP - 4} y1={originY} x2={originX - 6} y2={originY} />
                    <line x1={originX - DIMENSION_GAP - 4} y1={bottom} x2={originX - 6} y2={bottom} />
                </g>
                <text
                    x={(originX + right) / 2}
                    y={bottom + DIMENSION_GAP + 14}
                    {...TEXT}
                    textAnchor="middle"
                >
                    {formatNumber(width)} m
                </text>
                <text
                    x={originX - DIMENSION_GAP - 8}
                    y={(originY + bottom) / 2}
                    {...TEXT}
                    textAnchor="middle"
                    transform={`rotate(-90 ${originX - DIMENSION_GAP - 8} ${(originY + bottom) / 2})`}
                >
                    {formatNumber(depth)} m
                </text>
                <text x={VIEW_WIDTH / 2} y={VIEW_HEIGHT - 10} {...NOTE} textAnchor="middle">
                    Frente del lote abajo · columnas y muros en blanco · vigas en línea discontinua
                </text>
            </svg>
            <div className="filters">
                <button
                    type="button"
                    className="button-secondary"
                    onClick={() => {
                        if (svg.current !== null) {
                            downloadSvg(svg.current, `planta-${projectName}-${level.title}`);
                        }
                    }}
                >
                    Descargar planta (SVG)
                </button>
            </div>
        </figure>
    );
}
