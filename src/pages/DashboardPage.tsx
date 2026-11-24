import { useState } from "react";

import { AsyncStatus } from "../components/AsyncStatus";
import { StatusBadge } from "../components/Badge";
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
export function DashboardPage({ onOpenProject }: { onOpenProject: (id: number) => void }) {
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
        <>
            <section className="hero">
                <h1>Dashboard</h1>
                <p>Sube un plano y deja que la IA arme el proyecto, o créalo a mano.</p>
                <button type="button" className="hero-action" onClick={() => setCreating(true)}>
                    Crear proyecto con IA
                </button>
            </section>
            <Panel title="Tus proyectos en cifras">
                <AsyncStatus
                    loading={projects.loading}
                    error={projects.error}
                    onRetry={projects.reload}
                    isEmpty={all.length === 0}
                    emptyText="Todavía no tienes proyectos. Crea el primero arriba."
                />
                {all.length > 0 && (
                    <div className="metrics">
                        <MetricCard label="Total" value={formatNumber(all.length)} />
                        {summary.data && (
                            <MetricCard
                                label="Terrenos"
                                value={formatNumber(summary.data.terrains)}
                            />
                        )}
                        {summary.data?.plans !== undefined && (
                            <MetricCard label="Planos" value={formatNumber(summary.data.plans)} />
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
            </Panel>
            {recent.length > 0 && (
                <Panel title="Actualizados recientemente">
                    <ul className="recent-list">
                        {recent.map((project) => (
                            <li key={project.id}>
                                <button
                                    type="button"
                                    className="button-secondary"
                                    onClick={() => onOpenProject(project.id)}
                                >
                                    {project.name}
                                </button>
                                <span>{formatDateTime(project.updated_at)}</span>
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
            {GROUPS.map(({ status: groupStatus, title }) => {
                const group = items
                    .filter((item) => item.status === groupStatus)
                    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));

                return (
                    group.length > 0 && (
                        <Panel key={groupStatus} title={title}>
                            <ul className="card-list">
                                {group.map((project) => (
                                    <li key={project.id}>
                                        <button
                                            type="button"
                                            className="card"
                                            onClick={() => onOpenProject(project.id)}
                                        >
                                            <StatusBadge status={project.status} />
                                            <span className="card-title">{project.name}</span>
                                            <span className="card-subtitle">
                                                {project.location ?? "Sin ubicación"}
                                            </span>
                                        </button>
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
        </>
    );
}
