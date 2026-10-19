import { Suspense, lazy, useState } from "react";

import { RenderImage } from "../components/RenderImage";
import { AsyncStatus } from "../components/AsyncStatus";
import { CountUp } from "../components/CountUp";
import { StatusBadge } from "../components/ui/Badge";
import { ProjectCover } from "../components/ProjectCover";
import { Icon } from "../components/Icon";
import { Panel } from "../components/ui/Panel";
import { ProjectCard } from "../components/ProjectCard";
import { MODULES, type View } from "../components/Sidebar";
import { Button } from "../components/ui/Button";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { Menu } from "../components/ui/Menu";
import { errorMessage, useAsync } from "../hooks/useAsync";
import { projectsApi, summaryApi } from "../services/api";
import { showToast } from "../state/toasts";
import type { Project, ProjectStatus, User } from "../types/api";
import type { SectionId } from "./sections";
import { formatDate, formatMoney, formatNumber } from "../utils/format";

import styles from "./HomePage.module.css";

const RECENT_PROJECTS = 8;
// The live model only where the browser can draw it; three.js loads when it is first needed.
const ProjectPreview = lazy(() =>
    import("../components/ProjectPreview").then((module) => ({ default: module.ProjectPreview })),
);
const CAN_DRAW_3D = typeof window !== "undefined" && "WebGL2RenderingContext" in window;
// The one shortcut that gets the large tile: the 3D viewer is what sets the product apart.
const MAIN_MODULE = MODULES.find((module) => module.id === "viewer") ?? MODULES[0];

interface HomePageProps {
    user: User;
    onOpenProject: (projectId: number, section?: SectionId) => void;
    onNavigate: (view: View) => void;
    /** Opens the creation form; without it «Crear proyecto» only goes to the projects screen. */
    onCreateProject?: () => void;
}

/** «1 activo», «2 activos»: the word agrees with the figure. */
function count(value: number, one: string, many: string): string {
    return `${formatNumber(value)} ${value === 1 ? one : many}`;
}

