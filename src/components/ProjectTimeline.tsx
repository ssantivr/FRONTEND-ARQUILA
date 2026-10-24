import type { CSSProperties } from "react";

import type { Project, RenovationLog } from "../types/api";
import { formatDay } from "../utils/format";
import { TASK_STATUSES } from "../utils/tasks";
import { buildTimeline, dayNumber, dayText, share, type PlacedTask } from "../utils/timeline";

import styles from "./ProjectTimeline.module.css";

interface ProjectTimelineProps {
    projects: readonly Project[];
    tasks: readonly RenovationLog[];
    onOpenProject: (projectId: number) => void;
    /** `YYYY-MM-DD`; a line marks it when it falls inside the range. */
    today: string;
}

const MONTHS = new Intl.DateTimeFormat("es", { month: "short", year: "numeric", timeZone: "UTC" });

function statusLabel(task: RenovationLog): string {
    return TASK_STATUSES.find((status) => status.id === task.status)?.label ?? task.status;
}

/** The dates of a task in words, for screen readers and for the tooltip of its bar. */
function datesInWords(item: PlacedTask): string {
    const parts: string[] = [];

    if (item.start !== null && item.end !== null) {
        parts.push(`del ${formatDay(dayText(item.start))} al ${formatDay(dayText(item.end))}`);
    } else if (item.single !== null) {
        parts.push(
            `${item.singleKind === "start" ? "empieza el" : "termina el"} ${formatDay(dayText(item.single))}, sin la otra fecha`,
        );
    }

    if (item.done !== null) {
        parts.push(`terminada el ${formatDay(dayText(item.done))}`);
    }

    return parts.join("; ");
}

/**
 * The tasks of the listed projects on one time scale, from their real dates only (`planned_start`,
 * `planned_end`, `completed_at`). A bar needs both planned dates; with one, it is a mark. Tasks
 * without dates are listed apart. The API has no project dates of its own, so a project spans
 * what its tasks span.
 */
export function ProjectTimeline({ projects, tasks, onOpenProject, today }: ProjectTimelineProps) {
    const ids = new Set(projects.map((project) => project.id));
    const mine = tasks.filter((task) => ids.has(task.project_id));
    const timeline = buildTimeline(mine);
    const { from, to } = timeline;
    const withoutTasks = projects.filter((project) =>
        mine.every((task) => task.project_id !== project.id),
    );
    const todayDay = dayNumber(today);
    const at = (day: number) => (from === null || to === null ? 0 : share(day, from, to) * 100);
    const position = (day: number): CSSProperties => ({ "--at": `${at(day)}%` }) as CSSProperties;

    return (
        <div className={styles.timeline}>
            {from !== null && to !== null ? (
                <div className={styles.chart}>
                    <div className={styles.scale} aria-hidden="true">
                        <span className={styles.scaleLabel}>Tarea</span>
                        <div className={styles.track}>
                            <span className={styles.edge}>{formatDay(dayText(from))}</span>
                            {/* A month too close to an end would run into its date. */}
                            {timeline.months
                                .filter((month) => at(month) > 12 && at(month) < 88)
                                .map((month) => (
                                    <span
                                        key={month}
                                        className={styles.month}
                                        style={position(month)}
                                    >
                                        {MONTHS.format(new Date(month * 86_400_000))}
                                    </span>
                                ))}
                            <span className={`${styles.edge} ${styles.edgeEnd}`}>
                                {formatDay(dayText(to))}
                            </span>
                        </div>
                    </div>
                    {projects.map((project) => {
                        const rows = timeline.placed.filter(
                            (item) => item.task.project_id === project.id,
                        );

                        if (rows.length === 0) {
                            return null;
                        }

                        return (
                            <section
                                key={project.id}
                                className={styles.group}
                                aria-labelledby={`timeline-${project.id}`}
                            >
                                <h3 id={`timeline-${project.id}`} className={styles.groupTitle}>
                                    <button type="button" onClick={() => onOpenProject(project.id)}>
                                        {project.name}
                                    </button>
                                    <span>
                                        {rows.length === 1
                                            ? "1 tarea con fechas"
                                            : `${rows.length} tareas con fechas`}
                                    </span>
                                </h3>
                                <ul className={styles.rows}>
                                    {rows.map((item) => (
                                        <li key={item.task.id} className={styles.row}>
                                            <span className={styles.label}>
                                                <span className={styles.title}>
                                                    {item.task.title}
                                                </span>
                                                <span
                                                    className={styles.status}
                                                    data-status={item.task.status}
                                                >
                                                    {statusLabel(item.task)}
                                                </span>
                                                <span className="visually-hidden">
                                                    {datesInWords(item)}
                                                </span>
                                            </span>
                                            <span
                                                className={styles.track}
                                                aria-hidden="true"
                                                title={datesInWords(item)}
                                            >
                                                {todayDay >= from && todayDay <= to && (
                                                    <span
                                                        className={styles.today}
                                                        style={position(todayDay)}
                                                    />
                                                )}
                                                {item.start !== null && item.end !== null && (
                                                    <span
                                                        className={styles.bar}
                                                        data-status={item.task.status}
                                                        style={
                                                            {
                                                                "--at": `${at(item.start)}%`,
                                                                "--to": `${at(item.end)}%`,
                                                            } as CSSProperties
                                                        }
                                                    />
                                                )}
                                                {item.single !== null && (
                                                    <span
                                                        className={styles.point}
                                                        data-status={item.task.status}
                                                        style={position(item.single)}
                                                    />
                                                )}
                                                {item.done !== null && (
                                                    <span
                                                        className={styles.done}
                                                        style={position(item.done)}
                                                    />
                                                )}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        );
                    })}
                    <p className={styles.legend}>
                        <span>
                            <span className={styles.legendBar} /> Plazo previsto (inicio y fin)
                        </span>
                        <span>
                            <span className={styles.legendPoint} /> Solo una fecha prevista
                        </span>
                        <span>
                            <span className={styles.legendDone} /> Día en que se terminó
                        </span>
                        {todayDay >= from && todayDay <= to && (
                            <span>
                                <span className={styles.legendToday} /> Hoy
                            </span>
                        )}
                    </p>
                </div>
            ) : (
                <p className="message" role="status">
                    Ninguna tarea de estos proyectos tiene fechas todavía.
                </p>
            )}

            {timeline.undated.length > 0 && (
                <section className={styles.apart} aria-labelledby="timeline-undated">
                    <h3 id="timeline-undated">Tareas sin fechas</h3>
                    <p className="message">
                        No tienen inicio, fin ni día de término, así que no se colocan en el
                        cronograma.
                    </p>
                    <ul>
                        {timeline.undated.map((task) => (
                            <li key={task.id}>
                                <span>{task.title}</span>
                                <span className={styles.apartProject}>
                                    {projects.find((project) => project.id === task.project_id)
                                        ?.name ?? ""}{" "}
                                    · {statusLabel(task)}
                                </span>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {withoutTasks.length > 0 && (
                <p className={`message ${styles.none}`}>
                    Sin tareas registradas: {withoutTasks.map((project) => project.name).join(", ")}
                    .
                </p>
            )}
        </div>
    );
}
