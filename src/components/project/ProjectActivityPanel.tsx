import { useState } from "react";

import { useAsync } from "../../hooks/useAsync";
import { activityApi } from "../../services/api";
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
import { Pagination } from "../ui/Pagination";
import { Panel } from "../ui/Panel";

import { activityIcon, changeEntries, describeActivity, describeSource } from "./activityText";

import styles from "./ProjectPanels.module.css";

export { describeActivity, describeChanges, describeSource } from "./activityText";

const PAGE_SIZE = 20;

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
    const activity = useAsync(
        () => activityApi.listByProject(projectId, page, PAGE_SIZE),
        [projectId, page],
    );
    const items = activity.data?.items ?? [];

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
            description="Los cambios que guarda la API, el más reciente primero. No incluye las recomendaciones automáticas."
        >
            <AsyncStatus
                loading={activity.loading}
                error={activity.error}
                onRetry={activity.reload}
                isEmpty={items.length === 0}
                skeleton="rows"
                emptyTitle="Sin cambios registrados"
                emptyText="Cada vez que se cree, cambie o elimine algo del proyecto aparecerá aquí."
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
