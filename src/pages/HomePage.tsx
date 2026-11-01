import { Suspense, lazy } from "react";

import { AsyncStatus } from "../components/AsyncStatus";
import { CountUp } from "../components/CountUp";
import { Icon } from "../components/Icon";
import { MODULES, type View } from "../components/Sidebar";
import { describeActivity } from "../components/project/ProjectActivityPanel";
import { StatusBadge } from "../components/ui/Badge";
import { BlueprintGrid } from "../components/ui/Blueprint";
import { Button } from "../components/ui/Button";
import { ProgressBar } from "../components/ui/ProgressBar";
import { Tag, type TagTone } from "../components/ui/Tag";
import { useAsync } from "../hooks/useAsync";
import { viewPath } from "../routes";
import {
    activityApi,
    loadAcrossProjects,
    loadProjectTasks,
    projectsApi,
    summaryApi,
} from "../services/api";
import type { Activity, Project, RenovationStatus, Summary, User } from "../types/api";
import {
    formatDate,
    formatDateTime,
    formatDay,
    formatLongDay,
    formatMoney,
    formatNumber,
    formatRelative,
} from "../utils/format";
import { isOverdue, localDay, taskStatusLabel, upcomingTasks } from "../utils/tasks";
import type { SectionId } from "./sections";

import styles from "./HomePage.module.css";

// The history is read only from the projects touched last, so the home asks for a fixed number of
// lists however many projects there are.
const ACTIVITY_PROJECTS = 5;
const ACTIVITY_PER_PROJECT = 5;
const ACTIVITY_SHOWN = 6;
const TASKS_SHOWN = 5;
// The live model only where the browser can draw it; three.js loads when it is first needed.
const ProjectPreview = lazy(() =>
    import("../components/ProjectPreview").then((module) => ({ default: module.ProjectPreview })),
);
const CAN_DRAW_3D = typeof window !== "undefined" && "WebGL2RenderingContext" in window;
const QUICK_VIEWS: readonly View[] = ["viewer", "terrains", "plans", "materials"];
const STATUS_TONES: Record<RenovationStatus, TagTone> = {
    planned: "neutral",
    in_progress: "info",
    completed: "success",
    cancelled: "neutral",
};

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

interface Figure {
    label: string;
    value: number;
    format: (value: number) => string;
    detail: string;
}

/**
 * The figures of GET /summary. «En progreso», «Completados», «Materiales» and «Planos» came to the
 * API on 20 October: an API without them shows the earlier three, with the cost on its own line.
 */
function figuresOf(summary: Summary): Figure[] {
    const figures: Figure[] = [
        {
            label: "Proyectos",
            value: summary.projects,
            format: formatNumber,
            detail: [
                count(summary.active_projects, "activo", "activos"),
                `${formatNumber(summary.draft_projects)} en borrador`,
                count(summary.archived_projects, "archivado", "archivados"),
            ].join(" · "),
        },
    ];

    if (summary.in_progress_projects !== undefined) {
        figures.push({
            label: "En progreso",
            value: summary.in_progress_projects,
            format: formatNumber,
            detail: "Activos con avance menor al 100 %",
        });
    }

    if (summary.completed_projects !== undefined) {
        figures.push({
            label: "Completados",
            value: summary.completed_projects,
            format: formatNumber,
            detail: "Con el avance al 100 %",
        });
    }

    figures.push({
        label: "Terrenos",
        value: summary.terrains,
        format: formatNumber,
        detail: `${formatNumber(summary.total_area_m2)} m² en total`,
    });

    if (summary.materials === undefined) {
        figures.push({
            label: "Costo de materiales",
            value: summary.materials_total_cost,
            format: formatMoney,
            detail: "Suma de todos los proyectos",
        });
    } else {
        figures.push({
            label: "Materiales",
            value: summary.materials,
            format: formatNumber,
            detail: `${formatMoney(summary.materials_total_cost)} en total`,
        });
    }

    if (summary.plans !== undefined) {
        figures.push({
            label: "Planos",
            value: summary.plans,
            format: formatNumber,
            detail: "En todos tus proyectos",
        });
    }

    return figures;
}

const lastTouched = (first: Project, second: Project) =>
    second.updated_at.localeCompare(first.updated_at);

