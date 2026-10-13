import { useState, type FormEvent } from "react";

import { AsyncStatus } from "../components/AsyncStatus";
import { WORK_LAYERS, layerLabel } from "../components/RoomWorksPanel";
import { Button } from "../components/ui/Button";
import { ProgressBar } from "../components/ui/ProgressBar";
import { errorMessage, useAsync } from "../hooks/useAsync";
import { loadAcrossProjects, walkthroughApi } from "../services/api";
import { showToast } from "../state/toasts";
import type { RenovationLog, RenovationStatus, SpatialLayer } from "../types/api";
import { formatMoney, formatNumber } from "../utils/format";
import { TASK_STATUSES, isOverdue, taskProgress } from "../utils/tasks";
import { LiveForm } from "../components/ui/LiveForm";

// Kept outside the component: the cache of `loadAcrossProjects` is keyed by this function.
const loadTasks = (projectId: number) =>
    walkthroughApi.get(projectId).then((walkthrough) => walkthrough.renovation_logs);

function formatDay(day: string): string {
    const [year, month, date] = day.split("-");

    return `${date}/${month}/${year}`;
}

function timeline(task: RenovationLog): string {
    if (task.planned_start !== null && task.planned_end !== null) {
        return `${formatDay(task.planned_start)} – ${formatDay(task.planned_end)}`;
    }

    if (task.planned_start !== null) {
        return `Desde el ${formatDay(task.planned_start)}`;
    }

    return task.planned_end !== null ? `Hasta el ${formatDay(task.planned_end)}` : "Sin fechas";
}

function localDay(): string {
    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, "0");

    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

interface TasksPageProps {
    onOpenProject: (projectId: number) => void;
}

