import type { Activity } from "../../types/api";
import type { IconName } from "../Icon";
import { formatDay, formatNumber } from "../../utils/format";
import { SURFACE_MATERIALS, type SurfaceMaterialId } from "../../utils/surfaceMaterials";

import { TASK_STATUS_LABELS } from "./ProjectTasksPanel";

/*
 * How the change history (R18) puts a stored entry into Spanish words: the kinds of record, the
 * fields, the coded values and their units. The panel only lays them out.
 */

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

/** The fields `updated` lists, as the forms call them; an unknown one is shown as «otro dato». */
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
    roof: "cubierta",
    surface: "acabado",
    x_m: "posición X",
    y_m: "posición Y",
    depth_m: "fondo",
    height_m: "altura",
    plan_id: "plano",
    unit_id: "unidad",
    mesh_ref: "malla",
    kind: "tipo",
    file_id: "archivo",
    level: "nivel",
    scale: "escala",
    latitude: "latitud",
    longitude: "longitud",
    points: "puntos",
    orientation: "orientación",
    unit: "unidad de medida",
    position: "posición",
    target: "punto de mira",
    sort_order: "orden",
    base_m: "base",
};

/** The unit a number is stored in, by the suffix of its field. */
function unitOf(field: string): string {
    if (field.endsWith("_m2")) {
        return " m²";
    }

    if (field.endsWith("_m")) {
        return " m";
    }

    return field.endsWith("_percent") ? " %" : "";
}

/** Fields whose stored value is text the user typed, so the history can show it as it is. */
const FREE_TEXT_FIELDS = new Set([
    "name",
    "title",
    "description",
    "location",
    "soil_type",
    "category",
    "level",
    "scale",
    "unit",
]);

const ORIENTATION_LABELS: Record<string, string> = {
    north: "Norte",
    south: "Sur",
    east: "Este",
    west: "Oeste",
};

const PROJECT_STATUS_LABELS: Record<string, string> = {
    draft: "Borrador",
    active: "Activo",
    archived: "Archivado",
};

const ROOF_LABELS: Record<string, string> = { gable: "A dos aguas", flat: "Plana" };

/** Room categories (`ROOM_CATEGORY_CHECK` in the backend models). */
const ROOM_CATEGORY_LABELS: Record<string, string> = {
    master_bedroom: "Cuarto principal",
    bedroom: "Cuarto",
    living_dining: "Sala-comedor",
    kitchen: "Cocina",
    bathroom: "Baño",
    study: "Estudio",
    circulation: "Circulación",
    service: "Servicio",
    garage: "Garaje",
    commercial: "Comercial",
    other: "Otro",
};

const COMPONENT_KIND_LABELS: Record<string, string> = {
    column: "Columna",
    beam: "Viga",
    wall: "Muro",
};

/** The Spanish label of a stored code value, or undefined when the field holds no known code. */
function codeLabel(entity: string | null, field: string, value: string): string | undefined {
    switch (field) {
        case "status":
            return entity === "task"
                ? (TASK_STATUS_LABELS as Record<string, string>)[value]
                : PROJECT_STATUS_LABELS[value];
        case "roof":
            return ROOF_LABELS[value];
        case "surface":
            return value in SURFACE_MATERIALS
                ? SURFACE_MATERIALS[value as SurfaceMaterialId].label
                : undefined;
        case "kind":
            return COMPONENT_KIND_LABELS[value];
        case "orientation":
            return ORIENTATION_LABELS[value];
        default:
            return undefined;
    }
}

/** Who made a change, when it was not the user. */
const ORIGINS: Record<string, string> = {
    ai: "Por la IA",
    system: "Por el sistema",
};

/** The modules a change can come from (`SourceModule`), as the navigation names them. */
const MODULES: Record<string, string> = {
    home: "Inicio",
    projects: "Proyectos",
    settings: "Ajustes",
    summary: "Resumen",
    viewer: "Visor 3D",
    terrain: "Terreno",
    plans: "Planos",
    elevations: "Elevaciones",
    lighting: "Iluminación",
    analysis: "Análisis",
    files: "Archivos",
    versions: "Versiones",
    materials: "Materiales",
    compare: "Comparar",
    tasks: "Tareas",
    render: "Renderizado",
    history: "Historial",
    assistant: "Asistente",
};

