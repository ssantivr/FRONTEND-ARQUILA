import { useRef, useState } from "react";

import type { StructureComponent, StructureRoom } from "../types/api";
import type { PlanLevel } from "../utils/building";
import { formatNumber } from "../utils/format";
import {
    elementKey,
    exteriorSides,
    rectOf,
    unionOf,
    type Opening,
    type Rect,
    type Side,
} from "../utils/openings";
import { downloadSvg } from "../utils/svg";

const VIEW_WIDTH = 660;
const VIEW_HEIGHT = 520;
const DRAW_LEFT = 120;
const DRAW_TOP = 120;
const DRAW_WIDTH = 490;
const DRAW_HEIGHT = 300;
const CHAIN_GAP = 30;
const TOTAL_GAP = 48;
const BUBBLE_GAP = 80;
const BUBBLE_RADIUS = 10;
const MIN_DIMENSION_PX = 30;
const MIN_LABEL_WIDTH = 48;
const MIN_LABEL_HEIGHT = 28;
const TREAD_M = 0.3;
const SCALE_BARS_M = [1, 2, 5, 10, 20, 50];
const ZOOM_STEP = 25;

const COLORS = {
    background: "#fbfaf7",
    grid: "#e7e4dd",
    floor: "#f3f0e9",
    text: "#1c2430",
    muted: "#5b6675",
    wall: "#1c2430",
    accent: "#1f4e79",
    beam: "#8a5d00",
};

const TEXT = { fontFamily: "system-ui, sans-serif", fontSize: 10, fill: COLORS.text };
const NOTE = { ...TEXT, fontSize: 9, fill: COLORS.muted };
const DIMENSION = { ...NOTE, fontFamily: "ui-monospace, Consolas, monospace" };

interface FloorPlanProps {
    level: PlanLevel;
    projectName: string;
    openings: Map<string, Opening[]>;
}

function meters(value: number): string {
    return value.toFixed(2).replace(".", ",");
}

function axisValues(values: number[]): number[] {
    return [...new Set(values.map((value) => Number(value.toFixed(2))))].sort(
        (first, second) => first - second,
    );
}

function axisName(index: number): string {
    return index < 26 ? String.fromCharCode(65 + index) : String(index + 1);
}

function printSvg(svg: SVGSVGElement, title: string) {
    const frame = document.createElement("iframe");
    frame.title = "Vista de impresión";
    frame.tabIndex = -1;
    frame.style.position = "fixed";
    frame.style.width = "0";
    frame.style.height = "0";
    frame.style.border = "0";
    frame.srcdoc =
        `<!doctype html><html lang="es"><head><meta charset="UTF-8"><title>${title.replace(/[&<>]/g, "")}</title>` +
        "<style>@page{size:A3 landscape;margin:12mm}html,body{height:100%;margin:0}" +
        "body{display:flex;align-items:center;justify-content:center}svg{width:100%;height:100%;-webkit-print-color-adjust:exact;print-color-adjust:exact}</style>" +
        `</head><body>${new XMLSerializer().serializeToString(svg)}</body></html>`;
    frame.onload = () => {
        const target = frame.contentWindow;

        if (target === null) {
            frame.remove();
            return;
        }

        target.onafterprint = () => frame.remove();
        target.focus();
        target.print();
    };
    document.body.append(frame);
}

