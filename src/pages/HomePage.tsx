import { useState } from "react";

import { RenderImage } from "../components/RenderImage";
import { AsyncStatus } from "../components/AsyncStatus";
import { Icon } from "../components/Icon";
import { Panel } from "../components/Panel";
import { ProjectCard } from "../components/ProjectCard";
import { MODULES, type View } from "../components/Sidebar";
import { Button } from "../components/ui/Button";
import { Menu } from "../components/ui/Menu";
import { errorMessage, useAsync } from "../hooks/useAsync";
import { projectsApi, summaryApi } from "../services/api";
import { showToast } from "../state/toasts";
import type { Project, ProjectStatus, User } from "../types/api";
import type { SectionId } from "./ProjectDetailPage";
import { formatMoney, formatNumber } from "../utils/format";

const RECENT_PROJECTS = 8;
// The one shortcut that gets the large tile: the 3D viewer is what sets the product apart.
const MAIN_MODULE = MODULES.find((module) => module.id === "viewer") ?? MODULES[0];

interface HomePageProps {
    user: User;
    onOpenProject: (projectId: number, section?: SectionId) => void;
    onNavigate: (view: View) => void;
}

export function HomePage({ user, onOpenProject, onNavigate }: HomePageProps) {
    const summary = useAsync(() => summaryApi.get(), []);
    const projects = useAsync(() => projectsApi.list(), []);

    const [query, setQuery] = useState("");
    const [status, setStatus] = useState<ProjectStatus | "">("");
    const [layout, setLayout] = useState<"grid" | "list">("grid");
    const [actionError, setActionError] = useState<string | null>(null);
    const wanted = query.trim().toLowerCase();
    const all = projects.data ?? [];
    const recent = all
        .filter(
            (project) =>
                (status === "" || project.status === status) &&
                (wanted === "" || project.name.toLowerCase().includes(wanted)),
        )
        .sort((first, second) => second.updated_at.localeCompare(first.updated_at))
        .slice(0, RECENT_PROJECTS);

    async function changeStatus(project: Project, next: ProjectStatus) {
        setActionError(null);

        try {
            await projectsApi.update(project.id, { status: next });
            projects.reload();
            summary.reload();
            showToast(next === "archived" ? "Proyecto archivado." : "Proyecto reactivado.");
        } catch (reason) {
            setActionError(errorMessage(reason));
        }
    }

    return (
        <>
            <section className="hero hero-home">
                <RenderImage place="home" />
                <div className="hero-copy">
                    <span className="hero-eyebrow">Tu espacio de trabajo</span>
                    <h2>Hola, {user.name}</h2>
                    <p>
                        Proyectos, terrenos, planos, materiales y modelo 3D en un solo lugar, con un
                        asistente que conoce cada proyecto.
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
                <div className="hero-stats">
                    <AsyncStatus
                        loading={summary.loading}
                        error={summary.error}
                        onRetry={summary.reload}
                        isEmpty={summary.data === null}
                        emptyText=""
                    />
                    {summary.data && (
                        <dl>
                            <div>
                                <dt>Proyectos</dt>
                                <dd>{formatNumber(summary.data.projects)}</dd>
                                <dd className="hero-stat-detail">
                                    {`${summary.data.active_projects} activos · ${summary.data.draft_projects} en borrador · ${summary.data.archived_projects} archivados`}
                                </dd>
                            </div>
                            <div>
                                <dt>Terrenos</dt>
                                <dd>{formatNumber(summary.data.terrains)}</dd>
                                <dd className="hero-stat-detail">
                                    {formatNumber(summary.data.total_area_m2)} m² en total
                                </dd>
                            </div>
                            <div>
                                <dt>Costo de materiales</dt>
                                <dd>{formatMoney(summary.data.materials_total_cost)}</dd>
                                <dd className="hero-stat-detail">Suma de todos los proyectos</dd>
                            </div>
                        </dl>
                    )}
                </div>
            </section>

            <Panel
                title="Proyectos recientes"
                actions={
                    <div className="filters">
                        <input
                            type="search"
                            placeholder="Buscar en recientes"
                            aria-label="Buscar en proyectos recientes"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                        />
                        <select
                            aria-label="Filtrar recientes por estado"
                            value={status}
                            onChange={(event) =>
                                setStatus(event.target.value as ProjectStatus | "")
                            }
                        >
                            <option value="">Todos</option>
                            <option value="draft">Borrador</option>
                            <option value="active">Activo</option>
                            <option value="archived">Archivado</option>
                        </select>
                        <div className="segmented" role="group" aria-label="Vista de recientes">
                            <button
                                type="button"
                                aria-pressed={layout === "grid"}
                                onClick={() => setLayout("grid")}
                            >
                                Cuadrícula
                            </button>
                            <button
                                type="button"
                                aria-pressed={layout === "list"}
                                onClick={() => setLayout("list")}
                            >
                                Lista
                            </button>
                        </div>
                        <Button variant="secondary" onClick={() => onNavigate("projects")}>
                            Ver todos
                        </Button>
                    </div>
                }
            >
                <AsyncStatus
                    loading={projects.loading}
                    error={projects.error}
                    onRetry={projects.reload}
                    isEmpty={recent.length === 0}
                    emptyText={
                        all.length === 0
                            ? "Todavía no tienes proyectos. Crea el primero con «Nuevo proyecto»."
                            : "Ningún proyecto reciente coincide con el filtro."
                    }
                />
                {actionError && (
                    <p className="message message-error" role="alert">
                        {actionError}
                    </p>
                )}
                <ul
                    className={
                        layout === "grid"
                            ? "card-list project-grid"
                            : "card-list card-list-rows project-grid"
                    }
                >
                    {recent.map((project) => (
                        <li key={project.id} className="project-item">
                            <ProjectCard project={project} onOpen={onOpenProject} layout={layout} />
                            <div className="project-actions">
                                <Menu
                                    label={`Acciones de ${project.name}`}
                                    items={[
                                        {
                                            label: "Abrir",
                                            onSelect: () => onOpenProject(project.id),
                                        },
                                        {
                                            label: "Ver el modelo 3D",
                                            onSelect: () => onOpenProject(project.id, "model"),
                                        },
                                        {
                                            label:
                                                project.status === "archived"
                                                    ? "Reactivar"
                                                    : "Archivar",
                                            onSelect: () =>
                                                void changeStatus(
                                                    project,
                                                    project.status === "archived"
                                                        ? "active"
                                                        : "archived",
                                                ),
                                        },
                                    ]}
                                />
                            </div>
                        </li>
                    ))}
                </ul>
            </Panel>

            <Panel title="Accesos rápidos">
                <div className="quick">
                    <button
                        type="button"
                        className="quick-main"
                        onClick={() => onNavigate(MAIN_MODULE.id)}
                    >
                        <Icon name={MAIN_MODULE.icon} />
                        <span className="quick-main-title">{MAIN_MODULE.label}</span>
                        <span className="quick-main-text">{MAIN_MODULE.description}</span>
                    </button>
                    <ul className="quick-list">
                        {MODULES.filter(
                            (module) => module.id !== "home" && module.id !== MAIN_MODULE.id,
                        ).map((module) => (
                            <li key={module.id}>
                                <button
                                    type="button"
                                    className="quick-row"
                                    onClick={() => onNavigate(module.id)}
                                >
                                    <Icon name={module.icon} />
                                    <span className="quick-row-title">{module.label}</span>
                                    <span className="quick-row-text">{module.description}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            </Panel>
        </>
    );
}