/** «Por la IA · desde Planos»: who made the change, when not the user, and where. */
export function describeSource(item: Activity): string {
    const who = ORIGINS[item.origin ?? ""];
    const where = MODULES[item.source_module ?? ""];

    if (who === undefined) {
        return where === undefined ? "" : `Desde ${where}`;
    }

    return where === undefined ? who : `${who} · desde ${where}`;
}

/**
 * One record of `/projects/{id}/activity` in a sentence: «Se actualizó el terreno «Lote 14»
 * (área, suelo)». Everything comes from the record; an unknown action reads «Se modificó».
 */
export function describeActivity(item: Activity): string {
    const what = ENTITIES[item.entity_type ?? ""] ?? "un elemento";
    // The scene settings have no name of their own: the stored label is internal.
    const label =
        typeof item.detail.label === "string" && item.entity_type !== "scene_settings"
            ? ` «${item.detail.label}»`
            : "";
    const fields = Array.isArray(item.detail.fields)
        ? item.detail.fields.map((field) => FIELDS[field] ?? "otro dato").join(", ")
        : "";
    const number =
        typeof item.detail.version_number === "number" ? ` ${item.detail.version_number}` : "";

    switch (item.action) {
        case "created":
            return `Se creó ${what}${label}`;
        case "updated":
            return `Se actualizó ${what}${label}${fields === "" ? "" : ` (${fields})`}`;
        case "deleted":
            return `Se eliminó ${what}${label}${item.detail.via === "redo" ? " con «Rehacer»" : ""}`;
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
            return `Se modificó ${what}${label}`;
    }
}

/**
 * A stored value as the history shows it. Codes are translated; ids, references, lists,
 * objects and any code without a label are only said to have changed (null).
 */
function describeValue(entity: string | null, field: string, value: unknown): string | null {
    if (value === null || value === undefined || value === "") {
        return "—";
    }

    if (field.endsWith("_id") || field === "mesh_ref") {
        return null;
    }

    if (typeof value === "number") {
        return `${formatNumber(value)}${unitOf(field)}`;
    }

    if (typeof value === "boolean") {
        return value ? "sí" : "no";
    }

    if (typeof value !== "string") {
        return null;
    }

    if (field === "due_date") {
        // A calendar day, not an instant: read through a time zone it would move a day.
        return formatDay(value);
    }

    // A room's category is a code; a material's is text the user typed.
    if (field === "category" && entity === "room") {
        return ROOM_CATEGORY_LABELS[value] ?? null;
    }

    return FREE_TEXT_FIELDS.has(field) ? value : (codeLabel(entity, field, value) ?? null);
}

/**
 * The values before and after an update: «área: 100 → 120». Entries without them (creations,
 * deletions, entries older than migration 028) give an empty list.
 */
export function describeChanges(item: Activity): string[] {
    return changeEntries(item).map((entry) => entry.text);
}

/** The same list with the field each line is about, which is unique and keys the rows. */
export function changeEntries(item: Activity): { field: string; text: string }[] {
    const after = item.new_value ?? {};
    const before = item.old_value ?? {};

    return Object.keys(after).map((field) => {
        const name = FIELDS[field] ?? "otro dato";
        const from = describeValue(item.entity_type, field, before[field]);
        const to = describeValue(item.entity_type, field, after[field]);

        return {
            field,
            text: from === null || to === null ? `${name}: cambió` : `${name}: ${from} → ${to}`,
        };
    });
}

/** The glyph that leads an entry, by what was done; an unknown action gets the history mark. */
const ACTION_ICONS: Record<string, IconName> = {
    created: "plus",
    updated: "edit",
    deleted: "trash",
    restored: "undo",
    archived: "archive",
    unarchived: "unarchive",
    duplicated: "copy",
    version_saved: "save",
    version_restored: "versions",
};

export function activityIcon(action: string): IconName {
    return ACTION_ICONS[action] ?? "history";
}
