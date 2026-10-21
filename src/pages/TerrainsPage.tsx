import { useState } from "react";

import { AsyncStatus } from "../components/AsyncStatus";
import { TerrainSituation, hasCoordinates } from "../components/TerrainSituation";
import { Button } from "../components/ui/Button";
import { FilterBar } from "../components/ui/FilterBar";
import { Skeleton } from "../components/ui/Skeleton";
import { useAsync } from "../hooks/useAsync";
import { loadAcrossProjects, terrainsApi } from "../services/api";
import { readSiteSettings } from "../state/siteSettings";
import type { Terrain } from "../types/api";
import { formatNumber } from "../utils/format";
import { bounds, edges, footprint } from "../utils/geometry";

type Order = "name" | "area" | "slope";

/**
 * Figures that follow from what the terrain records, with the same rules as its diagrams: the
 * perimeter and sides from its outline, and the drop as depth × slope (FRONTEND.md, «Esquemas del
 * terreno»). Nothing here is stored or guessed.
 */
function measures(terrain: Terrain) {
    const outline = footprint(terrain);

    if (outline === null) {
        return null;
    }

    const sides = edges(outline).map((edge) => edge.length);
    const box = bounds(outline);
    const depth = box.maxY - box.minY;

    return {
        sides,
        perimeter: sides.reduce((sum, side) => sum + side, 0),
        width: box.maxX - box.minX,
        depth,
        drop: terrain.slope_percent === null ? null : (depth * terrain.slope_percent) / 100,
        fromVertices: terrain.points.length >= 3,
    };
}

/** Where north points on the site plan of this terrain, if the user set it in this browser. */
function northOf(terrain: Terrain): number | null {
    return readSiteSettings(terrain.project_id).terrains[terrain.id]?.north ?? null;
}

interface TerrainsPageProps {
    onOpenProject: (projectId: number) => void;
}

const SHAPE_SIZE = 100;
const SHAPE_MARGIN = 10;

function describeShape(terrain: Terrain): string {
    if (terrain.points.length >= 3) {
        return `${terrain.points.length} vértices`;
    }

    if (terrain.width_m !== null && terrain.length_m !== null) {
        return `${formatNumber(terrain.width_m)} × ${formatNumber(terrain.length_m)} m`;
    }

    return "—";
}

/** The lot's own outline, from its vertices or its width and length; nothing when neither exists. */
function outlineOf(terrain: Terrain): [number, number][] {
    if (terrain.points.length >= 3) {
        return terrain.points.map((point) => [point.x_m, point.y_m]);
    }

    if (terrain.width_m !== null && terrain.length_m !== null) {
        return [
            [0, 0],
            [terrain.width_m, 0],
            [terrain.width_m, terrain.length_m],
            [0, terrain.length_m],
        ];
    }

    return [];
}

