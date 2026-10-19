import {
    useEffect,
    useRef,
    useState,
    type KeyboardEvent,
    type PointerEvent,
    type ReactNode,
} from "react";

import { formatNumber } from "../utils/format";

const ZOOM_STEP = 1.25;
const MIN_ZOOM = 1;
const MAX_ZOOM = 8;
const PAN_STEP_PX = 40;
/** Lengths a tick of the rulers or the scale bar may take, in metres. */
const NICE_METRES = [0.25, 0.5, 1, 2, 5, 10, 20, 50, 100];
const RULER_PX = 24;

interface Point {
    x: number;
    y: number;
}

/** The smallest of the round lengths that is at least `minPx` long on screen. */
export function niceLength(pxPerMetre: number, minPx: number): number {
    return (
        NICE_METRES.find((metres) => metres * pxPerMetre >= minPx) ??
        NICE_METRES[NICE_METRES.length - 1]
    );
}

interface PlanViewportProps {
    /** Size of the drawing in its own units (the SVG viewBox). */
    width: number;
    height: number;
    /** Drawing units that one metre takes, so a measured line can be given in metres. */
    unitsPerMetre: number;
    /** The drawing itself. It is not edited here: the viewport only looks at it. */
    children: ReactNode;
}

/**
 * Technical viewer for a generated drawing: zoom, pan, rulers and a grid in metres, a scale bar
 * that follows the zoom, a two-point measurement and «Centrar». It reads the drawing; it is not
 * a drawing editor.
 */
