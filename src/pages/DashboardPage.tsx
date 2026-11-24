import { useState } from "react";

import { AsyncStatus } from "../components/AsyncStatus";
import { ProjectCard } from "../components/ProjectCard";
import { TextField } from "../components/TextField";
import { CreateProjectDialog } from "../components/dashboard/CreateProjectDialog";
import { MetricCard } from "../components/MetricCard";
import { Panel } from "../components/Panel";
import { formatDateTime } from "../utils/format";
import { useAsync } from "../hooks/useAsync";
import { projectsApi, summaryApi } from "../services/api";
import type { ProjectStatus } from "../types/api";
import { formatNumber } from "../utils/format";

const GROUPS: { status: ProjectStatus; title: string }[] = [
    { status: "active", title: "Activos" },
    { status: "draft", title: "En borrador" },
    { status: "archived", title: "Archivados" },
];

/** Overview and creation of projects (R12). */
export function DashboardPage({
    onOpenProject,
}: {
    onOpenProject: (id: number, openModel?: boolean) => void;
}) {
    const projects = useAsync(() => projectsApi.list(), []);
    const [creating, setCreating] = useState(false);
    const summary = useAsync(() => summaryApi.get(), []);
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState<ProjectStatus | "all">("all");
    const all = projects.data ?? [];
    const query = search.trim().toLocaleLowerCase("es");
    const items = all.filter(
        (item) =>
            (status === "all" || item.status === status) &&
            (query === "" ||
                `${item.name} ${item.location ?? ""}`.toLocaleLowerCase("es").includes(query)),
    );
    const recent = [...all].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 5);

    return (
        <div className="dashboard-page">
            <section className="dashboard-welcome">
                <div className="dashboard-welcome-copy">
                    <span className="dashboard-kicker">
                        <span className="dashboard-status-dot" />
                        ARQUILA STUDIO <span aria-hidden="true">/</span> TU ESPACIO DE TRABAJO
                    </span>
                    <h1>Ideas que toman forma.</h1>
                    <p>
                        Un espacio para convertir tus conceptos en proyectos, desde el primer
                        terreno hasta el último detalle.
                    </p>
                    <button type="button" className="hero-action" onClick={() => setCreating(true)}>
                        Crear proyecto con IA
                        <span aria-hidden="true">↗</span>
                    </button>
                    <div className="dashboard-welcome-meta">
                        <span>DISEÑO</span>
                        <span>ARQUITECTURA</span>
                        <span>INTELIGENCIA ARTIFICIAL</span>
                    </div>
                </div>
                <div className="dashboard-blueprint" aria-hidden="true">
                    <div className="dashboard-blueprint-label">ARQUILA · ESTUDIO DIGITAL</div>
                    <svg viewBox="0 0 520 360" role="presentation">
                        <defs>
                            <pattern
                                id="blueprint-grid"
                                width="24"
                                height="24"
                                patternUnits="userSpaceOnUse"
                            >
                                <path d="M24 0H0V24" className="blueprint-grid-line" />
                            </pattern>
                            <linearGradient id="blueprint-fill" x1="0" x2="1" y1="0" y2="1">
                                <stop offset="0" stopColor="currentColor" stopOpacity=".23" />
                                <stop offset="1" stopColor="currentColor" stopOpacity=".04" />
                            </linearGradient>
                        </defs>
                        <path
                            className="blueprint-grid-fill"
                            d="M0 0h520v360H0z"
                            fill="url(#blueprint-grid)"
                        />
                        <g className="blueprint-ground">
                            <path d="m52 272 191-110 225 90-193 111z" />
                            <path d="m243 162 0 113" />
                            <path d="m468 252 0-84-225-89-191 109v84" />
                        </g>
                        <g className="blueprint-building">
                            <path d="m149 189 112-66 128 51-112 68z" fill="url(#blueprint-fill)" />
                            <path d="m149 189 0 57 128 52v-56" />
                            <path d="m277 242 112-68v61l-112 63" />
                            <path d="m149 189 112-66 128 51" />
                            <path d="m204 157 128 51v60" />
                            <path d="m204 157v57l73 31" />
                            <path d="m332 208 0-54" />
                            <path d="m222 177 0 58m18-49v58m18-49v58" />
                            <path d="m295 178 0 51m18-43v51m18-43v51" />
                            <path d="m149 216 128 52 112-67" />
                            <path d="m170 177 112 57 88-54" />
                        </g>
                        <g className="blueprint-dimensions">
                            <path d="m122 185 0 69m-5-66 10-6m-10 75 10-6" />
                            <path d="m158 267 111 45m-104-51-13 9m122 34-13 9" />
                            <circle cx="397" cy="127" r="3" />
                        </g>
                    </svg>
                    <div className="dashboard-blueprint-caption">
                        <span>01 — VISIÓN Y DISEÑO</span>
                        <span>DEL CONCEPTO AL ESPACIO</span>
                    </div>
                </div>
            </section>

            <section className="dashboard-section" aria-labelledby="dashboard-overview-title">
                <div className="dashboard-section-heading">
                    <div>
                        <span className="dashboard-section-index">01 / PANORAMA</span>
                        <h2 id="dashboard-overview-title">El estudio, en números</h2>
                    </div>
                    <p>Una vista rápida de todo lo que estás construyendo.</p>
                </div>
                <AsyncStatus
                    loading={projects.loading}
                    error={projects.error}
                    onRetry={projects.reload}
                    isEmpty={all.length === 0}
                    emptyText="Todavía no tienes proyectos. Crea el primero arriba."
                />
                {all.length > 0 && (
                    <div className="metrics dashboard-metrics">
                        <MetricCard
                            label="Proyectos totales"
                            value={formatNumber(all.length)}
                            detail="En tu espacio de trabajo"
                        />
                        {summary.data && (
                            <MetricCard
                                label="Terrenos"
                                value={formatNumber(summary.data.terrains)}
                                detail="Listos para diseñar"
                            />
                        )}
                        {summary.data?.plans !== undefined && (
                            <MetricCard
                                label="Planos"
                                value={formatNumber(summary.data.plans)}
                                detail="En todos tus proyectos"
                            />
                        )}
                        {GROUPS.map(({ status: group, title }) => (
                            <MetricCard
                                key={group}
                                label={title}
                                value={formatNumber(
                                    all.filter((item) => item.status === group).length,
                                )}
                            />
                        ))}
                    </div>
                )}
            </section>

            {recent.length > 0 && (
                <Panel
                    title="Sigue donde lo dejaste"
                    actions={
                        <span className="dashboard-recent-count">{recent.length} recientes</span>
                    }
                >
                    <ul className="recent-list">
                        {recent.map((project) => (
                            <li key={project.id}>
                                <button
                                    type="button"
                                    className="dashboard-recent-project"
                                    onClick={() => onOpenProject(project.id)}
                                >
                                    <span className="dashboard-recent-mark" aria-hidden="true">
                                        AR
                                    </span>
                                    <span className="dashboard-recent-name">
                                        <strong>{project.name}</strong>
                                        <span>{project.location ?? "Ubicación por definir"}</span>
                                    </span>
                                    <span className="dashboard-recent-arrow" aria-hidden="true">
                                        ↗
                                    </span>
                                </button>
                                <span className="dashboard-recent-date">
                                    {formatDateTime(project.updated_at)}
                                </span>
                            </li>
                        ))}
                    </ul>
                </Panel>
            )}

            {all.length > 0 && (
                <div className="filters dashboard-filters">
                    <TextField label="Buscar proyecto" value={search} onChange={setSearch} />
                    <label>
                        Estado
                        <select
                            value={status}
                            onChange={(event) =>
                                setStatus(event.target.value as ProjectStatus | "all")
                            }
                        >
                            <option value="all">Todos</option>
                            {GROUPS.map((group) => (
                                <option key={group.status} value={group.status}>
                                    {group.title}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>
            )}
            {all.length > 0 && items.length === 0 && (
                <p className="message" role="status">
                    Ningún proyecto coincide con la búsqueda.
                </p>
            )}
            {all.length > 0 && (
                <div className="dashboard-projects-heading">
                    <div>
                        <span className="dashboard-section-index">02 / PORTAFOLIO</span>
                        <h2>Todos tus proyectos</h2>
                    </div>
                    <span className="dashboard-project-total">
                        {formatNumber(items.length)} proyectos
                    </span>
                </div>
            )}
            {GROUPS.map(({ status: groupStatus, title }) => {
                const group = items
                    .filter((item) => item.status === groupStatus)
                    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));

                return (
                    group.length > 0 && (
                        <Panel
                            key={groupStatus}
                            title={title}
                            actions={<span className="dashboard-group-count">{group.length}</span>}
                        >
                            <ul className="card-list">
                                {group.map((project) => (
                                    <li key={project.id}>
                                        <ProjectCard project={project} onOpen={onOpenProject} />
                                    </li>
                                ))}
                            </ul>
                        </Panel>
                    )
                );
            })}
            {creating && (
                <CreateProjectDialog
                    onClose={() => {
                        setCreating(false);
                        projects.reload();
                    }}
                    onCreated={onOpenProject}
                />
            )}
        </div>
    );
}
