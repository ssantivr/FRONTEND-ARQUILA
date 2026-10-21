import { Suspense, lazy, useState } from "react";

import { AsyncStatus } from "../components/AsyncStatus";
import { CountUp } from "../components/CountUp";
import { Icon } from "../components/Icon";
import { ProjectTile } from "../components/ProjectTile";
import { RenderImage } from "../components/RenderImage";
import { MODULES, type View } from "../components/Sidebar";
import { StatusBadge } from "../components/ui/Badge";
import { BlueprintGrid } from "../components/ui/Blueprint";
import { Button } from "../components/ui/Button";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { SelectControl } from "../components/ui/Input";
import { Menu } from "../components/ui/Menu";
import { SegmentedControl, type Segment } from "../components/ui/SegmentedControl";
import { errorMessage, useAsync } from "../hooks/useAsync";
import { projectsApi, summaryApi } from "../services/api";
import { showToast } from "../state/toasts";
import type { Project, ProjectStatus, User } from "../types/api";
import { formatDate, formatMoney, formatNumber } from "../utils/format";
import type { SectionId } from "./sections";

import styles from "./HomePage.module.css";

const RECENT_PROJECTS = 8;
// The live model only where the browser can draw it; three.js loads when it is first needed.
const ProjectPreview = lazy(() =>
    import("../components/ProjectPreview").then((module) => ({ default: module.ProjectPreview })),
);
const CAN_DRAW_3D = typeof window !== "undefined" && "WebGL2RenderingContext" in window;
// The one shortcut that gets the large tile: the 3D viewer is what sets the product apart.
const MAIN_MODULE = MODULES.find((module) => module.id === "viewer") ?? MODULES[0];

const LAYOUTS: readonly Segment<"grid" | "list">[] = [
    { value: "grid", label: "Cuadrícula", icon: "grid" },
    { value: "list", label: "Lista", icon: "rows" },
];

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

