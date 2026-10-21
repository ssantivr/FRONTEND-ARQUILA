import { useState, type FormEvent } from "react";

import { useAsync } from "../../hooks/useAsync";
import { tasksApi } from "../../services/api";
import { showToast } from "../../state/toasts";
import type { Task, TaskStatus } from "../../types/api";
import type { SectionProps } from "../../types/ui";
import { formatDay } from "../../utils/format";
import { AsyncStatus } from "../AsyncStatus";
import { Unavailable } from "../Unavailable";
import { Button } from "../ui/Button";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { Checkbox, Input, Select, SelectControl, Textarea } from "../ui/Input";
import { Panel } from "../ui/Panel";
import { ProgressBar } from "../ui/ProgressBar";

import styles from "./ProjectPanels.module.css";

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
    todo: "Por hacer",
    in_progress: "En curso",
    done: "Hecha",
};

const STATUSES = Object.keys(TASK_STATUS_LABELS) as TaskStatus[];

interface ProjectTasksPanelProps extends SectionProps {
    /** The owner of the project: the only person a task can be assigned to. */
    ownerId: number;
    /** Today as `YYYY-MM-DD`, to mark the tasks that are late. */
    today: string;
}

interface Draft {
    title: string;
    description: string;
    status: TaskStatus;
    due: string;
    progress: string;
    mine: boolean;
}

const EMPTY: Draft = {
    title: "",
    description: "",
    status: "todo",
    due: "",
    progress: "0",
    mine: true,
};

function draftOf(task: Task): Draft {
    return {
        title: task.title,
        description: task.description ?? "",
        status: task.status,
        due: task.due_date ?? "",
        progress: String(task.progress),
        mine: task.assignee_id !== null,
    };
}

/** What the form says, as the API wants it. A task that is done is at 100 % (a rule of the API). */
function payloadOf(draft: Draft, ownerId: number) {
    return {
        title: draft.title.trim(),
        description: draft.description.trim() === "" ? null : draft.description.trim(),
        status: draft.status,
        due_date: draft.due === "" ? null : draft.due,
        progress: draft.status === "done" ? 100 : Number(draft.progress),
        assignee_id: draft.mine ? ownerId : null,
    };
}

function progressError(draft: Draft): string | null {
    const value = Number(draft.progress);

    if (draft.status === "done") {
        return null;
    }

    return draft.progress === "" || !Number.isInteger(value) || value < 0 || value > 100
        ? "Un número entero de 0 a 100."
        : null;
}

/**
 * The tasks of the project (`/projects/{id}/tasks`): who does them, when, their state and their
 * real progress. Projects are not shared, so a task is either the owner's or nobody's.
 */
