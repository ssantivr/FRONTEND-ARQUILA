import type { Terrain } from "../types/api";
import { formatNumber } from "../utils/format";
import {
    bounds,
    contourLevels,
    contourStep,
    footprint,
    frontElevation,
} from "../utils/geometry";
import { Terrain3D } from "./Terrain3D";

const VIEW_WIDTH = 260;
const VIEW_HEIGHT = 190;
const DRAW_WIDTH = 190;
const DRAW_HEIGHT = 120;
const LEFT = 50;
const TOP = 30;

export function profileLength(terrain: Terrain): number | null {
    const shape = footprint(terrain);

    if (terrain.points.length >= 3 && shape !== null) {
        const box = bounds(shape);
        return box.maxY - box.minY;
    }

    return terrain.length_m;
}

export function TerrainDiagrams({ terrain }: { terrain: Terrain }) {
    return (
        <figure className="terrain-diagrams">
            <figcaption>{terrain.name}</figcaption>
            <div className="diagram-row">
                <TopView terrain={terrain} />
                <ContourMap terrain={terrain} />
                <FrontView terrain={terrain} />
                <Profile terrain={terrain} />
                <Terrain3D terrain={terrain} />
            </div>
        </figure>
    );
}

function TopView({ terrain }: { terrain: Terrain }) {
    const shape = footprint(terrain);

    if (shape === null) {
        return (
            <Missing
                title="Vista superior"
                text="Faltan el ancho y el largo, o los vértices del lote."
            />
        );
    }

    const box = bounds(shape);
    const width = box.maxX - box.minX;
    const height = box.maxY - box.minY;
    const scale = Math.min(DRAW_WIDTH / width, DRAW_HEIGHT / height);
    const x = LEFT + (DRAW_WIDTH - width * scale) / 2;
    const y = TOP + (DRAW_HEIGHT - height * scale) / 2;
    const outline = shape
        .map(
            (point) =>
                `${x + (point.x - box.minX) * scale},${y + (box.maxY - point.y) * scale}`,
        )
        .join(" ");

    return (
        <div className="diagram">
            <h3>Vista superior</h3>
            <svg
                viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
                role="img"
                aria-label={`Vista superior de ${terrain.name}: ${formatNumber(width)} metros de ancho por ${formatNumber(height)} metros de largo`}
            >
                <polygon className="diagram-lot" points={outline} />
                <text
                    className="diagram-label"
                    x={x + (width * scale) / 2}
                    y={y - 8}
                    textAnchor="middle"
                >
                    {formatNumber(width)} m
                </text>
                <text
                    className="diagram-label"
                    x={x - 8}
                    y={y + (height * scale) / 2}
                    textAnchor="end"
                    dominantBaseline="middle"
                >
                    {formatNumber(height)} m
                </text>
                <text
                    className="diagram-note"
                    x={VIEW_WIDTH / 2}
                    y={VIEW_HEIGHT - 8}
                    textAnchor="middle"
                >
                    Área: {formatNumber(terrain.area_m2)} m²
                </text>
            </svg>
        </div>
    );
}

function ContourMap({ terrain }: { terrain: Terrain }) {
    const shape = footprint(terrain);
    const slope = terrain.slope_percent;

    if (shape === null || slope === null) {
        return (
            <Missing
                title="Curvas de nivel"
                text="Faltan las medidas del lote o la pendiente del terreno."
            />
        );
    }

    const box = bounds(shape);
    const width = box.maxX - box.minX;
    const height = box.maxY - box.minY;
    const rise = (height * slope) / 100;
    const levels = contourLevels(rise);
    const scale = Math.min(DRAW_WIDTH / width, DRAW_HEIGHT / height);
    const x = LEFT - 20 + (DRAW_WIDTH - width * scale) / 2;
    const y = TOP + (DRAW_HEIGHT - height * scale) / 2;
    const right = x + width * scale;
    const levelY = (level: number) =>
        y + (height - (slope > 0 ? (level * 100) / slope : 0)) * scale;
    const edgesOfBands = [0, ...levels, rise].map(levelY);
    const clipId = `contour-clip-${terrain.id}`;
    const outline = shape
        .map((point) => `${x + (point.x - box.minX) * scale},${y + (box.maxY - point.y) * scale}`)
        .join(" ");

    return (
        <div className="diagram">
            <h3>Curvas de nivel</h3>
            <svg
                viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
                role="img"
                aria-label={`Curvas de nivel de ${terrain.name}: el terreno sube ${formatNumber(rise)} metros desde el frente hasta el fondo`}
            >
                <clipPath id={clipId}>
                    <polygon points={outline} />
                </clipPath>
                <g clipPath={`url(#${clipId})`}>
                    {edgesOfBands.slice(0, -1).map((bottom, index) => (
                        <rect
                            key={index}
                            className="diagram-band"
                            x={x}
                            y={edgesOfBands[index + 1]}
                            width={width * scale}
                            height={bottom - edgesOfBands[index + 1]}
                            fillOpacity={0.1 + (0.5 * index) / Math.max(1, levels.length)}
                        />
                    ))}
                    {levels.map((level) => (
                        <line
                            key={level}
                            className="diagram-contour"
                            x1={x}
                            y1={levelY(level)}
                            x2={right}
                            y2={levelY(level)}
                        />
                    ))}
                </g>
                <polygon className="diagram-outline" points={outline} />
                {levels.map((level) => (
                    <text
                        key={level}
                        className="diagram-label"
                        x={right + 6}
                        y={levelY(level)}
                        dominantBaseline="middle"
                    >
                        +{formatNumber(level)} m
                    </text>
                ))}
                <text
                    className="diagram-note"
                    x={VIEW_WIDTH / 2}
                    y={VIEW_HEIGHT - 8}
                    textAnchor="middle"
                >
                    {levels.length === 0
                        ? `Desnivel de ${formatNumber(rise)} m: casi plano`
                        : `Una curva cada ${formatNumber(contourStep(rise))} m · más alto hacia el fondo`}
                </text>
            </svg>
        </div>
    );
}

