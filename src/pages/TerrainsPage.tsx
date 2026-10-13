import { useState } from "react";

import { AsyncStatus } from "../components/AsyncStatus";
import { Button } from "../components/ui/Button";
import { useAsync } from "../hooks/useAsync";
import { loadAcrossProjects, terrainsApi } from "../services/api";
import type { Terrain } from "../types/api";
import { formatNumber } from "../utils/format";

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
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const terrains = data.data?.items ?? [];
    const projects = data.data?.projects ?? [];
    const projectNames = new Map(projects.map((item) => [item.id, item.name]));
    const soils = [...new Set(terrains.flatMap((terrain) => terrain.soil_type ?? []))].sort();
    const totalArea = terrains.reduce((sum, terrain) => sum + terrain.area_m2, 0);
    const slopes = terrains.flatMap((terrain) =>
        terrain.slope_percent === null ? [] : [terrain.slope_percent],
    );
    const steepest = slopes.length === 0 ? null : Math.max(...slopes);
    const wanted = query.trim().toLowerCase();
    const filtered = wanted !== "" || projectId !== "" || soil !== "";
    const shown = terrains.filter(
        (terrain) =>
            (wanted === "" || terrain.name.toLowerCase().includes(wanted)) &&
            (projectId === "" || terrain.project_id === Number(projectId)) &&
            (soil === "" || terrain.soil_type === soil),
    );
    // On a wide screen the panel always shows a terrain: the chosen one, or the first of the list.
    // On a narrow one it is a sheet that only opens for a terrain the user chose.
    const chosen = shown.find((terrain) => terrain.id === selectedId) ?? null;
    const selected = chosen ?? shown[0] ?? null;

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
                {data.data !== null && terrains.length > 0 && (
                    <dl className="stat-strip">
                        <div>
                            <dt>Área total</dt>
                            <dd>{formatNumber(totalArea)} m²</dd>
                        </div>
                        <div>
                            <dt>Pendiente máxima</dt>
                            <dd>{steepest === null ? "—" : `${formatNumber(steepest)} %`}</dd>
                        </div>
                        <div>
                            <dt>Con pendiente registrada</dt>
                            <dd>
                                {slopes.length} de {terrains.length}
                            </dd>
                        </div>
                    </dl>
                )}
            </header>

            <section className="list-section" aria-label="Fichas de terrenos">
                {terrains.length > 0 && (
                    <div className="list-toolbar">
                        <input
                            type="search"
                            placeholder="Buscar terreno"
                            aria-label="Buscar terreno por nombre"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                        />
                        <select
                            aria-label="Filtrar por proyecto"
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
                        {filtered && (
                            <span className="list-count" role="status">
                                {shown.length === 1 ? "1 resultado" : `${shown.length} resultados`}
                            </span>
                        )}
                    </div>
                )}
                <AsyncStatus
                    loading={data.loading}
                    error={data.error}
                    onRetry={data.reload}
                    isEmpty={terrains.length === 0}
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
                            }}
                        >
                            Quitar los filtros
                        </button>
                    </div>
                )}
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
                            <dl className="fact-grid">
                                <div>
                                    <dt>Área</dt>
                                    <dd>{formatNumber(selected.area_m2)} m²</dd>
                                </div>
                                <div>
                                    <dt>Forma</dt>
                                    <dd>{describeShape(selected)}</dd>
                                </div>
                                <div>
                                    <dt>Pendiente</dt>
                                    <dd>
                                        {selected.slope_percent === null
                                            ? "Sin registrar"
                                            : `${formatNumber(selected.slope_percent)} %`}
                                    </dd>
                                </div>
                                <div>
                                    <dt>Suelo</dt>
                                    <dd>{selected.soil_type ?? "Sin registrar"}</dd>
                                </div>
                                <div>
                                    <dt>Coordenadas</dt>
                                    <dd>
                                        {selected.latitude === null || selected.longitude === null
                                            ? "Sin registrar"
                                            : `${selected.latitude}, ${selected.longitude}`}
                                    </dd>
                                </div>
                            </dl>
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