function TerrainShape({ terrain }: { terrain: Terrain }) {
    const outline = outlineOf(terrain);

    if (outline.length === 0) {
        return <span className="terrain-shape terrain-shape-empty">Sin medidas</span>;
    }

    const xs = outline.map(([x]) => x);
    const ys = outline.map(([, y]) => y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const span = Math.max(Math.max(...xs) - minX, Math.max(...ys) - minY, 1e-6);
    const scale = (SHAPE_SIZE - SHAPE_MARGIN * 2) / span;
    // Plan coordinates grow upwards; the drawing grows downwards.
    const points = outline
        .map(
            ([x, y]) =>
                `${SHAPE_MARGIN + (x - minX) * scale},${SHAPE_SIZE - SHAPE_MARGIN - (y - minY) * scale}`,
        )
        .join(" ");

    return (
        <svg
            className="terrain-shape"
            viewBox={`0 0 ${SHAPE_SIZE} ${SHAPE_SIZE}`}
            aria-hidden="true"
        >
            <polygon className="diagram-lot" points={points} />
        </svg>
    );
}

export function TerrainsPage({ onOpenProject }: TerrainsPageProps) {
    const data = useAsync(() => loadAcrossProjects(terrainsApi.listByProject), []);
    const [query, setQuery] = useState("");
    const [projectId, setProjectId] = useState("");
    const [soil, setSoil] = useState("");
    const [onlyLocated, setOnlyLocated] = useState(false);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [order, setOrder] = useState<Order>("name");
    const terrains = data.data?.items ?? [];
    const projects = data.data?.projects ?? [];
    const projectNames = new Map(projects.map((item) => [item.id, item.name]));
    const projectPlaces = new Map(projects.map((item) => [item.id, item.location]));
    const soils = [...new Set(terrains.flatMap((terrain) => terrain.soil_type ?? []))].sort();
    const totalArea = terrains.reduce((sum, terrain) => sum + terrain.area_m2, 0);
    const slopes = terrains.flatMap((terrain) =>
        terrain.slope_percent === null ? [] : [terrain.slope_percent],
    );
    const steepest = slopes.length === 0 ? null : Math.max(...slopes);
    const wanted = query.trim().toLowerCase();
    const located = terrains.filter(hasCoordinates).length;
    const filtered = wanted !== "" || projectId !== "" || soil !== "" || onlyLocated;
    const shown = terrains
        .filter(
            (terrain) =>
                (wanted === "" || terrain.name.toLowerCase().includes(wanted)) &&
                (projectId === "" || terrain.project_id === Number(projectId)) &&
                (soil === "" || terrain.soil_type === soil) &&
                (!onlyLocated || hasCoordinates(terrain)),
        )
        .sort((first, second) =>
            order === "area"
                ? second.area_m2 - first.area_m2
                : order === "slope"
                  ? // Terrains without a slope go last, not first as if they were flat.
                    (second.slope_percent ?? -Infinity) - (first.slope_percent ?? -Infinity)
                  : first.name.localeCompare(second.name, "es"),
        );
    // On a wide screen the panel always shows a terrain: the chosen one, or the first of the list.
    // On a narrow one it is a sheet that only opens for a terrain the user chose.
    const chosen = shown.find((terrain) => terrain.id === selectedId) ?? null;
    const selected = chosen ?? shown[0] ?? null;
    // While the first answer is on its way the screen already has its final shape (figures,
    // filters, list and detail), with placeholders, so nothing jumps when the terrains arrive.
    const arriving = data.loading && data.data === null && data.error === null;

    return (
        <>
            <header className="page-head">
                <div>
                    <h2>
                        {data.data === null
                            ? "Terrenos"
                            : terrains.length === 1
                              ? "1 terreno"
                              : `${formatNumber(terrains.length)} terrenos`}
                    </h2>
                    <p className="page-head-meta">
                        De todos tus proyectos · se editan desde su proyecto
                    </p>
                </div>
                {(arriving || terrains.length > 0) && (
                    <dl className="stat-strip" aria-busy={arriving || undefined}>
                        <div>
                            <dt>Área total</dt>
                            <dd>{arriving ? "—" : `${formatNumber(totalArea)} m²`}</dd>
                        </div>
                        <div>
                            <dt>Pendiente máxima</dt>
                            <dd>{steepest === null ? "—" : `${formatNumber(steepest)} %`}</dd>
                        </div>
                        <div>
                            <dt>Con pendiente registrada</dt>
                            <dd>{arriving ? "—" : `${slopes.length} de ${terrains.length}`}</dd>
                        </div>
                        <div>
                            <dt>Con coordenadas</dt>
                            <dd>{arriving ? "—" : `${located} de ${terrains.length}`}</dd>
                        </div>
                    </dl>
                )}
            </header>

            <section className="list-section" aria-label="Fichas de terrenos">
                {(arriving || terrains.length > 0) && (
                    <FilterBar
                        searchLabel="Buscar terreno por nombre"
                        search={query}
                        onSearch={setQuery}
                        resultText={
                            filtered
                                ? shown.length === 1
                                    ? "1 resultado"
                                    : `${shown.length} resultados`
                                : undefined
                        }
                    >
                        <select
                            aria-label="Filtrar por proyecto"
                            disabled={arriving}
                            value={projectId}
                            onChange={(event) => setProjectId(event.target.value)}
                        >
                            <option value="">Todos los proyectos</option>
                            {projects.map((project) => (
                                <option key={project.id} value={project.id}>
                                    {project.name}
                                </option>
                            ))}
                        </select>
                        {soils.length > 0 && (
                            <select
                                aria-label="Filtrar por tipo de suelo"
                                value={soil}
                                onChange={(event) => setSoil(event.target.value)}
                            >
                                <option value="">Todos los suelos</option>
                                {soils.map((name) => (
                                    <option key={name} value={name}>
                                        {name}
                                    </option>
                                ))}
                            </select>
                        )}
                        {located > 0 && (
                            <label className="checkbox">
                                <input
                                    type="checkbox"
                                    checked={onlyLocated}
                                    onChange={(event) => setOnlyLocated(event.target.checked)}
                                />
                                Solo con coordenadas
                            </label>
                        )}
                        <select
                            aria-label="Ordenar terrenos"
                            disabled={arriving}
                            value={order}
                            onChange={(event) => setOrder(event.target.value as Order)}
                        >
                            <option value="name">Por nombre</option>
                            <option value="area">Mayor área primero</option>
                            <option value="slope">Mayor pendiente primero</option>
                        </select>
                    </FilterBar>
                )}
                {arriving && (
                    <div className="terrain-layout terrain-layout-open">
                        <Skeleton shape="cards" label="Cargando los terrenos…" />
                        <aside className="terrain-detail" aria-hidden="true">
                            <Skeleton shape="lines" count={6} label="" />
                        </aside>
                    </div>
                )}
                <AsyncStatus
                    loading={data.loading}
                    error={data.error}
                    onRetry={data.reload}
                    isEmpty={terrains.length === 0 && !arriving}
                    skeleton="cards"
                    emptyTitle="Todavía no hay terrenos"
                    emptyText="Se registran en la pestaña Terreno de cada proyecto y aparecen aquí todos juntos."
                />
                {terrains.length > 0 && shown.length === 0 && (
                    <div className="empty-state">
                        <p className="empty-title">Ningún terreno coincide</p>
                        <p className="message" role="status">
                            Ningún terreno coincide con el filtro.
                        </p>
                        <button
                            type="button"
                            className="button-secondary"
                            onClick={() => {
                                setQuery("");
                                setProjectId("");
                                setSoil("");
                                setOnlyLocated(false);
                            }}
                        >
                            Quitar los filtros
                        </button>
                    </div>
                )}
                <TerrainSituation
                    terrains={shown}
                    selectedId={selected?.id ?? null}
                    onSelect={setSelectedId}
                />
                <div
                    className={
                        selected === null ? "terrain-layout" : "terrain-layout terrain-layout-open"
                    }
                >
                    <ul className="terrain-list">
                        {shown.map((terrain) => (
                            <li key={terrain.id}>
                                <button
                                    type="button"
                                    className="card terrain-card"
                                    aria-pressed={terrain.id === selected?.id}
                                    onClick={() => setSelectedId(terrain.id)}
                                >
                                    <TerrainShape terrain={terrain} />
                                    <span className="card-title">{terrain.name}</span>
                                    <span className="card-subtitle">
                                        {projectNames.get(terrain.project_id) ?? "—"}
                                    </span>
                                    <span className="card-subtitle terrain-card-figures">
                                        {formatNumber(terrain.area_m2)} m² ·{" "}
                                        {describeShape(terrain)}
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                    {selected !== null && (
                        <aside
                            className={
                                chosen === null
                                    ? "terrain-detail"
                                    : "terrain-detail terrain-detail-chosen"
                            }
                            aria-label={`Detalle de ${selected.name}`}
                        >
                            <header className="terrain-detail-head">
                                <div>
                                    <h3>{selected.name}</h3>
                                    <p>{projectNames.get(selected.project_id) ?? "—"}</p>
                                </div>
                                <button
                                    type="button"
                                    className="button-tertiary terrain-detail-close"
                                    onClick={() => setSelectedId(null)}
                                >
                                    Cerrar
                                </button>
                            </header>
                            <figure className="terrain-figure">
                                <TerrainShape terrain={selected} />
                                <figcaption>
                                    Contorno a escala · {describeShape(selected)}
                                </figcaption>
                            </figure>
                            <TerrainFacts
                                terrain={selected}
                                place={projectPlaces.get(selected.project_id) ?? null}
                            />
                            <Button onClick={() => onOpenProject(selected.project_id)}>
                                Abrir en su proyecto
                            </Button>
                        </aside>
                    )}
                </div>
            </section>
        </>
    );
}

function TerrainFacts({ terrain, place }: { terrain: Terrain; place: string | null }) {
    const measured = measures(terrain);
    const north = northOf(terrain);
    const hasCoordinates = terrain.latitude !== null && terrain.longitude !== null;

    return (
        <dl className="fact-grid">
            <div>
                <dt>Área</dt>
                <dd>{formatNumber(terrain.area_m2)} m²</dd>
            </div>
            <div>
                <dt>Dimensiones</dt>
                <dd>
                    {measured === null
                        ? "Sin registrar"
                        : `${formatNumber(measured.width)} × ${formatNumber(measured.depth)} m${measured.fromVertices ? " (envolvente)" : ""}`}
                </dd>
            </div>
            <div>
                <dt>Perímetro</dt>
                <dd>
                    {measured === null
                        ? "Sin registrar"
                        : `${formatNumber(measured.perimeter)} m · ${measured.sides.length} lados`}
                </dd>
            </div>
            <div>
                <dt>Pendiente</dt>
                <dd>
                    {terrain.slope_percent === null
                        ? "Sin registrar"
                        : `${formatNumber(terrain.slope_percent)} %`}
                    {measured?.drop !== null && measured?.drop !== undefined && (
                        <span className="fact-note">
                            {formatNumber(measured.drop)} m de desnivel en el fondo
                        </span>
                    )}
                </dd>
            </div>
            <div>
                <dt>Suelo</dt>
                <dd>{terrain.soil_type ?? "Sin registrar"}</dd>
            </div>
            <div>
                <dt>Ubicación del proyecto</dt>
                <dd>{place ?? "Sin registrar"}</dd>
            </div>
            <div>
                <dt>Orientación</dt>
                <dd>
                    {north === null ? (
                        "Sin registrar"
                    ) : (
                        <>
                            Norte a {formatNumber(north)}°
                            <span className="fact-note">
                                Del plano de implantación, guardado en este navegador
                            </span>
                        </>
                    )}
                </dd>
            </div>
            <div>
                <dt>Coordenadas</dt>
                <dd>
                    {hasCoordinates ? (
                        <>
                            <span className="numeric">
                                {terrain.latitude}, {terrain.longitude}
                            </span>
                            <a
                                className="fact-note"
                                href={`https://www.openstreetmap.org/?mlat=${terrain.latitude}&mlon=${terrain.longitude}#map=18/${terrain.latitude}/${terrain.longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Ver en OpenStreetMap (abre otra pestaña)
                            </a>
                        </>
                    ) : (
                        "Sin registrar"
                    )}
                </dd>
            </div>
        </dl>
    );
}
