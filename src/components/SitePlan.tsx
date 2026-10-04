import { useRef, useState } from "react";

import type { Terrain } from "../types/api";
import { formatNumber } from "../utils/format";
import { bounds, edges, footprint, insetBounds } from "../utils/geometry";
import { downloadSvg } from "../utils/svg";

const VIEW_WIDTH = 470;
const VIEW_HEIGHT = 330;
const DRAW_LEFT = 50;
const DRAW_TOP = 50;
const DRAW_WIDTH = 230;
const DRAW_HEIGHT = 200;
const LABEL_OFFSET = 12;
const LEGEND_X = 330;
const LEGEND_Y = 70;
const NORTH_X = 395;
const NORTH_Y = 245;
const NORTH_SIZE = 24;
const DEFAULT_SETBACK = 3;

const COLORS = {
    background: "#fbfaf7",
    text: "#1c2430",
    muted: "#5b6675",
    boundary: "#1c2430",
    free: "rgba(47, 125, 79, 0.16)",
    buildable: "rgba(31, 78, 121, 0.2)",
    buildableLine: "#1f4e79",
    access: "#8a5d00",
};

const NORTH_OPTIONS = [
    { angle: 0, label: "El fondo" },
    { angle: 90, label: "La derecha" },
    { angle: 180, label: "El frente" },
    { angle: 270, label: "La izquierda" },
];

const TEXT = { fontFamily: "system-ui, sans-serif", fontSize: 11, fill: COLORS.text };
const NOTE = { ...TEXT, fontSize: 10, fill: COLORS.muted };

function download(svg: SVGSVGElement, name: string) {
    downloadSvg(svg, `implantacion-${name}`);
}

export function printableDocument(svgSource: string, title: string): string {
    const safeTitle = title.replace(/[&<>]/g, "");

    return (
        `<!doctype html><html lang="es"><head><meta charset="UTF-8"><title>${safeTitle}</title>` +
        "<style>@page{size:A4 landscape;margin:12mm}html,body{height:100%;margin:0}" +
        "body{display:flex;align-items:center;justify-content:center}" +
        "svg{width:100%;height:100%;-webkit-print-color-adjust:exact;print-color-adjust:exact}" +
        `</style></head><body>${svgSource}</body></html>`
    );
}