function FrontView({ terrain }: { terrain: Terrain }) {
    const shape = footprint(terrain);
    const slope = terrain.slope_percent;

    if (shape === null || slope === null) {
        return (
            <Missing
                title="Vista frontal"
                text="Faltan las medidas del lote o la pendiente del terreno."
            />
        );
    }

    const outline = frontElevation(shape, slope);
    const box = bounds(outline);
    const width = box.maxX - box.minX;
    const rise = box.maxY;
    const scale = Math.min(DRAW_WIDTH / width, rise > 0 ? DRAW_HEIGHT / rise : Infinity);
    const startX = LEFT - 20 + (DRAW_WIDTH - width * scale) / 2;
    const endX = startX + width * scale;
    const baseY = TOP + DRAW_HEIGHT;
    const points = outline
        .map((point) => `${startX + (point.x - box.minX) * scale},${baseY - point.y * scale}`)
        .join(" ");

    return (
        <div className="diagram">
            <h3>Vista frontal</h3>
            <svg
                viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
                role="img"
                aria-label={`Vista frontal de ${terrain.name}: ${formatNumber(width)} metros de ancho, el fondo queda ${formatNumber(rise)} metros más alto que el frente`}
            >
                <polygon className="diagram-front" points={points} />
                <line className="diagram-edge" x1={startX} y1={baseY} x2={endX} y2={baseY} />
                <text
                    className="diagram-label"
                    x={endX + 6}
                    y={baseY - (rise * scale) / 2}
                    dominantBaseline="middle"
                >
                    {formatNumber(rise)} m
                </text>
                <text
                    className="diagram-label"
                    x={(startX + endX) / 2}
                    y={baseY + 16}
                    textAnchor="middle"
                >
                    {formatNumber(width)} m
                </text>
                <text
                    className="diagram-note"
                    x={VIEW_WIDTH / 2}
                    y={VIEW_HEIGHT - 8}
                    textAnchor="middle"
                >
                    Visto desde el frente, el lado más bajo
                </text>
            </svg>
        </div>
    );
}

function Profile({ terrain }: { terrain: Terrain }) {
    const length = profileLength(terrain);
    const slope = terrain.slope_percent;

    if (length === null || slope === null) {
        return (
            <Missing title="Vista lateral" text="Falta el largo o la pendiente del terreno." />
        );
    }

    const rise = (length * slope) / 100;
    const scale = Math.min(DRAW_WIDTH / length, rise > 0 ? DRAW_HEIGHT / rise : Infinity);
    const startX = LEFT - 20;
    const endX = startX + length * scale;
    const baseY = TOP + DRAW_HEIGHT;
    const topY = baseY - rise * scale;

    return (
        <div className="diagram">
            <h3>Vista lateral</h3>
            <svg
                viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
                role="img"
                aria-label={`Vista lateral de ${terrain.name}: pendiente de ${formatNumber(slope)} por ciento, desnivel de ${formatNumber(rise)} metros en ${formatNumber(length)} metros`}
            >
                <polygon
                    className="diagram-ground"
                    points={`${startX},${baseY} ${endX},${baseY} ${endX},${topY}`}
                />
                <line className="diagram-surface" x1={startX} y1={baseY} x2={endX} y2={topY} />
                <text className="diagram-label" x={startX} y={TOP - 10}>
                    Pendiente {formatNumber(slope)} %
                </text>
                <text
                    className="diagram-label"
                    x={endX + 6}
                    y={(baseY + topY) / 2}
                    dominantBaseline="middle"
                >
                    {formatNumber(rise)} m
                </text>
                <text
                    className="diagram-label"
                    x={(startX + endX) / 2}
                    y={baseY + 16}
                    textAnchor="middle"
                >
                    {formatNumber(length)} m
                </text>
                <text
                    className="diagram-note"
                    x={VIEW_WIDTH / 2}
                    y={VIEW_HEIGHT - 8}
                    textAnchor="middle"
                >
                    Pendiente asumida a lo largo del terreno
                </text>
            </svg>
        </div>
    );
}

function Missing({ title, text }: { title: string; text: string }) {
    return (
        <div className="diagram">
            <h3>{title}</h3>
            <p className="message">{text}</p>
        </div>
    );
}