export function PlanViewport({ width, height, unitsPerMetre, children }: PlanViewportProps) {
    const stage = useRef<HTMLDivElement>(null);
    const sheet = useRef<HTMLDivElement>(null);
    const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);
    const [zoom, setZoom] = useState(1);
    const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
    const [measuring, setMeasuring] = useState(false);
    const [points, setPoints] = useState<Point[]>([]);
    const [grid, setGrid] = useState(true);
    const [rulers, setRulers] = useState(true);
    const [stageWidth, setStageWidth] = useState(0);

    // The rulers and the scale bar are drawn in screen pixels, so they need the stage's width.
    useEffect(() => {
        const node = stage.current;

        if (node === null) {
            return;
        }

        const measure = () => setStageWidth(node.clientWidth);

        measure();

        if (typeof ResizeObserver === "undefined") {
            return;
        }

        const observer = new ResizeObserver(measure);

        observer.observe(node);

        return () => observer.disconnect();
    }, []);

    function zoomBy(factor: number) {
        setZoom((current) => {
            const next = Math.min(Math.max(current * factor, MIN_ZOOM), MAX_ZOOM);

            if (next === MIN_ZOOM) {
                setOffset({ x: 0, y: 0 });
            }

            return next;
        });
    }

    function centre() {
        setZoom(1);
        setOffset({ x: 0, y: 0 });
    }

    function toDrawing(event: PointerEvent): Point | null {
        const box = sheet.current?.getBoundingClientRect();

        if (box === undefined || box.width === 0) {
            return null;
        }

        return {
            x: ((event.clientX - box.left) / box.width) * width,
            y: ((event.clientY - box.top) / box.height) * height,
        };
    }

    function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
        drag.current = { x: event.clientX, y: event.clientY, moved: false };
    }

    function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
        const start = drag.current;

        if (start === null || measuring || zoom === 1) {
            return;
        }

        const dx = event.clientX - start.x;
        const dy = event.clientY - start.y;

        if (dx !== 0 || dy !== 0) {
            drag.current = { x: event.clientX, y: event.clientY, moved: true };
            setOffset((current) => ({ x: current.x + dx, y: current.y + dy }));
        }
    }

    function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
        const moved = drag.current?.moved === true;

        drag.current = null;

        if (!measuring || moved) {
            return;
        }

        const point = toDrawing(event);

        if (point !== null) {
            setPoints((current) => (current.length === 2 ? [point] : [...current, point]));
        }
    }

    function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
        const moves: Record<string, Point> = {
            ArrowLeft: { x: PAN_STEP_PX, y: 0 },
            ArrowRight: { x: -PAN_STEP_PX, y: 0 },
            ArrowUp: { x: 0, y: PAN_STEP_PX },
            ArrowDown: { x: 0, y: -PAN_STEP_PX },
        };
        const move = moves[event.key];

        if (move !== undefined && zoom > 1) {
            event.preventDefault();
            setOffset((current) => ({ x: current.x + move.x, y: current.y + move.y }));
        } else if (event.key === "+" || event.key === "-") {
            event.preventDefault();
            zoomBy(event.key === "+" ? ZOOM_STEP : 1 / ZOOM_STEP);
        }
    }

    const [first, second] = points;
    const distance =
        second === undefined
            ? null
            : Math.hypot(second.x - first.x, second.y - first.y) / unitsPerMetre;

    // Screen geometry: the sheet is the stage's width at zoom 1 and scales from its centre.
    const base = stageWidth / width;
    const sheetHeight = height * base;
    const pxPerMetre = unitsPerMetre * base * zoom;
    const screenX = (units: number) =>
        stageWidth / 2 + offset.x + (units * base - stageWidth / 2) * zoom;
    const screenY = (units: number) =>
        sheetHeight / 2 + offset.y + (units * base - sheetHeight / 2) * zoom;
    const tick = niceLength(pxPerMetre, 56);
    const ticksX: number[] = [];
    const ticksY: number[] = [];

    if (rulers && pxPerMetre > 0) {
        for (let metres = 0; metres * unitsPerMetre <= width; metres += tick) {
            ticksX.push(metres);
        }

        for (let metres = 0; metres * unitsPerMetre <= height; metres += tick) {
            ticksY.push(metres);
        }
    }

    // A grid line every metre, or every five when one metre is too small to read on screen.
    const gridMetres = pxPerMetre >= 8 ? 1 : 5;
    const gridStep = gridMetres * unitsPerMetre;
    const bar = niceLength(pxPerMetre, 64);

    return (
        <div className="plan-viewport">
            <div className="plan-tools" role="toolbar" aria-label="Herramientas del plano">
                <button
                    type="button"
                    className="button-secondary"
                    aria-label="Alejar el plano"
                    disabled={zoom <= MIN_ZOOM}
                    onClick={() => zoomBy(1 / ZOOM_STEP)}
                >
                    −
                </button>
                <output className="numeric" aria-label="Zoom del plano">
                    {Math.round(zoom * 100)} %
                </output>
                <button
                    type="button"
                    className="button-secondary"
                    aria-label="Acercar el plano"
                    disabled={zoom >= MAX_ZOOM}
                    onClick={() => zoomBy(ZOOM_STEP)}
                >
                    +
                </button>
                <button type="button" className="button-secondary" onClick={centre}>
                    Centrar plano
                </button>
                <span className="plan-tools-divider" aria-hidden="true" />
                <button
                    type="button"
                    className="button-secondary"
                    aria-pressed={measuring}
                    onClick={() => {
                        setMeasuring(!measuring);
                        setPoints([]);
                    }}
                >
                    Medir
                </button>
                <button
                    type="button"
                    className="button-secondary"
                    aria-pressed={grid}
                    title={`Una línea cada ${gridMetres} m`}
                    onClick={() => setGrid(!grid)}
                >
                    Cuadrícula
                </button>
                <button
                    type="button"
                    className="button-secondary"
                    aria-pressed={rulers}
                    title="Reglas en metros desde el borde de la lámina"
                    onClick={() => setRulers(!rulers)}
                >
                    Reglas
                </button>
                <span className="plan-readout" role="status">
                    {!measuring && "Arrastra para desplazar el plano cuando esté ampliado."}
                    {measuring && distance === null && "Marca dos puntos del plano."}
                    {measuring && distance !== null && `Distancia: ${formatNumber(distance)} m`}
                </span>
            </div>
            <div className={rulers ? "plan-frame plan-frame-rulers" : "plan-frame"}>
                {rulers && (
                    <>
                        <svg
                            className="plan-ruler plan-ruler-x"
                            aria-hidden="true"
                            height={RULER_PX}
                        >
                            {ticksX.map((metres) => {
                                const x = screenX(metres * unitsPerMetre);

                                return (
                                    <g key={metres}>
                                        <line x1={x} x2={x} y1={RULER_PX - 8} y2={RULER_PX} />
                                        <text x={x + 3} y={13}>
                                            {formatNumber(metres)}
                                        </text>
                                    </g>
                                );
                            })}
                        </svg>
                        <svg
                            className="plan-ruler plan-ruler-y"
                            aria-hidden="true"
                            width={RULER_PX}
                        >
                            {ticksY.map((metres) => {
                                const y = screenY(metres * unitsPerMetre);

                                return (
                                    <g key={metres}>
                                        <line x1={RULER_PX - 8} x2={RULER_PX} y1={y} y2={y} />
                                        <text x={3} y={y + 13}>
                                            {formatNumber(metres)}
                                        </text>
                                    </g>
                                );
                            })}
                        </svg>
                        <span className="plan-ruler-unit" aria-hidden="true">
                            m
                        </span>
                    </>
                )}
                <div
                    ref={stage}
                    className={measuring ? "plan-stage plan-stage-measuring" : "plan-stage"}
                    tabIndex={0}
                    aria-label="Plano; usa las flechas para desplazarlo y + o − para el zoom"
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={() => (drag.current = null)}
                    onKeyDown={handleKeyDown}
                >
                    <div
                        ref={sheet}
                        className="plan-sheet"
                        style={{
                            transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                        }}
                    >
                        {children}
                        {grid && (
                            <svg
                                className="plan-grid"
                                viewBox={`0 0 ${width} ${height}`}
                                aria-hidden="true"
                            >
                                {Array.from(
                                    { length: Math.floor(width / gridStep) + 1 },
                                    (_, index) => (
                                        <line
                                            key={`x${index}`}
                                            x1={index * gridStep}
                                            x2={index * gridStep}
                                            y1={0}
                                            y2={height}
                                        />
                                    ),
                                )}
                                {Array.from(
                                    { length: Math.floor(height / gridStep) + 1 },
                                    (_, index) => (
                                        <line
                                            key={`y${index}`}
                                            x1={0}
                                            x2={width}
                                            y1={index * gridStep}
                                            y2={index * gridStep}
                                        />
                                    ),
                                )}
                            </svg>
                        )}
                        {points.length > 0 && (
                            <svg
                                className="plan-measure"
                                viewBox={`0 0 ${width} ${height}`}
                                aria-hidden="true"
                            >
                                {second !== undefined && (
                                    <line x1={first.x} y1={first.y} x2={second.x} y2={second.y} />
                                )}
                                {points.map((point, index) => (
                                    <circle
                                        key={index}
                                        cx={point.x}
                                        cy={point.y}
                                        r={4 / zoom + 1}
                                    />
                                ))}
                            </svg>
                        )}
                    </div>
                    {pxPerMetre > 0 && (
                        <div
                            className="plan-scale"
                            role="img"
                            aria-label={`Escala gráfica: ${formatNumber(bar)} m`}
                        >
                            <span style={{ width: `${bar * pxPerMetre}px` }} />
                            {formatNumber(bar)} m
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
