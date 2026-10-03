import { AsyncStatus } from "../components/AsyncStatus";
import { StatusBadge } from "../components/Badge";
import { MetricCard } from "../components/MetricCard";
import { Panel } from "../components/Panel";
import { useAsync } from "../hooks/useAsync";
import { projectsApi, summaryApi } from "../services/api";
import type { User } from "../types/api";
import { formatMoney, formatNumber } from "../utils/format";

const RECENT_PROJECTS = 4;

interface HomePageProps {
    user: User;
    onOpenProject: (projectId: number) => void;
    onShowProjects: () => void;
}

export function HomePage({ user, onOpenProject, onShowProjects }: HomePageProps) {
    const summary = useAsync(() => summaryApi.get(), []);
    const projects = useAsync(() => projectsApi.list(), []);

    const recent = [...(projects.data ?? [])]
        .sort((first, second) => second.updated_at.localeCompare(first.updated_at))
        .slice(0, RECENT_PROJECTS);

    return (
        <>
            <Panel title={`Hola, ${user.name}`}>
                <AsyncStatus
                    loading={summary.loading}
                    error={summary.error}
                    isEmpty={false}
                    emptyText=""
                />
                {summary.data && (
                    <div className="metrics">
                        <MetricCard
                            label="Proyectos"
                            value={formatNumber(summary.data.projects)}
                            detail={`${summary.data.active_projects} activos · ${summary.data.draft_projects} en borrador · ${summary.data.archived_projects} archivados`}
                        />
                        <MetricCard
                            label="Terrenos"
                            value={formatNumber(summary.data.terrains)}
                            detail={`${formatNumber(summary.data.total_area_m2)} m² en total`}
                        />
                        <MetricCard
                            label="Costo de materiales"
                            value={formatMoney(summary.data.materials_total_cost)}
                            detail="Suma de todos los proyectos"
                        />
                    </div>
                )}
            </Panel>

            <Panel
                title="Proyectos recientes"
                actions={
                    <button type="button" className="button-secondary" onClick={onShowProjects}>
                        Ver todos
                    </button>
                }
            >
                <AsyncStatus
                    loading={projects.loading}
                    error={projects.error}
                    isEmpty={recent.length === 0}
                    emptyText="Todavía no tienes proyectos. Crea el primero desde Proyectos."
                />
                <ul className="card-list">
                    {recent.map((project) => (
                        <li key={project.id}>
                            <button
                                type="button"
                                className="card"
                                onClick={() => onOpenProject(project.id)}
                            >
                                <span className="card-title">{project.name}</span>
                                <span className="card-subtitle">
                                    {project.location ?? "Sin ubicación"}
                                </span>
                                <StatusBadge status={project.status} />
                            </button>
                        </li>
                    ))}
                </ul>
            </Panel>
        </>
    );
}