function print(svg: SVGSVGElement, name: string) {
    const frame = document.createElement("iframe");

    frame.style.position = "fixed";
    frame.style.width = "0";
    frame.style.height = "0";
    frame.style.border = "0";
    frame.srcdoc = printableDocument(
        new XMLSerializer().serializeToString(svg),
        `Plano de implantación — ${name}`,
    );
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

function initialSetback(terrain: Terrain): number {
    if (terrain.width_m === null || terrain.length_m === null) {
        return DEFAULT_SETBACK;
    }

    const quarter = Math.min(terrain.width_m, terrain.length_m) / 4;

    return Math.min(DEFAULT_SETBACK, Math.floor(quarter * 2) / 2);
}

export function SitePlan({ terrain }: { terrain: Terrain }) {
    const [setback, setSetback] = useState(() => initialSetback(terrain));
    const [north, setNorth] = useState(0);
    const svg = useRef<SVGSVGElement>(null);
    const shape = footprint(terrain);

    if (shape === null) {
        return (
            <figure className="terrain-diagrams">
                <figcaption>{terrain.name}</figcaption>
                <p className="message">
                    Faltan el ancho y el largo, o los vértices del lote, para dibujar la
                    implantación.
                </p>
            </figure>
        );
    }

    const box = bounds(shape);
    const width = box.maxX - box.minX;
    const height = box.maxY - box.minY;
    const scale = Math.min(DRAW_WIDTH / width, DRAW_HEIGHT / height);
    const left = DRAW_LEFT + (DRAW_WIDTH - width * scale) / 2;
    const top = DRAW_TOP + (DRAW_HEIGHT - height * scale) / 2;
    const toX = (x: number) => left + (x - box.minX) * scale;
    const toY = (y: number) => top + (box.maxY - y) * scale;

    const rectangular = terrain.points.length < 3;
    const buildable = rectangular ? insetBounds(box, setback) : null;
    const buildableArea =
        buildable === null
            ? null
            : (buildable.maxX - buildable.minX) * (buildable.maxY - buildable.minY);

    const front = shape.filter((point) => point.y === box.minY);
    const accessX = toX(front.reduce((sum, point) => sum + point.x, 0) / front.length);
    const accessY = toY(box.minY) + LABEL_OFFSET + 14;

    const radians = (north * Math.PI) / 180;
    const tipX = NORTH_X + Math.sin(radians) * NORTH_SIZE;
    const tipY = NORTH_Y - Math.cos(radians) * NORTH_SIZE;
    const letterX = NORTH_X + Math.sin(radians) * (NORTH_SIZE + 10);
    const letterY = NORTH_Y - Math.cos(radians) * (NORTH_SIZE + 10);

    const summary =
        buildableArea === null
            ? `Área del lote: ${formatNumber(terrain.area_m2)} m²`
            : `Área del lote: ${formatNumber(terrain.area_m2)} m² · Área edificable: ${formatNumber(buildableArea)} m²`;

    return (
        <figure className="terrain-diagrams">
            <figcaption>{terrain.name}</figcaption>
            <div className="diagram site-plan">
                <svg
                    ref={svg}
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
                    role="img"
                    aria-label={`Plano de implantación de ${terrain.name}: lote de ${formatNumber(width)} por ${formatNumber(height)} metros. ${summary}`}
                >
                    <rect width={VIEW_WIDTH} height={VIEW_HEIGHT} fill={COLORS.background} />
                    <text x={DRAW_LEFT - 30} y={24} {...TEXT} fontSize={13}>
                        Plano de implantación — {terrain.name}
                    </text>
                    <polygon
                        points={shape.map((point) => `${toX(point.x)},${toY(point.y)}`).join(" ")}
                        fill={COLORS.free}
                        stroke={COLORS.boundary}
                        strokeWidth={1.5}
                    />
                    {buildable !== null && (
                        <rect
                            x={toX(buildable.minX)}
                            y={toY(buildable.maxY)}
                            width={(buildable.maxX - buildable.minX) * scale}
                            height={(buildable.maxY - buildable.minY) * scale}
                            fill={COLORS.buildable}
                            stroke={COLORS.buildableLine}
                            strokeWidth={1}
                            strokeDasharray="5 3"
                        />
                    )}
                    {edges(shape).map((edge, index) => (
                        <text
                            key={index}
                            x={toX(edge.middle.x) + edge.outward.x * LABEL_OFFSET}
                            y={toY(edge.middle.y) - edge.outward.y * LABEL_OFFSET}
                            textAnchor={
                                edge.outward.x > 0.5
                                    ? "start"
                                    : edge.outward.x < -0.5
                                      ? "end"
                                      : "middle"
                            }
                            dominantBaseline="middle"
                            {...TEXT}
                        >
                            {formatNumber(edge.length)} m
                        </text>
                    ))}
                    <polygon
                        points={`${accessX},${accessY} ${accessX - 6},${accessY + 10} ${accessX + 6},${accessY + 10}`}
                        fill={COLORS.access}
                    />
                    <text x={accessX} y={accessY + 22} textAnchor="middle" {...TEXT}>
                        Acceso
                    </text>

                    <line
                        x1={LEGEND_X}
                        y1={LEGEND_Y}
                        x2={LEGEND_X + 18}
                        y2={LEGEND_Y}
                        stroke={COLORS.boundary}
                        strokeWidth={1.5}
                    />
                    <text x={LEGEND_X + 26} y={LEGEND_Y} dominantBaseline="middle" {...TEXT}>
                        Límite del terreno
                    </text>
                    <rect
                        x={LEGEND_X}
                        y={LEGEND_Y + 16}
                        width={18}
                        height={10}
                        fill={COLORS.free}
                        stroke={COLORS.muted}
                        strokeWidth={0.5}
                    />
                    <text x={LEGEND_X + 26} y={LEGEND_Y + 21} dominantBaseline="middle" {...TEXT}>
                        Área libre (retiros)
                    </text>
                    {buildable !== null && (
                        <>
                            <rect
                                x={LEGEND_X}
                                y={LEGEND_Y + 37}
                                width={18}
                                height={10}
                                fill={COLORS.buildable}
                                stroke={COLORS.buildableLine}
                                strokeWidth={1}
                                strokeDasharray="5 3"
                            />
                            <text
                                x={LEGEND_X + 26}
                                y={LEGEND_Y + 42}
                                dominantBaseline="middle"
                                {...TEXT}
                            >
                                Área edificable
                            </text>
                        </>
                    )}
                    <polygon
                        points={`${LEGEND_X + 9},${LEGEND_Y + 58} ${LEGEND_X + 3},${LEGEND_Y + 68} ${LEGEND_X + 15},${LEGEND_Y + 68}`}
                        fill={COLORS.access}
                    />
                    <text x={LEGEND_X + 26} y={LEGEND_Y + 63} dominantBaseline="middle" {...TEXT}>
                        Acceso
                    </text>

                    <line
                        x1={2 * NORTH_X - tipX}
                        y1={2 * NORTH_Y - tipY}
                        x2={tipX}
                        y2={tipY}
                        stroke={COLORS.text}
                        strokeWidth={1.5}
                    />
                    <circle cx={tipX} cy={tipY} r={3} fill={COLORS.text} />
                    <text
                        x={letterX}
                        y={letterY}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        {...TEXT}
                        fontSize={12}
                    >
                        N
                    </text>

                    <text x={DRAW_LEFT - 30} y={VIEW_HEIGHT - 12} {...NOTE}>
                        {summary}
                    </text>
                </svg>
                <div className="diagram-controls">
                    <label>
                        Retiro: {formatNumber(setback)} m
                        <input
                            type="range"
                            min="0"
                            max="10"
                            step="0.5"
                            value={setback}
                            disabled={!rectangular}
                            onChange={(event) => setSetback(Number(event.target.value))}
                        />
                    </label>
                    <label>
                        El norte está hacia
                        <select
                            value={north}
                            onChange={(event) => setNorth(Number(event.target.value))}
                        >
                            {NORTH_OPTIONS.map((option) => (
                                <option key={option.angle} value={option.angle}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </label>
                    <button
                        type="button"
                        onClick={() => svg.current && download(svg.current, terrain.name)}
                    >
                        Descargar plano (SVG)
                    </button>
                    <button
                        type="button"
                        className="button-secondary"
                        onClick={() => svg.current && print(svg.current, terrain.name)}
                    >
                        Imprimir o guardar como PDF
                    </button>
                </div>
                {!rectangular && (
                    <p className="message">
                        El área edificable solo se calcula en lotes rectangulares.
                    </p>
                )}
                {rectangular && buildable === null && (
                    <p className="message">Con ese retiro no queda área edificable.</p>
                )}
            </div>
        </figure>
    );
}