/** The project to pick up again: the last one touched, unless only archived ones are left. */
function focusOf(projects: Project[]): Project | null {
    const sorted = [...projects].sort(lastTouched);

    return sorted.find((project) => project.status !== "archived") ?? sorted[0] ?? null;
}

async function recentActivity(projects: Project[]): Promise<Activity[]> {
    const pages = await Promise.all(
        projects.map((project) => activityApi.listByProject(project.id, 1, ACTIVITY_PER_PROJECT)),
    );

    return pages
        .flatMap((page) => page.items)
        .sort((first, second) => second.created_at.localeCompare(first.created_at))
        .slice(0, ACTIVITY_SHOWN);
}

/**
 * The start of the day, from what the API returns and nothing else: the greeting, the project to
 * pick up again with the figures of GET /summary beside it, what changed lately, the tasks that
 * are due first and the way into the four working screens.
 */
export function HomePage({ user, onOpenProject, onNavigate, onCreateProject }: HomePageProps) {
    const summary = useAsync(() => summaryApi.get(), []);
    const projects = useAsync(() => projectsApi.list(), []);
    const tasks = useAsync(() => loadAcrossProjects(loadProjectTasks), []);
    const all = projects.data ?? [];
    const focus = focusOf(all);
    const watched = [...all].sort(lastTouched).slice(0, ACTIVITY_PROJECTS);
    const activity = useAsync(() => recentActivity(watched), [watched.map((p) => p.id).join()]);
    const names = new Map(all.map((project) => [project.id, project.name]));
    const today = localDay();
    const upcoming = upcomingTasks(tasks.data?.items ?? [], TASKS_SHOWN);
    const changes = activity.data ?? [];
    const noProjects = projects.data !== null && all.length === 0;

    function create() {
        if (onCreateProject === undefined) {
            onNavigate("projects");
        } else {
            onCreateProject();
        }
    }

    return (
        <div className={styles.home}>
            <header className={styles.welcome}>
                <div>
                    <p className={styles.today}>{formatLongDay(new Date())}</p>
                    <h1 className={styles.greeting}>Hola, {user.name}</h1>
                    <p className={styles.lead}>
                        {noProjects
                            ? "Empieza por tu primer proyecto."
                            : "Retoma el trabajo donde lo dejaste."}
                    </p>
                </div>
                {!noProjects && (
                    <Button icon="plus" onClick={create}>
                        Crear proyecto
                    </Button>
                )}
            </header>

            <section className={styles.focus} aria-labelledby="home-focus">
                <h2 id="home-focus" className={styles.blockTitle}>
                    Proyecto en foco
                </h2>
                <AsyncStatus
                    loading={projects.loading}
                    error={projects.error}
                    onRetry={projects.reload}
                    isEmpty={focus === null}
                    skeleton="cards"
                    emptyTitle="Todavía no tienes proyectos"
                    emptyText="Crea el primero; el terreno, los planos y el modelo se agregan después."
                    emptyAction={
                        <Button icon="plus" onClick={create}>
                            Crear proyecto
                        </Button>
                    }
                />
                {focus !== null && (
                    <div className={styles.focusBody}>
                        <div className={styles.cover}>
                            <BlueprintGrid cell={12} />
                            {CAN_DRAW_3D && (
                                <Suspense fallback={null}>
                                    <ProjectPreview key={focus.id} projectId={focus.id} />
                                </Suspense>
                            )}
                        </div>
                        <div className={styles.focusText}>
                            <h3 className={styles.focusName}>{focus.name}</h3>
                            <p className={styles.focusMeta}>
                                <StatusBadge status={focus.status} />
                                {focus.location !== null && <span>{focus.location}</span>}
                                <span>Actualizado {formatDate(focus.updated_at)}</span>
                            </p>
                            {focus.progress !== undefined && (
                                <ProgressBar
                                    label="Avance"
                                    value={focus.progress / 100}
                                    showValue
                                    size="md"
                                />
                            )}
                            <Button iconEnd="arrowRight" onClick={() => onOpenProject(focus.id)}>
                                Abrir
                            </Button>
                        </div>
                    </div>
                )}
            </section>

            <section className={styles.figures} aria-labelledby="home-figures">
                <h2 id="home-figures" className={styles.blockTitle}>
                    Cifras clave
                </h2>
                <AsyncStatus
                    loading={summary.loading}
                    error={summary.error}
                    onRetry={summary.reload}
                    isEmpty={summary.data === null}
                    skeleton="rows"
                    emptyText=""
                />
                {summary.data !== null && (
                    <dl className={styles.figureList} aria-label="Resumen de tu cuenta">
                        {figuresOf(summary.data).map((figure) => (
                            <div key={figure.label} className={styles.figure}>
                                <dt>{figure.label}</dt>
                                <dd className={styles.value}>
                                    <CountUp value={figure.value} format={figure.format} />
                                </dd>
                                <dd className={styles.detail}>{figure.detail}</dd>
                            </div>
                        ))}
                    </dl>
                )}
            </section>

            <section className={styles.activity} aria-labelledby="home-activity">
                <h2 id="home-activity" className={styles.blockTitle}>
                    Actividad reciente
                </h2>
                <AsyncStatus
                    loading={activity.loading || projects.loading}
                    error={activity.error}
                    onRetry={activity.reload}
                    isEmpty={changes.length === 0}
                    skeleton="rows"
                    emptySize="compact"
                    emptyText="Aquí aparecerá cada cambio que hagas en tus proyectos."
                    emptyAction={
                        <Button variant="secondary" onClick={() => onNavigate("projects")}>
                            Ver proyectos
                        </Button>
                    }
                />
                {changes.length > 0 && (
                    <ol className={styles.rows}>
                        {changes.map((item) => (
                            <li key={item.id} className={styles.row}>
                                <span className={styles.rowMain}>{describeActivity(item)}</span>
                                <span className={styles.rowMeta}>
                                    {names.get(item.project_id) ?? `Proyecto ${item.project_id}`}
                                </span>
                                <time
                                    className={styles.rowEnd}
                                    dateTime={item.created_at}
                                    title={formatDateTime(item.created_at)}
                                >
                                    {formatRelative(item.created_at)}
                                </time>
                            </li>
                        ))}
                    </ol>
                )}
            </section>

            <section className={styles.tasks} aria-labelledby="home-tasks">
                <h2 id="home-tasks" className={styles.blockTitle}>
                    Tareas próximas
                </h2>
                <AsyncStatus
                    loading={tasks.loading}
                    error={tasks.error}
                    onRetry={tasks.reload}
                    isEmpty={upcoming.length === 0}
                    skeleton="rows"
                    emptySize="compact"
                    emptyText="Ninguna tarea pendiente tiene fecha de fin."
                    emptyAction={
                        <Button variant="secondary" onClick={() => onNavigate("tasks")}>
                            Ir a tareas
                        </Button>
                    }
                />
                {upcoming.length > 0 && (
                    <ol className={styles.rows}>
                        {upcoming.map((task) => (
                            <li key={task.id} className={styles.row}>
                                <span className={styles.rowMain}>{task.title}</span>
                                <span className={styles.rowMeta}>
                                    {names.get(task.project_id) ?? `Proyecto ${task.project_id}`}
                                    {" · "}
                                    {formatDay(task.planned_end ?? "")}
                                </span>
                                <span className={styles.rowEnd}>
                                    {isOverdue(task, today) ? (
                                        <Tag tone="warning">Atrasada</Tag>
                                    ) : (
                                        <Tag tone={STATUS_TONES[task.status]}>
                                            {taskStatusLabel(task.status)}
                                        </Tag>
                                    )}
                                </span>
                            </li>
                        ))}
                    </ol>
                )}
            </section>

            <nav className={styles.quick} aria-labelledby="home-quick">
                <h2 id="home-quick" className={styles.blockTitle}>
                    Accesos rápidos
                </h2>
                <ul className={styles.quickList}>
                    {QUICK_VIEWS.map((view) => {
                        const module = MODULES.find((item) => item.id === view);

                        return (
                            module !== undefined && (
                                <li key={view}>
                                    <a
                                        className={styles.quickLink}
                                        href={viewPath(view)}
                                        onClick={(event) => {
                                            event.preventDefault();
                                            onNavigate(view);
                                        }}
                                    >
                                        <Icon name={module.icon} />
                                        {module.label}
                                    </a>
                                </li>
                            )
                        );
                    })}
                </ul>
            </nav>
        </div>
    );
}
