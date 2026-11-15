import { useId, useRef, useState } from "react";

import { useAsync } from "../../hooks/useAsync";
import { activityApi } from "../../services/api";
import { SOURCE_MODULES, type ActivityFilters, type SourceModule } from "../../types/activity";
import type { Activity } from "../../types/api";
import {
    formatHistoryDay,
    formatHistoryTime,
    formatRelative,
    formatUtc,
    historyDayKey,
} from "../../utils/format";
import { AsyncStatus } from "../AsyncStatus";
import { Icon } from "../Icon";
import { Unavailable } from "../Unavailable";
import { Button } from "../ui/Button";
import { Input, Select } from "../ui/Input";
import { Pagination } from "../ui/Pagination";
import { Panel } from "../ui/Panel";

import {
    activityIcon,
    changeEntries,
    describeActivity,
    describeSource,
    MODULE_LABELS,
} from "./activityText";

import styles from "./ProjectPanels.module.css";

export { describeActivity, describeChanges, describeSource } from "./activityText";

const PAGE_SIZE = 20;

type Origin = NonNullable<ActivityFilters["origin"]>;

const ORIGIN_LABELS: Record<Origin, string> = {
    user: "Usuario",
    ai: "IA",
    system: "Sistema",
};

/** What the filter controls hold: an empty string means «all»; days are local `YYYY-MM-DD`. */
export interface HistoryFilterValues {
    origin: Origin | "";
    sourceModule: SourceModule | "";
    fromDay: string;
    toDay: string;
}

export const NO_FILTERS: HistoryFilterValues = {
    origin: "",
    sourceModule: "",
    fromDay: "",
    toDay: "",
};

/** The days a date field accepts: four-digit years, and a last day whose next midnight still
 *  has four digits (the range ends there). */
const FIRST_DAY = "1900-01-01";
const LAST_DAY = "9999-12-30";

/** A `YYYY-MM-DD` day the fields accept; anything else is left out of the filters. */
function isDay(day: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(day) && day >= FIRST_DAY && day <= LAST_DAY;
}

/** The local midnight that opens `day` (`YYYY-MM-DD`), `days` later, as a UTC instant. */
function localMidnight(day: string, days = 0): string {
    const [year, month, date] = day.split("-").map(Number);

    return new Date(year, month - 1, date + days).toISOString();
}

/**
 * The API filters of what the controls hold. The range covers whole local days, from the start
 * of «Desde» to the end of «Hasta». A range that ends before it starts is not sent.
 */
export function toApiFilters(values: HistoryFilterValues): {
    filters: ActivityFilters;
    rangeError: boolean;
} {
    const fromDay = isDay(values.fromDay) ? values.fromDay : "";
    const toDay = isDay(values.toDay) ? values.toDay : "";
    const rangeError = fromDay !== "" && toDay !== "" && fromDay > toDay;
    const filters: ActivityFilters = {};

    if (values.origin !== "") {
        filters.origin = values.origin;
    }

    if (values.sourceModule !== "") {
        filters.sourceModule = values.sourceModule;
    }

    if (!rangeError && fromDay !== "") {
        filters.from = localMidnight(fromDay);
    }

    if (!rangeError && toDay !== "") {
        filters.to = localMidnight(toDay, 1);
    }

    return { filters, rangeError };
}

/** The entries of a page split by local day, in the order they come. */
export function groupByDay(
    items: Activity[],
    timeZone?: string,
): { key: string; day: string; items: Activity[] }[] {
    const groups: { key: string; day: string; items: Activity[] }[] = [];

    for (const item of items) {
        const key = historyDayKey(item.created_at, timeZone);
        const last = groups[groups.length - 1] as (typeof groups)[number] | undefined;

        if (last !== undefined && last.key === key) {
            last.items.push(item);
        } else {
            groups.push({ key, day: formatHistoryDay(item.created_at, timeZone), items: [item] });
        }
    }

    return groups;
}

/** One entry: what changed, the values, where it came from and when. */
export function ActivityRow({ item, timeZone }: { item: Activity; timeZone?: string }) {
    const changes = changeEntries(item);
    const source = describeSource(item);

    return (
        <li className={`${styles.row} ${styles.activityRow}`}>
            <span className={styles.activityIcon}>
                <Icon name={activityIcon(item.action)} />
            </span>
            <div className={styles.rowMain}>
                <p className={styles.rowTitle}>{describeActivity(item)}</p>
                {changes.length > 0 && (
                    <ul className={styles.changes} aria-label="Valores antes y después">
                        {changes.map((change) => (
                            <li key={change.field}>{change.text}</li>
                        ))}
                    </ul>
                )}
                {source !== "" && <p className={styles.meta}>{source}</p>}
            </div>
            <time
                className={`${styles.meta} ${styles.when}`}
                dateTime={item.created_at}
                title={formatUtc(item.created_at)}
            >
                <span>{formatHistoryTime(item.created_at, timeZone)}</span>
                <span>{formatRelative(item.created_at)}</span>
            </time>
        </li>
    );
}

