import { useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";

import { formatNumber } from "../utils/format";

const ZOOM_STEP = 1.25;
const MIN_ZOOM = 1;
const MAX_ZOOM = 8;
const PAN_STEP_PX = 40;

interface Point {
    x: number;
    y: number;
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
 * Technical viewer for a generated plan: zoom, pan and a two-point measurement. It reads the
 * drawing; it is not a drawing editor.
 */
export function PlanViewport({ width, height, unitsPerMetre, children }: PlanViewportProps) {
    const sheet = useRef<HTMLDivElement>(null);
    const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);
    const [zoom, setZoom] = useState(1);
    const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
    const [measuring, setMeasuring] = useState(false);
    const [points, setPoints] = useState<Point[]>([]);

    function zoomBy(factor: number) {
        setZoom((current) => {
            const next = Math.min(Math.max(current * factor, MIN_ZOOM), MAX_ZOOM);

            if (next === MIN_ZOOM) {
                setOffset({ x: 0, y: 0 });
            }

            return next;
        });
    }

    function reset() {
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
                <button type="button" className="button-secondary" onClick={reset}>
                    Ajustar
                </button>
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
                <span className="plan-readout" role="status">
                    {!measuring && "Arrastra para desplazar el plano cuando esté ampliado."}
                    {measuring && distance === null && "Marca dos puntos del plano."}
                    {measuring && distance !== null && `Distancia: ${formatNumber(distance)} m`}
                </span>
            </div>
            <div
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
                    style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})` }}
                >
                    {children}
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
                                <circle key={index} cx={point.x} cy={point.y} r={4 / zoom + 1} />
                            ))}
                        </svg>
                    )}
                </div>
            </div>
        </div>
    );
}
