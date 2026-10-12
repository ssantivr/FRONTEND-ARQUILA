import { RenderImage } from "../components/RenderImage";
import { AsyncStatus } from "../components/AsyncStatus";
import { Icon } from "../components/Icon";
import { MetricCard } from "../components/MetricCard";
import { Panel } from "../components/Panel";
import { ProjectCard } from "../components/ProjectCard";
import { MODULES, type View } from "../components/Sidebar";
import { useAsync } from "../hooks/useAsync";
import { projectsApi, summaryApi } from "../services/api";
import { useTheme } from "../state/theme";
import type { User } from "../types/api";
import { formatMoney, formatNumber } from "../utils/format";

const RECENT_PROJECTS = 4;

interface HomePageProps {
    user: User;
    onOpenProject: (projectId: number) => void;
    onNavigate: (view: View) => void;
}

export function HomePage({ user, onOpenProject, onNavigate }: HomePageProps) {
    const theme = useTheme();
    const summary = useAsync(() => summaryApi.get(), []);
    const projects = useAsync(() => projectsApi.list(), []);

    const recent = [...(projects.data ?? [])]
        .sort((first, second) => second.updated_at.localeCompare(first.updated_at))
        .slice(0, RECENT_PROJECTS);

    return (
        <>
            <section className="hero">
                <div className="hero-copy">
                    <span className="hero-eyebrow">Tu espacio de trabajo</span>
                    <h2>Hola, {user.name}</h2>
                    <p>
                        ARQUILA reúne en un solo lugar los proyectos de arquitectura con sus
                        terrenos, planos, materiales, modelo 3D y un asistente que conoce cada
                        proyecto.
                    </p>
                    <div className="hero-actions">
                        <button
                            type="button"
                            className="button-lime icon-button"
                            onClick={() => onNavigate("projects")}
                        >
                            <Icon name="plus" />
                            Crear proyecto
                        </button>
                        <button
                            type="button"
                            className="button-ghost"
                            onClick={() => onNavigate("viewer")}
                        >
                            Abrir el visor 3D
                        </button>
                    </div>
                </div>
                <RenderImage time={theme === "dark" ? "night" : "day"} />
            </section>

            <Panel title="Resumen">
                <AsyncStatus
                    loading={summary.loading}
                    error={summary.error}
                    onRetry={summary.reload}
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
                    <button
                        type="button"
                        className="button-secondary"
                        onClick={() => onNavigate("projects")}
                    >
                        Ver todos
                    </button>
                }
            >
                <AsyncStatus
                    loading={projects.loading}
                    error={projects.error}
                    onRetry={projects.reload}
                    isEmpty={recent.length === 0}
                    emptyText="Todavía no tienes proyectos. Crea el primero desde Proyectos."
                />
                <ul className="card-list">
                    {recent.map((project) => (
                        <li key={project.id}>
                            <ProjectCard project={project} onOpen={onOpenProject} />
                        </li>
                    ))}
                </ul>
            </Panel>

            <Panel title="Accesos rápidos">
                <ul className="card-list">
                    {MODULES.filter((module) => module.id !== "home").map((module) => (
                        <li key={module.id}>
                            <button
                                type="button"
                                className="card module-card"
                                onClick={() => onNavigate(module.id)}
                            >
                                <span className="module-icon">
                                    <Icon name={module.icon} />
                                </span>
                                <span className="card-title">{module.label}</span>
                                <span className="card-subtitle">{module.description}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            </Panel>
        </>
    );
}