/** What happened in the project, the latest first, as the API records it. */
export function ProjectActivityPanel({ projectId }: { projectId: number }) {
    const [page, setPage] = useState(1);
    const [values, setValues] = useState<HistoryFilterValues>(NO_FILTERS);
    const filtersRef = useRef<HTMLDivElement>(null);
    const rangeErrorId = useId();
    const { filters, rangeError } = toApiFilters(values);
    const activity = useAsync(
        () => activityApi.listByProject(projectId, page, PAGE_SIZE, filters),
        [projectId, page, values],
    );
    const items = activity.data?.items ?? [];
    // Any control with a value can be cleared; only filters really sent narrow the list.
    const filtered = Object.values(values).some((value) => value !== "");
    const narrowed = Object.keys(filters).length > 0;

    function change(next: Partial<HistoryFilterValues>) {
        setValues((current) => ({ ...current, ...next }));
        setPage(1);
    }

    function clearFilters() {
        change(NO_FILTERS);
        // The button goes away with the filters: keep the keyboard in the filter row.
        filtersRef.current?.querySelector("select")?.focus();
    }

    if (activity.unavailable) {
        return (
            <Panel title="Historial">
                <Unavailable what="El historial de cambios" plural={false} />
            </Panel>
        );
    }

    return (
        <Panel
            title="Historial"
            description="Los cambios guardados en el proyecto, del más reciente al más antiguo. No incluye las recomendaciones automáticas."
            actions={
                filtered ? (
                    <Button variant="ghost" size="sm" icon="close" onClick={clearFilters}>
                        Quitar filtros
                    </Button>
                ) : undefined
            }
        >
            <div
                ref={filtersRef}
                className={styles.filters}
                role="search"
                aria-label="Filtrar el historial"
            >
                <div className={styles.filterPair}>
                    <Select
                        label="Origen"
                        value={values.origin}
                        onChange={(event) => change({ origin: event.target.value as Origin | "" })}
                    >
                        <option value="">Todos</option>
                        {(Object.keys(ORIGIN_LABELS) as Origin[]).map((origin) => (
                            <option key={origin} value={origin}>
                                {ORIGIN_LABELS[origin]}
                            </option>
                        ))}
                    </Select>
                    <Select
                        label="Módulo"
                        value={values.sourceModule}
                        onChange={(event) =>
                            change({ sourceModule: event.target.value as SourceModule | "" })
                        }
                    >
                        <option value="">Todos</option>
                        {SOURCE_MODULES.map((module) => (
                            <option key={module} value={module}>
                                {MODULE_LABELS[module]}
                            </option>
                        ))}
                    </Select>
                </div>
                <div className={styles.filterPair}>
                    <Input
                        label="Desde"
                        type="date"
                        value={values.fromDay}
                        min={FIRST_DAY}
                        max={values.toDay || LAST_DAY}
                        aria-invalid={rangeError || undefined}
                        aria-describedby={rangeError ? rangeErrorId : undefined}
                        onChange={(event) => change({ fromDay: event.target.value })}
                    />
                    <Input
                        label="Hasta"
                        noteId={rangeErrorId}
                        type="date"
                        value={values.toDay}
                        min={values.fromDay || FIRST_DAY}
                        max={LAST_DAY}
                        error={
                            rangeError
                                ? "«Hasta» es anterior a «Desde». Corrige el rango para filtrar."
                                : null
                        }
                        onChange={(event) => change({ toDay: event.target.value })}
                    />
                </div>
            </div>
            <AsyncStatus
                loading={activity.loading}
                error={activity.error}
                onRetry={activity.reload}
                isEmpty={items.length === 0}
                skeleton="rows"
                emptyTitle={
                    narrowed ? "Ningún cambio coincide con los filtros" : "Sin cambios registrados"
                }
                emptyText={
                    narrowed
                        ? "Cambia o quita los filtros para ver más cambios."
                        : "Cada vez que se cree, cambie o elimine algo del proyecto aparecerá aquí."
                }
            />
            {items.length > 0 && (
                <ol className={styles.days} aria-label="Cambios del proyecto">
                    {groupByDay(items).map((group) => (
                        <li key={group.key} className={styles.day}>
                            <h3 className={styles.dayHeading}>{group.day}</h3>
                            <ol className={styles.list}>
                                {group.items.map((item) => (
                                    <ActivityRow key={item.id} item={item} />
                                ))}
                            </ol>
                        </li>
                    ))}
                </ol>
            )}
            {activity.data !== null && (
                <Pagination
                    page={page}
                    pageSize={PAGE_SIZE}
                    total={activity.data.total}
                    noun="cambios"
                    disabled={activity.loading}
                    onPage={setPage}
                />
            )}
        </Panel>
    );
}