export function HomePage({ user, onOpenProject, onNavigate, onCreateProject }: HomePageProps) {
    const summary = useAsync(() => summaryApi.get(), []);
    const projects = useAsync(() => projectsApi.list(), []);

    const [query, setQuery] = useState("");
    const [status, setStatus] = useState<ProjectStatus | "">("");
    const [layout, setLayout] = useState<"grid" | "list">("grid");
    const [actionError, setActionError] = useState<string | null>(null);
    const [deleting, setDeleting] = useState<Project | null>(null);
    const [deletePending, setDeletePending] = useState(false);
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

    // The project to pick up again: the last one touched that is not archived.
    const latest =
        [...all]
            .filter((project) => project.status !== "archived")
            .sort((first, second) => second.updated_at.localeCompare(first.updated_at))[0] ?? null;
    const shares = summary.data
        ? [
              { id: "active", label: "Activos", count: summary.data.active_projects },
              { id: "draft", label: "En borrador", count: summary.data.draft_projects },
              { id: "archived", label: "Archivados", count: summary.data.archived_projects },
          ]
        : [];

    async function remove(project: Project) {
        setDeletePending(true);
        setActionError(null);

        try {
            await projectsApi.remove(project.id);
            setDeleting(null);
            projects.reload();
            summary.reload();
            showToast(`Proyecto «${project.name}» eliminado.`);
        } catch (reason) {
            setDeleting(null);
            setActionError(errorMessage(reason));
        } finally {
            setDeletePending(false);
        }
    }

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
            <section className={styles.hero} aria-labelledby="home-greeting">
                <div className={styles.copy}>
                    <span className={styles.eyebrow}>Tu espacio de trabajo</span>
                    <h2 id="home-greeting">Hola, {user.name}</h2>
                    <p>
                        Proyectos, terrenos, planos, materiales y modelo 3D en un solo lugar, con un
                        asistente que conoce cada proyecto.
                    </p>
                    <div className={styles.actions}>
                        <button
                            type="button"
                            className="button-lime icon-button"
                            onClick={() =>
                                onCreateProject === undefined
                                    ? onNavigate("projects")
                                    : onCreateProject()
                            }
                        >
                            <Icon name="plus" />
                            Crear proyecto
                        </button>
                        <button
                            type="button"
                            className="button-ghost"
                            onClick={() => onNavigate("projects")}
                        >
                            Explorar proyectos
                        </button>
                    </div>
                </div>
                <div className={styles.picture}>
                    <RenderImage />
                </div>
            </section>

            {/* Only the figures GET /summary returns. There is no count of plans or of saved
                materials, nor a «completed» state, so none of them is shown. */}
            <dl className={styles.figures} aria-label="Resumen de tu cuenta">
                {summary.data === null ? (
                    <div className={styles.figuresLoading}>
                        <AsyncStatus
                            loading={summary.loading}
                            error={summary.error}
                            onRetry={summary.reload}
                            isEmpty
                            emptyText=""
                        />
                    </div>
                ) : (
                    <>
                        <div className={styles.figure}>
                            <dt>
                                <Icon name="projects" />
                                Proyectos
                            </dt>
                            <dd className={styles.value}>
                                <CountUp value={summary.data.projects} format={formatNumber} />
                            </dd>
                            <dd className={styles.detail}>
                                {[
                                    count(summary.data.active_projects, "activo", "activos"),
                                    `${formatNumber(summary.data.draft_projects)} en borrador`,
                                    count(
                                        summary.data.archived_projects,
                                        "archivado",
                                        "archivados",
                                    ),
                                ].join(" · ")}
                            </dd>
                        </div>
                        <div className={styles.figure}>
                            <dt>
                                <Icon name="terrains" />
                                Terrenos
                            </dt>
                            <dd className={styles.value}>
                                <CountUp value={summary.data.terrains} format={formatNumber} />
                            </dd>
                            <dd className={styles.detail}>
                                {formatNumber(summary.data.total_area_m2)} m² en total
                            </dd>
                        </div>
                        <div className={styles.figure}>
                            <dt>
                                <Icon name="materials" />
                                Costo de materiales
                            </dt>
                            <dd className={styles.value}>
                                <CountUp
                                    value={summary.data.materials_total_cost}
                                    format={formatMoney}
                                />
                            </dd>
                            <dd className={styles.detail}>Suma de todos los proyectos</dd>
                        </div>
                    </>
                )}
            </dl>

            {/* While the projects are on their way the row already takes its place, so the blocks
                under it do not jump when it arrives. */}
            {projects.loading && projects.data === null && (
                <div className="home-row home-row-arriving" aria-hidden="true">
                    <div className="continue-card" />
                    <div className="status-card" />
                </div>
            )}
            {latest !== null && (
                <div className="home-row">
                    <section className="continue-card" aria-label="Continuar donde lo dejaste">
                        <div className="continue-cover">
                            <ProjectCover id={latest.id} name={latest.name} />
                            {CAN_DRAW_3D && (
                                <Suspense fallback={null}>
                                    <ProjectPreview key={latest.id} projectId={latest.id} />
                                </Suspense>
                            )}
                        </div>
                        <div className="continue-body">
                            <span className="eyebrow">Continuar donde lo dejaste</span>
                            <h3>{latest.name}</h3>
                            <p className="continue-meta">
                                <StatusBadge status={latest.status} />
                                <span>{latest.location ?? "Sin ubicación"}</span>
                                <span>Actualizado {formatDate(latest.updated_at)}</span>
                            </p>
                            <div className="continue-actions">
                                <button
                                    type="button"
                                    onClick={() => onOpenProject(latest.id, "model")}
                                >
                                    Abrir el modelo 3D
                                </button>
                                <button
                                    type="button"
                                    className="button-secondary"
                                    onClick={() => onOpenProject(latest.id, "plans")}
                                >
                                    Planos
                                </button>
                                <button
                                    type="button"
                                    className="button-secondary"
                                    onClick={() => onOpenProject(latest.id, "materials")}
                                >
                                    Materiales
                                </button>
                                <button
                                    type="button"
                                    className="button-tertiary"
                                    onClick={() => onOpenProject(latest.id)}
                                >
                                    Abrir el proyecto
                                </button>
                            </div>
                        </div>
                    </section>
                    {summary.data && summary.data.projects > 0 && (
                        <section className="status-card" aria-label="Proyectos por estado">
                            <span className="eyebrow">Proyectos por estado</span>
                            <div
                                className="status-bar"
                                role="img"
                                aria-label={shares
                                    .map((share) => `${share.label}: ${share.count}`)
                                    .join(", ")}
                            >
                                {shares
                                    .filter((share) => share.count > 0)
                                    .map((share) => (
                                        <span
                                            key={share.id}
                                            className={`status-bar-${share.id}`}
                                            style={{ flexGrow: share.count }}
                                        />
                                    ))}
                            </div>
                            <dl className="status-legend">
                                {shares.map((share) => (
                                    <div key={share.id}>
                                        <dt>
                                            <span
                                                className={`status-dot status-bar-${share.id}`}
                                                aria-hidden="true"
                                            />
                                            {share.label}
                                        </dt>
                                        <dd>{formatNumber(share.count)}</dd>
                                    </div>
                                ))}
                            </dl>
                            <Button variant="tertiary" onClick={() => onNavigate("projects")}>
                                Ver todos los proyectos
                            </Button>
                        </section>
                    )}
                </div>
            )}

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
                                        {
                                            label: "Eliminar…",
                                            danger: true,
                                            onSelect: () => setDeleting(project),
                                        },
                                    ]}
                                />
                            </div>
                        </li>
                    ))}
                </ul>
            </Panel>

            {deleting !== null && (
                <ConfirmDialog
                    title={`¿Eliminar «${deleting.name}»?`}
                    confirmLabel="Eliminar el proyecto"
                    danger
                    pending={deletePending}
                    onConfirm={() => void remove(deleting)}
                    onCancel={() => setDeleting(null)}
                >
                    <p>
                        Se eliminan también sus terrenos, planos, cuartos, materiales y archivos. No
                        se puede deshacer.
                    </p>
                </ConfirmDialog>
            )}

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
