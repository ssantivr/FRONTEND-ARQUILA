import { useState } from "react";

import { AsyncStatus } from "../components/AsyncStatus";
import { StatusBadge } from "../components/Badge";
import { CreateProjectDialog } from "../components/dashboard/CreateProjectDialog";
import { MetricCard } from "../components/MetricCard";
import { Panel } from "../components/Panel";
import { useAsync } from "../hooks/useAsync";
import { projectsApi } from "../services/api";
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
    const items = projects.data ?? [];

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
                    isEmpty={items.length === 0}
                    emptyText="Todavía no tienes proyectos. Crea el primero arriba."
                />
                {items.length > 0 && (
                    <div className="metrics">
                        <MetricCard label="Total" value={formatNumber(items.length)} />
                        {GROUPS.map(({ status, title }) => (
                            <MetricCard
                                key={status}
                                label={title}
                                value={formatNumber(
                                    items.filter((item) => item.status === status).length,
                                )}
                            />
                        ))}
                    </div>
                )}
            </Panel>
            {GROUPS.map(({ status, title }) => {
                const group = items
                    .filter((item) => item.status === status)
                    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));

                return (
                    group.length > 0 && (
                        <Panel key={status} title={title}>
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