export function ProjectTasksPanel({ projectId, run, ownerId, today }: ProjectTasksPanelProps) {
    const [filter, setFilter] = useState<TaskStatus | "">("");
    const tasks = useAsync(() => tasksApi.listByProject(projectId), [projectId]);
    const [creating, setCreating] = useState(false);
    const [draft, setDraft] = useState<Draft>(EMPTY);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [removing, setRemoving] = useState<Task | null>(null);
    // The errors of the form show once it was sent, not while it is being filled in.
    const [tried, setTried] = useState(false);
    const all = tasks.data ?? [];
    const shown = all.filter((task) => filter === "" || task.status === filter);
    const done = all.filter((task) => task.status === "done").length;
    const average =
        all.length === 0 ? null : all.reduce((sum, task) => sum + task.progress, 0) / all.length;

    function open(next: Task | null) {
        setTried(false);
        setEditingId(next?.id ?? null);
        setCreating(next === null);
        setDraft(next === null ? EMPTY : draftOf(next));
    }

    function close() {
        setTried(false);
        setCreating(false);
        setEditingId(null);
        setDraft(EMPTY);
    }

    function handleSubmit(event: FormEvent) {
        event.preventDefault();
        setTried(true);

        if (draft.title.trim() === "" || progressError(draft) !== null) {
            return;
        }

        const data = payloadOf(draft, ownerId);
        const id = editingId;

        void run(
            () => (id === null ? tasksApi.create(projectId, data) : tasksApi.update(id, data)),
            () => {
                close();
                tasks.reload();
                showToast(id === null ? "Tarea creada." : "Tarea guardada.");
            },
        );
    }

    function setStatus(task: Task, status: TaskStatus) {
        void run(
            () =>
                tasksApi.update(
                    task.id,
                    status === "done" ? { status, progress: 100 } : { status },
                ),
            tasks.reload,
        );
    }

    if (tasks.unavailable) {
        return (
            <Panel title="Tareas">
                <Unavailable what="Las tareas" />
            </Panel>
        );
    }

    const form = (creating || editingId !== null) && (
        <form className={styles.form} noValidate onSubmit={handleSubmit}>
            <div className={styles.wide}>
                <Input
                    label="Título"
                    value={draft.title}
                    maxLength={160}
                    required
                    autoFocus
                    error={tried && draft.title.trim() === "" ? "Escribe un título." : null}
                    onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                />
            </div>
            <Select
                label="Estado"
                value={draft.status}
                onChange={(event) =>
                    setDraft({ ...draft, status: event.target.value as TaskStatus })
                }
            >
                {STATUSES.map((status) => (
                    <option key={status} value={status}>
                        {TASK_STATUS_LABELS[status]}
                    </option>
                ))}
            </Select>
            <Input
                label="Fecha límite"
                type="date"
                optional
                value={draft.due}
                onChange={(event) => setDraft({ ...draft, due: event.target.value })}
            />
            <Input
                label="Avance"
                type="number"
                unit="%"
                inputMode="numeric"
                min={0}
                max={100}
                step={1}
                disabled={draft.status === "done"}
                hint={draft.status === "done" ? "Una tarea hecha está al 100 %." : undefined}
                value={draft.status === "done" ? "100" : draft.progress}
                error={progressError(draft)}
                onChange={(event) => setDraft({ ...draft, progress: event.target.value })}
            />
            <Checkbox
                label="Asignada a mí"
                description="Los proyectos no se comparten: solo tú puedes ser el responsable."
                checked={draft.mine}
                onChange={(event) => setDraft({ ...draft, mine: event.target.checked })}
            />
            <div className={styles.wide}>
                <Textarea
                    label="Descripción"
                    optional
                    rows={2}
                    maxLength={2000}
                    value={draft.description}
                    onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                />
            </div>
            <div className={`${styles.formActions} ${styles.wide}`}>
                <Button type="submit" disabled={progressError(draft) !== null}>
                    {editingId === null ? "Crear tarea" : "Guardar la tarea"}
                </Button>
                <Button variant="secondary" onClick={close}>
                    Cancelar
                </Button>
            </div>
        </form>
    );

    return (
        <Panel
            title="Tareas"
            description={
                all.length === 0
                    ? "Lo que falta por hacer en el proyecto, con su responsable, fecha y avance."
                    : `${done} de ${all.length} hechas${average === null ? "" : ` · avance medio ${Math.round(average)} %`}`
            }
            actions={
                !creating && (
                    <Button icon="plus" onClick={() => open(null)}>
                        Nueva tarea
                    </Button>
                )
            }
        >
            {creating && form}
            {all.length > 0 && (
                <div className={styles.toolbar}>
                    <SelectControl
                        aria-label="Filtrar tareas por estado"
                        value={filter}
                        onChange={(event) => setFilter(event.target.value as TaskStatus | "")}
                    >
                        <option value="">Todos los estados</option>
                        {STATUSES.map((status) => (
                            <option key={status} value={status}>
                                {TASK_STATUS_LABELS[status]}
                            </option>
                        ))}
                    </SelectControl>
                </div>
            )}
            <AsyncStatus
                loading={tasks.loading}
                error={tasks.error}
                onRetry={tasks.reload}
                isEmpty={shown.length === 0}
                skeleton="rows"
                emptyTitle={all.length === 0 ? "Sin tareas" : "Ninguna tarea en ese estado"}
                emptyText={
                    all.length === 0
                        ? "Crea la primera con «Nueva tarea»."
                        : "Elige otro estado en el filtro."
                }
            />
            {shown.length > 0 && (
                <ul className={styles.list} aria-label="Tareas del proyecto">
                    {shown.map((task) =>
                        task.id === editingId ? (
                            <li key={task.id}>{form}</li>
                        ) : (
                            <li
                                key={task.id}
                                className={
                                    task.status === "done"
                                        ? `${styles.row} ${styles.done}`
                                        : styles.row
                                }
                            >
                                <div className={styles.rowMain}>
                                    <h3 className={styles.rowTitle}>{task.title}</h3>
                                    <p className={styles.meta}>
                                        <span>{TASK_STATUS_LABELS[task.status]}</span>
                                        <span>
                                            {task.assignee_id === null
                                                ? "Sin responsable"
                                                : "Responsable: tú"}
                                        </span>
                                        {task.due_date !== null && (
                                            <span
                                                className={
                                                    task.status !== "done" && task.due_date < today
                                                        ? styles.overdue
                                                        : undefined
                                                }
                                            >
                                                {task.status !== "done" && task.due_date < today
                                                    ? `Vencida el ${formatDay(task.due_date)}`
                                                    : `Para el ${formatDay(task.due_date)}`}
                                            </span>
                                        )}
                                    </p>
                                    {task.description !== null && (
                                        <p className={styles.meta}>{task.description}</p>
                                    )}
                                    <div className={styles.progress}>
                                        <span aria-hidden="true">Avance {task.progress} %</span>
                                        <ProgressBar
                                            label={`Avance de «${task.title}»`}
                                            value={task.progress / 100}
                                        />
                                    </div>
                                </div>
                                <div className={styles.rowActions}>
                                    <SelectControl
                                        aria-label={`Estado de «${task.title}»`}
                                        value={task.status}
                                        onChange={(event) =>
                                            setStatus(task, event.target.value as TaskStatus)
                                        }
                                    >
                                        {STATUSES.map((status) => (
                                            <option key={status} value={status}>
                                                {TASK_STATUS_LABELS[status]}
                                            </option>
                                        ))}
                                    </SelectControl>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        icon="edit"
                                        aria-label={`Editar «${task.title}»`}
                                        onClick={() => open(task)}
                                    >
                                        Editar
                                    </Button>
                                    <Button
                                        variant="tertiary"
                                        size="sm"
                                        icon="trash"
                                        aria-label={`Eliminar «${task.title}»`}
                                        onClick={() => setRemoving(task)}
                                    >
                                        Eliminar
                                    </Button>
                                </div>
                            </li>
                        ),
                    )}
                </ul>
            )}
            {removing !== null && (
                <ConfirmDialog
                    title={`¿Eliminar la tarea «${removing.title}»?`}
                    confirmLabel="Eliminar la tarea"
                    danger
                    onConfirm={() =>
                        void run(
                            () => tasksApi.remove(removing.id),
                            () => {
                                setRemoving(null);
                                tasks.reload();
                                showToast("Tarea eliminada.");
                            },
                        )
                    }
                    onCancel={() => setRemoving(null)}
                >
                    <p>No se puede deshacer.</p>
                </ConfirmDialog>
            )}
        </Panel>
    );
}