/**
 * The start of the day: a greeting with the main action, the figures of GET /summary, the project
 * to pick up again, the recent ones and a way into every module. Everything shown comes from the
 * API; what it does not return (plans created, completed projects, a project type) is not shown.
 */
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

    function create() {
        if (onCreateProject === undefined) {
            onNavigate("projects");
        } else {
            onCreateProject();
        }
    }

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
        <div className={styles.home}>
            <section className={styles.hero} aria-labelledby="home-greeting">
                <div className={styles.copy}>
                    <BlueprintGrid className={styles.heroGrid} />
                    <span className={styles.eyebrow}>Tu espacio de trabajo</span>
                    <h2 id="home-greeting" className={styles.greeting}>
                        Hola, {user.name}
                    </h2>
                    <p className={styles.lead}>
                        Proyectos, terrenos, planos, materiales y modelo 3D en un solo lugar, con un
                        asistente que conoce cada proyecto.
                    </p>
                    <div className={styles.heroActions}>
                        <Button size="lg" icon="plus" onClick={create}>
                            Crear proyecto
                        </Button>
                        <Button
                            size="lg"
                            variant="secondary"
                            className={styles.onForest}
                            onClick={() => onNavigate("projects")}
                        >
                            Explorar proyectos
                        </Button>
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
                    <div className={styles.figuresWaiting}>
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
                <div className={`${styles.row} ${styles.arriving}`} aria-hidden="true">
                    <div className={styles.continue} />
                    <div className={styles.states} />
                </div>
            )}
            {latest !== null && (
                <div className={styles.row}>
                    <section className={styles.continue} aria-label="Continuar donde lo dejaste">
                        <div className={styles.continueCover}>
                            <BlueprintGrid cell={12} />
                            {CAN_DRAW_3D && (
                                <Suspense fallback={null}>
                                    <ProjectPreview key={latest.id} projectId={latest.id} />
                                </Suspense>
                            )}
                        </div>
                        <div className={styles.continueBody}>
                            <span className={styles.label}>Continuar donde lo dejaste</span>
                            <h3 className={styles.continueName}>{latest.name}</h3>
                            <p className={styles.continueMeta}>
                                <StatusBadge status={latest.status} />
                                {latest.location !== null && <span>{latest.location}</span>}
                                <span>Actualizado {formatDate(latest.updated_at)}</span>
                            </p>
                            <div className={styles.continueActions}>
                                <Button
                                    icon="viewer"
                                    onClick={() => onOpenProject(latest.id, "model")}
                                >
                                    Abrir el modelo 3D
                                </Button>
                                <Button
                                    variant="secondary"
                                    onClick={() => onOpenProject(latest.id, "plans")}
                                >
                                    Planos
                                </Button>
                                <Button
                                    variant="secondary"
                                    onClick={() => onOpenProject(latest.id, "materials")}
                                >
                                    Materiales
                                </Button>
                                <Button
                                    variant="tertiary"
                                    iconEnd="arrowRight"
                                    onClick={() => onOpenProject(latest.id)}
                                >
                                    Abrir el proyecto
                                </Button>
                            </div>
                        </div>
                    </section>
                    {summary.data && summary.data.projects > 0 && (
                        <section className={styles.states} aria-label="Proyectos por estado">
                            <span className={styles.label}>Proyectos por estado</span>
                            <div
                                className={styles.stateBar}
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
                                            className={styles[share.id]}
                                            style={{ flexGrow: share.count }}
                                        />
                                    ))}
                            </div>
                            <dl className={styles.legend}>
                                {shares.map((share) => (
                                    <div key={share.id}>
                                        <dt>
                                            <span
                                                className={`${styles.dot} ${styles[share.id]}`}
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

            <section className={styles.section} aria-labelledby="home-recent">
                <header className={styles.sectionHead}>
                    <h2 id="home-recent" className={styles.sectionTitle}>
                        Proyectos recientes
                    </h2>
                    <div className={styles.filters} role="search">
                        <span className={styles.search}>
                            <Icon name="search" />
                            <input
                                type="search"
                                className={styles.searchInput}
                                placeholder="Buscar en recientes"
                                aria-label="Buscar en proyectos recientes"
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                            />
                        </span>
                        <SelectControl
                            aria-label="Filtrar recientes por estado"
                            value={status}
                            onChange={(event) =>
                                setStatus(event.target.value as ProjectStatus | "")
                            }
                        >
                            <option value="">Todos los estados</option>
                            <option value="draft">Borrador</option>
                            <option value="active">Activo</option>
                            <option value="archived">Archivado</option>
                        </SelectControl>
                        <SegmentedControl
                            label="Vista de recientes"
                            iconOnly
                            options={LAYOUTS}
                            value={layout}
                            onChange={setLayout}
                        />
                        <Button variant="secondary" onClick={() => onNavigate("projects")}>
                            Ver todos
                        </Button>
                    </div>
                </header>
                <AsyncStatus
                    loading={projects.loading}
                    error={projects.error}
                    onRetry={projects.reload}
                    isEmpty={recent.length === 0}
                    skeleton="cards"
                    emptyText={
                        all.length === 0
                            ? "Todavía no tienes proyectos. Crea el primero y aparecerá aquí."
                            : "Ningún proyecto reciente coincide con el filtro."
                    }
                    emptyAction={
                        all.length === 0 ? (
                            <Button icon="plus" onClick={create}>
                                Crear proyecto
                            </Button>
                        ) : undefined
                    }
                />
                {actionError && (
                    <p className={styles.actionError} role="alert">
                        <Icon name="error" />
                        {actionError}
                    </p>
                )}
                {recent.length > 0 && (
                    <ul className={layout === "grid" ? styles.grid : styles.list}>
                        {recent.map((project) => (
                            <li key={project.id}>
                                <ProjectTile
                                    project={project}
                                    layout={layout}
                                    onOpen={onOpenProject}
                                    actions={
                                        <Menu
                                            label={`Acciones de ${project.name}`}
                                            items={[
                                                {
                                                    label: "Abrir",
                                                    icon: "projects",
                                                    onSelect: () => onOpenProject(project.id),
                                                },
                                                {
                                                    label: "Ver el modelo 3D",
                                                    icon: "viewer",
                                                    onSelect: () =>
                                                        onOpenProject(project.id, "model"),
                                                },
                                                {
                                                    label:
                                                        project.status === "archived"
                                                            ? "Reactivar"
                                                            : "Archivar",
                                                    icon: "archive",
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
                                                    icon: "trash",
                                                    danger: true,
                                                    separated: true,
                                                    onSelect: () => setDeleting(project),
                                                },
                                            ]}
                                        />
                                    }
                                />
                            </li>
                        ))}
                    </ul>
                )}
            </section>

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

            <section className={styles.section} aria-labelledby="home-quick">
                <header className={styles.sectionHead}>
                    <h2 id="home-quick" className={styles.sectionTitle}>
                        Accesos rápidos
                    </h2>
                </header>
                <div className={styles.quick}>
                    <button
                        type="button"
                        className={styles.quickMain}
                        onClick={() => onNavigate(MAIN_MODULE.id)}
                    >
                        <BlueprintGrid cell={16} />
                        <Icon name={MAIN_MODULE.icon} />
                        <span className={styles.quickMainTitle}>{MAIN_MODULE.label}</span>
                        <span className={styles.quickMainText}>{MAIN_MODULE.description}</span>
                    </button>
                    <ul className={styles.quickList}>
                        {MODULES.filter(
                            (module) => module.id !== "home" && module.id !== MAIN_MODULE.id,
                        ).map((module) => (
                            <li key={module.id}>
                                <button
                                    type="button"
                                    className={styles.quickRow}
                                    onClick={() => onNavigate(module.id)}
                                >
                                    <Icon name={module.icon} />
                                    <span className={styles.quickRowTitle}>{module.label}</span>
                                    <span className={styles.quickRowText}>
                                        {module.description}
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            </section>
        </div>
    );
}