export function TasksPage({ onOpenProject }: TasksPageProps) {
    const data = useAsync(() => loadAcrossProjects(loadTasks), []);
    const [query, setQuery] = useState("");
    const [projectFilter, setProjectFilter] = useState("");
    const [layerFilter, setLayerFilter] = useState("");
    const [creating, setCreating] = useState(false);
    const [saving, setSaving] = useState(false);
    const [busyId, setBusyId] = useState<number | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const [statusError, setStatusError] = useState<string | null>(null);
    const [title, setTitle] = useState("");
    const [newProject, setNewProject] = useState("");
    const [newLayer, setNewLayer] = useState<SpatialLayer>("finishes");
    const [start, setStart] = useState("");
    const [end, setEnd] = useState("");
    const tasks = data.data?.items ?? [];
    const projects = data.data?.projects ?? [];
    const projectNames = new Map(projects.map((project) => [project.id, project.name]));
    const today = localDay();
    const wanted = query.trim().toLowerCase();
    const filtered = wanted !== "" || projectFilter !== "" || layerFilter !== "";
    const shown = tasks.filter(
        (task) =>
            (wanted === "" || task.title.toLowerCase().includes(wanted)) &&
            (projectFilter === "" || task.project_id === Number(projectFilter)) &&
            (layerFilter === "" || task.layer === layerFilter),
    );
    const progress = taskProgress(tasks, today);
    const targetProject = newProject === "" ? (projects[0]?.id ?? null) : Number(newProject);

    function changeStatus(task: RenovationLog, status: RenovationStatus) {
        setBusyId(task.id);
        setStatusError(null);
        walkthroughApi
            .setLogStatus(task.id, status)
            .then(() => {
                showToast(`«${task.title}» pasó a ${statusLabel(status).toLowerCase()}.`);
                data.reload();
            })
            .catch((reason: unknown) =>
                setStatusError(
                    `No se cambió el estado de «${task.title}»: ${errorMessage(reason)}`,
                ),
            )
            .finally(() => setBusyId(null));
    }

    function handleCreate(event: FormEvent) {
        event.preventDefault();

        if (targetProject === null || saving) {
            return;
        }

        if (start !== "" && end !== "" && end < start) {
            setFormError("La fecha de fin no puede ser anterior a la de inicio.");
            return;
        }

        setSaving(true);
        setFormError(null);
        walkthroughApi
            .createLog({
                project_id: targetProject,
                room_id: null,
                layer: newLayer,
                title: title.trim(),
                ...(start === "" ? {} : { planned_start: start }),
                ...(end === "" ? {} : { planned_end: end }),
            })
            .then(() => {
                showToast("Tarea creada.");
                setTitle("");
                setStart("");
                setEnd("");
                setCreating(false);
                data.reload();
            })
            .catch((reason: unknown) => setFormError(errorMessage(reason)))
            .finally(() => setSaving(false));
    }

    return (
        <>
            <header className="page-head">
                <div>
                    <h2>
                        {data.data === null
                            ? "Tareas"
                            : tasks.length === 1
                              ? "1 tarea"
                              : `${formatNumber(tasks.length)} tareas`}
                    </h2>
                    <p className="page-head-meta">
                        Obras registradas en todos tus proyectos · el avance sale de su estado
                    </p>
                </div>
                {tasks.length > 0 && (
                    <dl className="stat-strip">
                        <div>
                            <dt>En curso</dt>
                            <dd>{progress.inProgress}</dd>
                        </div>
                        <div>
                            <dt>Terminadas</dt>
                            <dd>
                                {progress.completed} de {progress.total - progress.cancelled}
                            </dd>
                        </div>
                        <div>
                            <dt>Atrasadas</dt>
                            <dd>{progress.overdue}</dd>
                        </div>
                    </dl>
                )}
                <div className="page-head-actions">
                    <Button
                        className="button-lime"
                        aria-expanded={creating}
                        disabled={projects.length === 0}
                        onClick={() => setCreating((open) => !open)}
                    >
                        Nueva tarea
                    </Button>
                </div>
            </header>

            {progress.done !== null && (
                <div className="task-progress">
                    <ProgressBar label="Avance de las tareas" value={progress.done} />
                    <span>{Math.round(progress.done * 100)} % terminado</span>
                </div>
            )}

            {creating && (
                <section className="panel create-panel" aria-label="Nueva tarea">
                    <LiveForm className="form-row" onSubmit={handleCreate}>
                        <label className="field-wide">
                            Tarea
                            <input
                                value={title}
                                onChange={(event) => setTitle(event.target.value)}
                                maxLength={160}
                                placeholder="Impermeabilizar la cubierta"
                                autoFocus
                                required
                            />
                        </label>
                        <label>
                            Proyecto
                            <select
                                value={targetProject ?? ""}
                                onChange={(event) => setNewProject(event.target.value)}
                            >
                                {projects.map((project) => (
                                    <option key={project.id} value={project.id}>
                                        {project.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label>
                            Capa
                            <select
                                value={newLayer}
                                onChange={(event) =>
                                    setNewLayer(event.target.value as SpatialLayer)
                                }
                            >
                                {WORK_LAYERS.map((layer) => (
                                    <option key={layer.id} value={layer.id}>
                                        {layer.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label>
                            Inicio previsto
                            <input
                                type="date"
                                value={start}
                                onChange={(event) => setStart(event.target.value)}
                            />
                        </label>
                        <label>
                            Fin previsto
                            <input
                                type="date"
                                value={end}
                                min={start === "" ? undefined : start}
                                onChange={(event) => setEnd(event.target.value)}
                            />
                        </label>
                        <Button type="submit" loading={saving} disabled={title.trim() === ""}>
                            Crear tarea
                        </Button>
                        <Button variant="tertiary" onClick={() => setCreating(false)}>
                            Cancelar
                        </Button>
                    </LiveForm>
                    {formError !== null && (
                        <p className="message message-error" role="alert">
                            {formError}
                        </p>
                    )}
                </section>
            )}

            <section className="list-section" aria-label="Tablero de tareas">
                {tasks.length > 0 && (
                    <div className="list-toolbar">
                        <input
                            type="search"
                            placeholder="Buscar tarea"
                            aria-label="Buscar tarea por nombre"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                        />
                        <select
                            aria-label="Filtrar por proyecto"
                            value={projectFilter}
                            onChange={(event) => setProjectFilter(event.target.value)}
                        >
                            <option value="">Todos los proyectos</option>
                            {projects.map((project) => (
                                <option key={project.id} value={project.id}>
                                    {project.name}
                                </option>
                            ))}
                        </select>
                        <select
                            aria-label="Filtrar por capa"
                            value={layerFilter}
                            onChange={(event) => setLayerFilter(event.target.value)}
                        >
                            <option value="">Todas las capas</option>
                            {WORK_LAYERS.map((layer) => (
                                <option key={layer.id} value={layer.id}>
                                    {layer.label}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                <AsyncStatus
                    loading={data.loading}
                    error={data.error}
                    onRetry={data.reload}
                    isEmpty={shown.length === 0}
                    skeleton="cards"
                    emptyTitle={filtered ? "Sin coincidencias" : "Sin tareas"}
                    emptyText={
                        filtered
                            ? "Ninguna tarea coincide con la búsqueda o los filtros."
                            : projects.length === 0
                              ? "Crea un proyecto para poder registrar sus tareas."
                              : "Todavía no hay tareas. Registra la primera con «Nueva tarea», o desde un cuarto aislado en el modelo 3D."
                    }
                    emptyAction={
                        filtered ? (
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    setQuery("");
                                    setProjectFilter("");
                                    setLayerFilter("");
                                }}
                            >
                                Quitar filtros
                            </Button>
                        ) : undefined
                    }
                />

                {statusError !== null && (
                    <p className="message message-error" role="alert">
                        {statusError}
                    </p>
                )}

                {shown.length > 0 && (
                    <div className="task-board">
                        {TASK_STATUSES.map((status) => {
                            const column = shown.filter((task) => task.status === status.id);

                            return (
                                <section
                                    key={status.id}
                                    className={`task-column task-column-${status.id}`}
                                    aria-label={status.label}
                                >
                                    <h3>
                                        {status.label}
                                        <span className="task-count">{column.length}</span>
                                    </h3>
                                    {column.length === 0 ? (
                                        <p className="task-empty">Nada aquí.</p>
                                    ) : (
                                        <ul>
                                            {column.map((task) => (
                                                <li key={task.id} className="task-card">
                                                    <strong>{task.title}</strong>
                                                    {task.description !== null && (
                                                        <p>{task.description}</p>
                                                    )}
                                                    <button
                                                        type="button"
                                                        className="button-tertiary task-project"
                                                        onClick={() =>
                                                            onOpenProject(task.project_id)
                                                        }
                                                    >
                                                        {projectNames.get(task.project_id) ??
                                                            `Proyecto ${task.project_id}`}
                                                    </button>
                                                    <dl>
                                                        <div>
                                                            <dt>Capa</dt>
                                                            <dd>{layerLabel(task.layer)}</dd>
                                                        </div>
                                                        <div>
                                                            <dt>Fechas</dt>
                                                            <dd>
                                                                {timeline(task)}
                                                                {isOverdue(task, today) && (
                                                                    <span className="badge task-late">
                                                                        Atrasada
                                                                    </span>
                                                                )}
                                                            </dd>
                                                        </div>
                                                        {task.estimated_cost !== null && (
                                                            <div>
                                                                <dt>Costo estimado</dt>
                                                                <dd>
                                                                    {formatMoney(
                                                                        task.estimated_cost,
                                                                    )}
                                                                </dd>
                                                            </div>
                                                        )}
                                                    </dl>
                                                    <select
                                                        aria-label={`Estado de «${task.title}»`}
                                                        value={task.status}
                                                        disabled={busyId !== null}
                                                        onChange={(event) =>
                                                            changeStatus(
                                                                task,
                                                                event.target
                                                                    .value as RenovationStatus,
                                                            )
                                                        }
                                                    >
                                                        {TASK_STATUSES.map((option) => (
                                                            <option
                                                                key={option.id}
                                                                value={option.id}
                                                            >
                                                                {option.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </section>
                            );
                        })}
                    </div>
                )}
            </section>
        </>
    );
}

function statusLabel(status: RenovationStatus): string {
    return TASK_STATUSES.find((item) => item.id === status)?.label ?? status;
}
