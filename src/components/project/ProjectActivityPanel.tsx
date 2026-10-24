import { useState } from "react";

import { useAsync } from "../../hooks/useAsync";
import { activityApi } from "../../services/api";
import type { Activity } from "../../types/api";
import { formatDateTime } from "../../utils/format";
import { AsyncStatus } from "../AsyncStatus";
import { Unavailable } from "../Unavailable";
import { Pagination } from "../ui/Pagination";
import { Panel } from "../ui/Panel";

import styles from "./ProjectPanels.module.css";

const PAGE_SIZE = 20;

/** The kinds of records of the history, with the article they take. */
const ENTITIES: Record<string, string> = {
    project: "el proyecto",
    terrain: "el terreno",
    material: "el material",
    plan: "el plano",
    elevation: "la elevación",
    room: "el cuarto",
    component: "el componente",
    file: "el archivo",
    recommendation: "la recomendación",
    task: "la tarea",
    walkthrough_point: "el punto de recorrido",
    scene_settings: "la escena",
    version: "la versión",
};

/** The fields `updated` lists, as the forms call them; an unknown one is shown as it comes. */
const FIELDS: Record<string, string> = {
    name: "nombre",
    title: "título",
    description: "descripción",
    location: "ubicación",
    status: "estado",
    progress: "avance",
    cover_file_id: "portada",
    area_m2: "área",
    width_m: "ancho",
    length_m: "largo",
    slope_percent: "pendiente",
    soil_type: "suelo",
    quantity: "cantidad",
    unit_cost: "costo unitario",
    category: "categoría",
    due_date: "fecha límite",
    assignee_id: "responsable",
    lighting: "iluminación",
    camera_presets: "cámaras",
};

/**
 * One record of `/projects/{id}/activity` in a sentence: «Se actualizó el terreno «Lote 14»
 * (área, suelo)». Everything comes from the record; an action it does not know is named as is.
 */
export function describeActivity(item: Activity): string {
    const what = ENTITIES[item.entity_type ?? ""] ?? item.entity_type ?? "un elemento";
    const label = typeof item.detail.label === "string" ? ` «${item.detail.label}»` : "";
    const fields = Array.isArray(item.detail.fields)
        ? item.detail.fields.map((field) => FIELDS[field] ?? field).join(", ")
        : "";
    const number =
        typeof item.detail.version_number === "number" ? ` ${item.detail.version_number}` : "";

    switch (item.action) {
        case "created":
            return `Se creó ${what}${label}`;
        case "updated":
            return `Se actualizó ${what}${label}${fields === "" ? "" : ` (${fields})`}`;
        case "deleted":
            return `Se eliminó ${what}${label}`;
        case "restored":
            return `Se restauró ${what}${label} con «Deshacer»`;
        case "archived":
            return "Se archivó el proyecto";
        case "unarchived":
            return "Se desarchivó el proyecto";
        case "duplicated":
            return "Se creó este proyecto como copia de otro";
        case "version_saved":
            return `Se guardó la versión${number}`;
        case "version_restored":
            return `Se restauró la versión${number}`;
        default:
            return `${item.action}: ${what}${label}`;
    }
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
                <ol className={styles.list} aria-label="Cambios del proyecto">
                    {items.map((item) => (
                        <li key={item.id} className={styles.row}>
                            <p className={styles.rowMain}>{describeActivity(item)}</p>
                            <time
                                className={`${styles.meta} ${styles.when}`}
                                dateTime={item.created_at}
                            >
                                {formatDateTime(item.created_at)}
                            </time>
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