export function FloorPlan({ level, projectName, openings }: FloorPlanProps) {
    const svg = useRef<SVGSVGElement>(null);
    const [zoom, setZoom] = useState(100);
    const [showDimensions, setShowDimensions] = useState(true);
    const [showHatch, setShowHatch] = useState(true);
    const [showLabels, setShowLabels] = useState(true);
    const elements: (StructureRoom | StructureComponent)[] = [...level.rooms, ...level.components];
    const area = unionOf(elements.map(rectOf));
    const rooms = level.rooms.length > 0 ? unionOf(level.rooms.map(rectOf)) : area;
    const width = area.maxX - area.minX;
    const depth = area.maxY - area.minY;
    const scale = Math.min(DRAW_WIDTH / width, DRAW_HEIGHT / depth);
    const left = DRAW_LEFT + (DRAW_WIDTH - width * scale) / 2;
    const top = DRAW_TOP + (DRAW_HEIGHT - depth * scale) / 2;
    const right = left + width * scale;
    const bottom = top + depth * scale;
    const toX = (x: number) => left + (x - area.minX) * scale;
    const toY = (y: number) => top + (area.maxY - y) * scale;
    const xs = axisValues(
        level.rooms.length > 0
            ? level.rooms.flatMap((room) => [rectOf(room).minX, rectOf(room).maxX])
            : [area.minX, area.maxX],
    );
    const ys = axisValues(
        level.rooms.length > 0
            ? level.rooms.flatMap((room) => [rectOf(room).minY, rectOf(room).maxY])
            : [area.minY, area.maxY],
    ).reverse();
    const barLength =
        SCALE_BARS_M.find((length) => length * scale >= 50) ??
        SCALE_BARS_M[SCALE_BARS_M.length - 1];
    const gridId = `floor-grid-${level.planId}`;
    const hatchId = `floor-hatch-${level.planId}`;
    const zoomFactor = 100 / zoom;
    const viewWidth = VIEW_WIDTH * zoomFactor;
    const viewHeight = VIEW_HEIGHT * zoomFactor;
    const viewBox = `${(VIEW_WIDTH - viewWidth) / 2} ${(VIEW_HEIGHT - viewHeight) / 2} ${viewWidth} ${viewHeight}`;

    function box(rect: Rect) {
        return {
            x: toX(rect.minX),
            y: toY(rect.maxY),
            width: (rect.maxX - rect.minX) * scale,
            height: (rect.maxY - rect.minY) * scale,
        };
    }

    function edge(rect: Rect, side: Side, from?: number, to?: number) {
        const horizontal = side === "front" || side === "back";
        const start = horizontal ? rect.minX : rect.minY;
        const end = horizontal ? rect.maxX : rect.maxY;
        const a = from === undefined ? start : start + from;
        const b = to === undefined ? end : start + to;

        if (horizontal) {
            const y = toY(side === "front" ? rect.minY : rect.maxY);

            return { x1: toX(a), y1: y, x2: toX(b), y2: y };
        }

        const x = toX(side === "right" ? rect.maxX : rect.minX);

        return { x1: x, y1: toY(a), x2: x, y2: toY(b) };
    }

    function treads(room: StructureRoom) {
        const rect = box(rectOf(room));
        const alongX = room.width_m >= room.depth_m;
        const count = Math.floor((alongX ? room.width_m : room.depth_m) / TREAD_M);

        return Array.from({ length: Math.max(count - 1, 0) }, (_, index) => {
            const offset = ((index + 1) / count) * (alongX ? rect.width : rect.height);

            return alongX
                ? {
                      x1: rect.x + offset,
                      y1: rect.y + 4,
                      x2: rect.x + offset,
                      y2: rect.y + rect.height - 4,
                  }
                : {
                      x1: rect.x + 4,
                      y1: rect.y + offset,
                      x2: rect.x + rect.width - 4,
                      y2: rect.y + offset,
                  };
        });
    }

    return (
        <figure className="terrain-diagrams site-plan floor-plan">
            <figcaption>
                {level.title} · {formatNumber(level.area)} m² · {level.rooms.length} espacios · N+
                {level.base.toFixed(2)}
            </figcaption>
            <svg
                ref={svg}
                xmlns="http://www.w3.org/2000/svg"
                viewBox={viewBox}
                role="img"
                aria-label={`Planta de ${level.title}: ${level.rooms.length} espacios, ${formatNumber(width)} por ${formatNumber(depth)} metros, con ${xs.length} ejes en un sentido y ${ys.length} en el otro`}
            >
                <defs>
                    <pattern id={gridId} width={20} height={20} patternUnits="userSpaceOnUse">
                        <path d="M20 0H0V20" fill="none" stroke={COLORS.grid} strokeWidth={1} />
                    </pattern>
                    <pattern
                        id={hatchId}
                        width={8}
                        height={8}
                        patternUnits="userSpaceOnUse"
                        patternTransform="rotate(45)"
                    >
                        <path d="M0 0V8" stroke={COLORS.grid} strokeWidth={1} />
                    </pattern>
                </defs>
                <rect width={VIEW_WIDTH} height={VIEW_HEIGHT} fill={COLORS.background} />
                <rect width={VIEW_WIDTH} height={VIEW_HEIGHT} fill={`url(#${gridId})`} />

                <g
                    visibility={showDimensions ? "visible" : "hidden"}
                    stroke={COLORS.accent}
                    strokeWidth={0.8}
                    strokeDasharray="6 4"
                    opacity={0.45}
                >
                    {xs.map((x) => (
                        <line
                            key={`x${x}`}
                            x1={toX(x)}
                            y1={top - BUBBLE_GAP + BUBBLE_RADIUS}
                            x2={toX(x)}
                            y2={bottom + 10}
                        />
                    ))}
                    {ys.map((y) => (
                        <line
                            key={`y${y}`}
                            x1={left - BUBBLE_GAP + BUBBLE_RADIUS}
                            y1={toY(y)}
                            x2={right + 10}
                            y2={toY(y)}
                        />
                    ))}
                </g>
                {xs.map((x, index) => (
                    <g key={`bx${x}`}>
                        <circle
                            cx={toX(x)}
                            cy={top - BUBBLE_GAP}
                            r={BUBBLE_RADIUS}
                            fill={COLORS.background}
                            stroke={COLORS.accent}
                            strokeWidth={1.2}
                        />
                        <text
                            x={toX(x)}
                            y={top - BUBBLE_GAP + 3.5}
                            {...TEXT}
                            fill={COLORS.accent}
                            fontWeight={600}
                            textAnchor="middle"
                        >
                            {axisName(index)}
                        </text>
                    </g>
                ))}
                {ys.map((y, index) => (
                    <g key={`by${y}`}>
                        <circle
                            cx={left - BUBBLE_GAP}
                            cy={toY(y)}
                            r={BUBBLE_RADIUS}
                            fill={COLORS.background}
                            stroke={COLORS.accent}
                            strokeWidth={1.2}
                        />
                        <text
                            x={left - BUBBLE_GAP}
                            y={toY(y) + 3.5}
                            {...TEXT}
                            fill={COLORS.accent}
                            fontWeight={600}
                            textAnchor="middle"
                        >
                            {index + 1}
                        </text>
                    </g>
                ))}

                <g
                    visibility={showDimensions ? "visible" : "hidden"}
                    stroke={COLORS.muted}
                    strokeWidth={1}
                >
                    <line x1={left} y1={top - CHAIN_GAP} x2={right} y2={top - CHAIN_GAP} />
                    {xs.map((x) => (
                        <line
                            key={`tx${x}`}
                            x1={toX(x) - 3}
                            y1={top - CHAIN_GAP + 3}
                            x2={toX(x) + 3}
                            y2={top - CHAIN_GAP - 3}
                        />
                    ))}
                    <line x1={left - CHAIN_GAP} y1={top} x2={left - CHAIN_GAP} y2={bottom} />
                    {ys.map((y) => (
                        <line
                            key={`ty${y}`}
                            x1={left - CHAIN_GAP - 3}
                            y1={toY(y) + 3}
                            x2={left - CHAIN_GAP + 3}
                            y2={toY(y) - 3}
                        />
                    ))}
                    {showDimensions && xs.length > 2 && (
                        <line x1={left} y1={top - TOTAL_GAP} x2={right} y2={top - TOTAL_GAP} />
                    )}
                    {showDimensions && ys.length > 2 && (
                        <line x1={left - TOTAL_GAP} y1={top} x2={left - TOTAL_GAP} y2={bottom} />
                    )}
                </g>
                {showDimensions &&
                    xs.slice(1).map((x, index) => {
                        const previous = xs[index];
                        const middle = (toX(previous) + toX(x)) / 2;

                        return (
                            (x - previous) * scale >= MIN_DIMENSION_PX && (
                                <text
                                    key={`dx${x}`}
                                    x={middle}
                                    y={top - CHAIN_GAP - 5}
                                    {...DIMENSION}
                                    textAnchor="middle"
                                >
                                    {meters(x - previous)}
                                </text>
                            )
                        );
                    })}
                {showDimensions &&
                    ys.slice(1).map((y, index) => {
                        const previous = ys[index];
                        const middle = (toY(previous) + toY(y)) / 2;

                        return (
                            (previous - y) * scale >= MIN_DIMENSION_PX && (
                                <text
                                    key={`dy${y}`}
                                    x={left - CHAIN_GAP - 5}
                                    y={middle}
                                    {...DIMENSION}
                                    textAnchor="middle"
                                    transform={`rotate(-90 ${left - CHAIN_GAP - 5} ${middle})`}
                                >
                                    {meters(previous - y)}
                                </text>
                            )
                        );
                    })}
                {xs.length > 2 && (
                    <text
                        x={(left + right) / 2}
                        y={top - TOTAL_GAP - 5}
                        {...DIMENSION}
                        fill={COLORS.text}
                        textAnchor="middle"
                    >
                        {meters(width)}
                    </text>
                )}
                {ys.length > 2 && (
                    <text
                        x={left - TOTAL_GAP - 5}
                        y={(top + bottom) / 2}
                        {...DIMENSION}
                        fill={COLORS.text}
                        textAnchor="middle"
                        transform={`rotate(-90 ${left - TOTAL_GAP - 5} ${(top + bottom) / 2})`}
                    >
                        {meters(depth)}
                    </text>
                )}

                {level.rooms.map((room) => {
                    const rect = box(rectOf(room));
                    const labelled =
                        rect.width >= MIN_LABEL_WIDTH && rect.height >= MIN_LABEL_HEIGHT;
                    const isStair = /escalera/i.test(room.name);

                    return (
                        <g key={elementKey(room)}>
                            <rect
                                {...rect}
                                fill={showHatch ? `url(#${hatchId})` : COLORS.floor}
                                stroke={COLORS.wall}
                                strokeWidth={1.5}
                                strokeDasharray={room.kind === "room" ? undefined : "6 4"}
                            >
                                <title>
                                    {room.name}: {formatNumber(room.width_m)} ×{" "}
                                    {formatNumber(room.depth_m)} m,{" "}
                                    {formatNumber(room.width_m * room.depth_m)} m²
                                </title>
                            </rect>
                            {isStair &&
                                treads(room).map((line, index) => (
                                    <line
                                        key={index}
                                        {...line}
                                        stroke={COLORS.muted}
                                        strokeWidth={0.8}
                                    />
                                ))}
                            {showLabels && labelled && (
                                <g pointerEvents="none">
                                    <text
                                        x={rect.x + rect.width / 2}
                                        y={rect.y + rect.height / 2 - 1}
                                        {...TEXT}
                                        fontSize={11}
                                        fontWeight={600}
                                        textAnchor="middle"
                                        stroke={COLORS.floor}
                                        strokeWidth={3}
                                        paintOrder="stroke"
                                    >
                                        {room.kind === "room" ? room.name : "Sin cuartos"}
                                    </text>
                                    <text
                                        x={rect.x + rect.width / 2}
                                        y={rect.y + rect.height / 2 + 12}
                                        {...DIMENSION}
                                        textAnchor="middle"
                                    >
                                        {formatNumber(room.width_m * room.depth_m)} m²
                                    </text>
                                </g>
                            )}
                        </g>
                    );
                })}

                {level.rooms.map((room) => {
                    const rect = rectOf(room);

                    return (
                        <g key={`walls-${elementKey(room)}`} strokeLinecap="square">
                            {room.kind === "room" &&
                                exteriorSides(room, rooms).map((side) => (
                                    <line
                                        key={side}
                                        {...edge(rect, side)}
                                        stroke={COLORS.wall}
                                        strokeWidth={4.5}
                                    />
                                ))}
                            {(openings.get(elementKey(room)) ?? []).map((opening, index) => {
                                const line = edge(
                                    rect,
                                    opening.side,
                                    opening.center - opening.width / 2,
                                    opening.center + opening.width / 2,
                                );
                                const swing = opening.width * scale;

                                return (
                                    <g key={index} strokeLinecap="butt">
                                        <title>
                                            {opening.kind === "window" ? "Ventana" : "Puerta"} de{" "}
                                            {formatNumber(opening.width)} m en {room.name}
                                        </title>
                                        <line {...line} stroke={COLORS.floor} strokeWidth={6} />
                                        {opening.kind === "window" ? (
                                            <line
                                                {...line}
                                                stroke={COLORS.accent}
                                                strokeWidth={3}
                                            />
                                        ) : (
                                            <>
                                                <line
                                                    x1={line.x1}
                                                    y1={line.y1}
                                                    x2={line.x1}
                                                    y2={line.y1 - swing}
                                                    stroke={COLORS.accent}
                                                    strokeWidth={1.4}
                                                />
                                                <path
                                                    d={`M${line.x1} ${line.y1 - swing} A${swing} ${swing} 0 0 1 ${line.x2} ${line.y2}`}
                                                    fill="none"
                                                    stroke={COLORS.accent}
                                                    strokeWidth={1}
                                                    strokeDasharray="3 3"
                                                />
                                            </>
                                        )}
                                    </g>
                                );
                            })}
                        </g>
                    );
                })}

                {level.components.map((component) => (
                    <rect
                        key={elementKey(component)}
                        {...box(rectOf(component))}
                        fill={component.kind === "beam" ? "none" : COLORS.wall}
                        stroke={component.kind === "beam" ? COLORS.beam : COLORS.wall}
                        strokeWidth={1}
                        strokeDasharray={component.kind === "beam" ? "4 3" : undefined}
                    >
                        <title>{component.name}</title>
                    </rect>
                ))}

                <rect
                    x={left - 8}
                    y={bottom + 26}
                    width={220}
                    height={48}
                    fill={COLORS.background}
                    stroke={COLORS.muted}
                    strokeWidth={0.8}
                />
                <text x={left} y={bottom + 39} {...TEXT} fontSize={13} fontWeight={700}>
                    {level.title.toUpperCase()} · N+{level.base.toFixed(2)}
                </text>
                <text x={left} y={bottom + 52} {...DIMENSION}>
                    {projectName.length > 30 ? `${projectName.slice(0, 27)}…` : projectName}
                </text>
                <text x={left} y={bottom + 66} {...DIMENSION} fontSize={8}>
                    Área {meters(level.area)} m² · alt. {meters(level.height)} m
                </text>
                <g stroke={COLORS.text} strokeWidth={1.2}>
                    <line
                        x1={right - barLength * scale}
                        y1={bottom + 50}
                        x2={right}
                        y2={bottom + 50}
                    />
                    <line
                        x1={right - barLength * scale}
                        y1={bottom + 45}
                        x2={right - barLength * scale}
                        y2={bottom + 55}
                    />
                    <line x1={right} y1={bottom + 45} x2={right} y2={bottom + 55} />
                </g>
                <text
                    x={right - barLength * scale}
                    y={bottom + 67}
                    {...DIMENSION}
                    textAnchor="middle"
                >
                    0
                </text>
                <text x={right} y={bottom + 67} {...DIMENSION} textAnchor="middle">
                    {barLength} m
                </text>
                <text x={VIEW_WIDTH / 2} y={VIEW_HEIGHT - 10} {...NOTE} textAnchor="middle">
                    Frente abajo · ventanas en azul · puertas con giro · columnas y muros en negro ·
                    vigas discontinuas
                </text>
            </svg>
            <div className="diagram-controls" role="group" aria-label="Herramientas de planta">
                <button
                    type="button"
                    className="button-secondary"
                    aria-label="Alejar planta"
                    disabled={zoom <= 75}
                    onClick={() => setZoom((value) => Math.max(75, value - ZOOM_STEP))}
                >
                    −
                </button>
                <span aria-live="polite">Zoom {zoom} %</span>
                <button
                    type="button"
                    className="button-secondary"
                    aria-label="Acercar planta"
                    disabled={zoom >= 200}
                    onClick={() => setZoom((value) => Math.min(200, value + ZOOM_STEP))}
                >
                    +
                </button>
                <button type="button" className="button-secondary" onClick={() => setZoom(100)}>
                    Ajustar
                </button>
                <label className="checkbox">
                    <input
                        type="checkbox"
                        checked={showDimensions}
                        onChange={(event) => setShowDimensions(event.target.checked)}
                    />
                    Cotas y ejes
                </label>
                <label className="checkbox">
                    <input
                        type="checkbox"
                        checked={showHatch}
                        onChange={(event) => setShowHatch(event.target.checked)}
                    />
                    Trama
                </label>
                <label className="checkbox">
                    <input
                        type="checkbox"
                        checked={showLabels}
                        onChange={(event) => setShowLabels(event.target.checked)}
                    />
                    Etiquetas
                </label>
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
                <button
                    type="button"
                    className="button-secondary"
                    onClick={() =>
                        svg.current &&
                        printSvg(svg.current, `Planta ${projectName} — ${level.title}`)
                    }
                >
                    Imprimir o guardar como PDF
                </button>
            </div>
        </figure>
    );
}
