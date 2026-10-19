import type { RenovationLog, RenovationStatus } from "../types/api";

export const TASK_STATUSES: { id: RenovationStatus; label: string }[] = [
    { id: "planned", label: "Planificada" },
    { id: "in_progress", label: "En curso" },
    { id: "completed", label: "Terminada" },
    { id: "cancelled", label: "Cancelada" },
];

export interface TaskProgress {
    total: number;
    planned: number;
    inProgress: number;
    completed: number;
    cancelled: number;
    /** Share of the tasks still standing that are finished, from 0 to 1; `null` without any. */
    done: number | null;
    /** Not finished, with an end date already gone. */
    overdue: number;
}

export function isOverdue(task: RenovationLog, today: string): boolean {
    return (
        task.planned_end !== null &&
        task.planned_end < today &&
        (task.status === "planned" || task.status === "in_progress")
    );
}

/** `today` is a `YYYY-MM-DD` day, like the dates of a task, so they compare as text. */
export function taskProgress(tasks: RenovationLog[], today: string): TaskProgress {
    const count = (status: RenovationStatus) =>
        tasks.filter((task) => task.status === status).length;
    const completed = count("completed");
    const cancelled = count("cancelled");
    const standing = tasks.length - cancelled;

    return {
        total: tasks.length,
        planned: count("planned"),
        inProgress: count("in_progress"),
        completed,
        cancelled,
        done: standing === 0 ? null : completed / standing,
        overdue: tasks.filter((task) => isOverdue(task, today)).length,
    };
}
