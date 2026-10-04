import { useState } from "react";

import type { Terrain } from "../types/api";
import { formatNumber } from "../utils/format";
import { bounds, footprint, type Point } from "../utils/geometry";

const VIEW_WIDTH = 260;
const VIEW_HEIGHT = 190;
const MARGIN = 0.82;
const PITCH = (30 * Math.PI) / 180;
const SIN_PITCH = Math.sin(PITCH);
const COS_PITCH = Math.cos(PITCH);

type LayerId = "surface" | "base" | "boundary" | "measures";

const LAYERS: { id: LayerId; label: string }[] = [
    { id: "surface", label: "Superficie" },
    { id: "base", label: "Plano base" },
    { id: "boundary", label: "Límites" },
    { id: "measures", label: "Medidas" },
];

const ALL_VISIBLE: Record<LayerId, boolean> = {
    surface: true,
    base: true,
    boundary: true,
    measures: true,
};

interface Vertex extends Point {
    z: number;
}

export function Terrain3D({ terrain }: { terrain: Terrain }) {
    const [yaw, setYaw] = useState(35);
    const [visible, setVisible] = useState(ALL_VISIBLE);
    const shape = footprint(terrain);

    if (shape === null) {
        return (
            <div className="diagram">
                <h3>Vista 3D</h3>
                <p className="message">Faltan el ancho y el largo, o los vértices del lote.</p>
            </div>
        );
    }

    const box = bounds(shape);
    const centerX = (box.minX + box.maxX) / 2;
    const centerY = (box.minY + box.maxY) / 2;
    const slope = terrain.slope_percent ?? 0;
    const vertices: Vertex[] = shape.map((point) => ({
        x: point.x - centerX,
        y: point.y - centerY,
        z: ((point.y - box.minY) * slope) / 100,
    }));
    const radius = Math.max(...vertices.map((vertex) => Math.hypot(vertex.x, vertex.y)));
    const maxHeight = Math.max(...vertices.map((vertex) => vertex.z));
    const scale =
        MARGIN *
        Math.min(
            VIEW_WIDTH / 2 / radius,
            VIEW_HEIGHT / (2 * radius * SIN_PITCH + maxHeight * COS_PITCH),
        );
    const angle = (yaw * Math.PI) / 180;
    const originX = VIEW_WIDTH / 2;
    const originY = VIEW_HEIGHT / 2 + (maxHeight * COS_PITCH * scale) / 2;

    function project(vertex: Vertex, height: number): [number, number] {
        const rotatedX = vertex.x * Math.cos(angle) - vertex.y * Math.sin(angle);
        const rotatedY = vertex.x * Math.sin(angle) + vertex.y * Math.cos(angle);

        return [
            originX + rotatedX * scale,
            originY - (rotatedY * SIN_PITCH + height * COS_PITCH) * scale,
        ];
    }

    const basePoints = vertices.map((vertex) => project(vertex, 0));
    const surfacePoints = vertices.map((vertex) => project(vertex, vertex.z));
    const toPath = (points: [number, number][]) =>
        points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
    const highest = vertices.reduce(
        (best, vertex, index) => (vertex.z > vertices[best].z ? index : best),
        0,
    );

    return (
        <div className="diagram">
            <h3>Vista 3D</h3>
            <svg
                viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
                role="img"
                aria-label={`Vista en tres dimensiones de ${terrain.name}, girada ${yaw} grados, con un desnivel máximo de ${formatNumber(maxHeight)} metros`}
            >
                {visible.base && <polygon className="diagram-base" points={toPath(basePoints)} />}
                {visible.boundary &&
                    vertices.map((vertex, index) => (
                        <line
                            key={index}
                            className="diagram-edge"
                            x1={basePoints[index][0]}
                            y1={basePoints[index][1]}
                            x2={surfacePoints[index][0]}
                            y2={surfacePoints[index][1]}
                        />
                    ))}
                {visible.surface && (
                    <polygon className="diagram-terrain" points={toPath(surfacePoints)} />
                )}
                {visible.boundary && (
                    <polygon className="diagram-outline" points={toPath(surfacePoints)} />
                )}
                {visible.measures && (
                    <>
                        <text
                            className="diagram-label"
                            x={surfacePoints[highest][0]}
                            y={surfacePoints[highest][1] - 6}
                            textAnchor="middle"
                        >
                            +{formatNumber(maxHeight)} m
                        </text>
                        <text
                            className="diagram-note"
                            x={VIEW_WIDTH / 2}
                            y={VIEW_HEIGHT - 8}
                            textAnchor="middle"
                        >
                            {formatNumber(box.maxX - box.minX)} ×{" "}
                            {formatNumber(box.maxY - box.minY)} m · {formatNumber(terrain.area_m2)}{" "}
                            m²
                        </text>
                    </>
                )}
            </svg>
            <div className="diagram-controls">
                <label>
                    Giro: {yaw}°
                    <input
                        type="range"
                        min="0"
                        max="360"
                        step="5"
                        value={yaw}
                        onChange={(event) => setYaw(Number(event.target.value))}
                    />
                </label>
                <fieldset>
                    <legend>Capas</legend>
                    {LAYERS.map((layer) => (
                        <label key={layer.id} className="checkbox">
                            <input
                                type="checkbox"
                                checked={visible[layer.id]}
                                onChange={(event) =>
                                    setVisible((current) => ({
                                        ...current,
                                        [layer.id]: event.target.checked,
                                    }))
                                }
                            />
                            {layer.label}
                        </label>
                    ))}
                </fieldset>
            </div>
        </div>
    );
}
