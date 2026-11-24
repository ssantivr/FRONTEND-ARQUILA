import { useRef, useState } from "react";

import type { Drawing } from "../utils/elevations";
import { downloadSvg } from "../utils/svg";

const VIEW_WIDTH = 660;
const VIEW_HEIGHT = 420;
const DRAW_LEFT = 70;
const DRAW_TOP = 50;
const DRAW_WIDTH = 460;
const DRAW_HEIGHT = 260;
const MARK_X = 575;
const ZOOM_STEP = 25;

const COLORS = {
    background: "#fbfaf7",
    grid: "#e7e4dd",
    text: "#1c2430",
    muted: "#5b6675",
    wall: "#1c2430",
    facade: "#ece8e0",
    accent: "#1f4e79",
    glass: "rgba(31, 78, 121, 0.2)",
    door: "#7a4f24",
    roof: "#8c4a3c",
    roofFill: "#dcbfb4",
    ground: "#2f7d4f",
};

const TEXT = { fontFamily: "system-ui, sans-serif", fontSize: 10, fill: COLORS.text };
const MARK = {
    ...TEXT,
    fontSize: 9,
    fill: COLORS.accent,
    fontFamily: "ui-monospace, Consolas, monospace",
};

interface ElevationDrawingProps {
    drawing: Drawing;
    title: string;
    fileName: string;
    sectioned: boolean;
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

export function ElevationDrawing({ drawing, title, fileName, sectioned }: ElevationDrawingProps) {
    const svg = useRef<SVGSVGElement>(null);
    const [zoom, setZoom] = useState(100);
    const [showDimensions, setShowDimensions] = useState(true);
    const [showHatch, setShowHatch] = useState(true);
    const [showLabels, setShowLabels] = useState(true);
    const from = Math.min(0, drawing.roof.from);
    const to = Math.max(drawing.width, drawing.roof.to);
    const scale = Math.min(DRAW_WIDTH / (to - from), DRAW_HEIGHT / drawing.height);
    const left = DRAW_LEFT + (DRAW_WIDTH - (to - from) * scale) / 2;
    const ground = DRAW_TOP + DRAW_HEIGHT;
    const toX = (u: number) => left + (u - from) * scale;
    const toY = (height: number) => ground - height * scale;
    const roof = drawing.roof;
    const gridId = `elevation-grid-${fileName.replace(/\W+/g, "-")}`;
    const hatchId = `elevation-hatch-${fileName.replace(/\W+/g, "-")}`;
    const zoomFactor = 100 / zoom;
    const viewWidth = VIEW_WIDTH * zoomFactor;
    const viewHeight = VIEW_HEIGHT * zoomFactor;
    const viewBox = `${(VIEW_WIDTH - viewWidth) / 2} ${(VIEW_HEIGHT - viewHeight) / 2} ${viewWidth} ${viewHeight}`;

    return (
        <figure className="terrain-diagrams site-plan floor-plan">
            <svg
                ref={svg}
                xmlns="http://www.w3.org/2000/svg"
                viewBox={viewBox}
                role="img"
                aria-label={`${title}: ${drawing.boxes.length} ${sectioned ? "espacios cortados" : "niveles"}, altura total ${drawing.height.toFixed(2)} metros`}
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
                        <path d="M0 0V8" stroke={COLORS.muted} strokeWidth={0.8} />
                    </pattern>
                </defs>
                <rect width={VIEW_WIDTH} height={VIEW_HEIGHT} fill={COLORS.background} />
                <rect width={VIEW_WIDTH} height={VIEW_HEIGHT} fill={`url(#${gridId})`} />

                <rect
                    x={DRAW_LEFT - 30}
                    y={ground}
                    width={DRAW_WIDTH + 60}
                    height={26}
                    fill="rgba(47, 125, 79, 0.12)"
                    stroke={COLORS.ground}
                    strokeWidth={1}
                />

                {roof.gable ? (
                    <polygon
                        points={`${toX(roof.from)},${toY(roof.base)} ${toX(roof.to)},${toY(roof.base)} ${toX((roof.from + roof.to) / 2)},${toY(roof.base + roof.rise)}`}
                        fill={showHatch ? `url(#${hatchId})` : sectioned ? "none" : COLORS.roofFill}
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
                        fill={showHatch ? `url(#${hatchId})` : sectioned ? "none" : COLORS.roofFill}
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
                            fill={
                                showHatch ? `url(#${hatchId})` : sectioned ? "none" : COLORS.facade
                            }
                            stroke={COLORS.wall}
                            strokeWidth={sectioned ? 3 : 1.5}
                        />
                        {showLabels && sectioned && (box.to - box.from) * scale >= 60 && (
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
                        {showLabels && !sectioned && (box.to - box.from) * scale >= 70 && (
                            <text
                                x={toX((box.from + box.to) / 2)}
                                y={toY(box.base + box.height / 2) + 4}
                                {...TEXT}
                                fontWeight={600}
                                textAnchor="middle"
                                stroke={COLORS.facade}
                                strokeWidth={2}
                                paintOrder="stroke"
                            >
                                {box.label}
                            </text>
                        )}
                    </g>
                ))}

                {drawing.openings.map((opening, index) => {
                    const x = toX(opening.from);
                    const y = toY(opening.base + opening.height);
                    const width = (opening.to - opening.from) * scale;
                    const height = opening.height * scale;

                    return (
                        <g key={index}>
                            {opening.kind === "door" ? (
                                <rect
                                    x={x}
                                    y={y}
                                    width={width}
                                    height={height}
                                    fill="rgba(122, 79, 36, 0.22)"
                                    stroke={COLORS.door}
                                    strokeWidth={1.4}
                                />
                            ) : (
                                <g stroke={COLORS.accent} strokeWidth={1.2}>
                                    <rect
                                        x={x}
                                        y={y}
                                        width={width}
                                        height={height}
                                        fill={COLORS.glass}
                                    />
                                    <line
                                        x1={x + width / 2}
                                        y1={y}
                                        x2={x + width / 2}
                                        y2={y + height}
                                    />
                                </g>
                            )}
                            {width >= 28 && (
                                <text
                                    x={x + width / 2}
                                    y={y - 3}
                                    {...MARK}
                                    fontSize={8}
                                    textAnchor="middle"
                                >
                                    {opening.kind === "door" ? "P" : "V"}
                                </text>
                            )}
                        </g>
                    );
                })}

                {showDimensions &&
                    drawing.marks.map((mark) => (
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

                {showDimensions && (
                    <g stroke={COLORS.accent} fill={COLORS.accent}>
                        <line
                            x1={toX(0)}
                            y1={ground + 40}
                            x2={toX(drawing.width)}
                            y2={ground + 40}
                        />
                        <line x1={toX(0)} y1={ground + 35} x2={toX(0)} y2={ground + 45} />
                        <line
                            x1={toX(drawing.width)}
                            y1={ground + 35}
                            x2={toX(drawing.width)}
                            y2={ground + 45}
                        />
                        <text
                            x={toX(drawing.width / 2)}
                            y={ground + 55}
                            {...MARK}
                            textAnchor="middle"
                            stroke="none"
                        >
                            {drawing.width.toFixed(2).replace(".", ",")} m
                        </text>
                        <line
                            x1={DRAW_LEFT - 28}
                            y1={toY(drawing.height)}
                            x2={DRAW_LEFT - 28}
                            y2={ground}
                        />
                        <line
                            x1={DRAW_LEFT - 33}
                            y1={toY(drawing.height)}
                            x2={DRAW_LEFT - 23}
                            y2={toY(drawing.height)}
                        />
                        <line x1={DRAW_LEFT - 33} y1={ground} x2={DRAW_LEFT - 23} y2={ground} />
                        <text
                            x={DRAW_LEFT - 38}
                            y={(toY(drawing.height) + ground) / 2}
                            {...MARK}
                            textAnchor="middle"
                            transform={`rotate(-90 ${DRAW_LEFT - 38} ${(toY(drawing.height) + ground) / 2})`}
                            stroke="none"
                        >
                            {drawing.height.toFixed(2).replace(".", ",")} m
                        </text>
                    </g>
                )}
                <rect
                    x={DRAW_LEFT - 30}
                    y={VIEW_HEIGHT - 48}
                    width={300}
                    height={36}
                    fill={COLORS.background}
                    stroke={COLORS.muted}
                    strokeWidth={0.8}
                />
                <text
                    x={DRAW_LEFT - 20}
                    y={VIEW_HEIGHT - 33}
                    {...TEXT}
                    fontSize={13}
                    fontWeight={700}
                >
                    {title.toUpperCase()}
                </text>
                <text x={DRAW_LEFT - 20} y={VIEW_HEIGHT - 18} {...MARK} fill={COLORS.muted}>
                    ARQUILA · {sectioned ? "SECCIÓN" : "ELEVACIÓN"} · {fileName}
                </text>
                <rect
                    x={DRAW_LEFT + 300}
                    y={VIEW_HEIGHT - 48}
                    width={280}
                    height={36}
                    fill="none"
                    stroke={COLORS.muted}
                    strokeWidth={0.8}
                />
                <text x={DRAW_LEFT + 310} y={VIEW_HEIGHT - 26} {...MARK}>
                    Ancho {drawing.width.toFixed(2).replace(".", ",")} m · altura{" "}
                    {drawing.height.toFixed(2).replace(".", ",")} m
                </text>
            </svg>
            <div className="diagram-controls" role="group" aria-label="Herramientas de dibujo">
                <button
                    type="button"
                    className="button-secondary"
                    aria-label="Alejar dibujo"
                    disabled={zoom <= 75}
                    onClick={() => setZoom((value) => Math.max(75, value - ZOOM_STEP))}
                >
                    −
                </button>
                <span aria-live="polite">Zoom {zoom} %</span>
                <button
                    type="button"
                    className="button-secondary"
                    aria-label="Acercar dibujo"
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
                    Cotas
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
                            downloadSvg(svg.current, fileName);
                        }
                    }}
                >
                    Descargar dibujo (SVG)
                </button>
                <button
                    type="button"
                    className="button-secondary"
                    onClick={() => {
                        if (svg.current !== null) {
                            printSvg(svg.current, title);
                        }
                    }}
                >
                    Imprimir o guardar como PDF
                </button>
            </div>
        </figure>
    );
}
