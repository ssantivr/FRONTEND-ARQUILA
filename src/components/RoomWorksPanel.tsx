import { useState, type FormEvent } from "react";

import { errorMessage } from "../hooks/useAsync";
import { walkthroughApi } from "../services/api";
import type {
    RenovationLog,
    RenovationStatus,
    SpatialElement,
    SpatialLayer,
    WorkStatus,
} from "../types/api";
import { formatMoney } from "../utils/format";

export const WORK_LAYERS: { id: SpatialLayer; label: string; swatch: string }[] = [
    { id: "structure", label: "Estructura", swatch: "#00f0ff" },
    { id: "installations", label: "Instalaciones", swatch: "#ff007f" },
    { id: "finishes", label: "Acabados", swatch: "#ffc857" },
];

export const WORK_STATUS_LABELS: Record<WorkStatus, string> = {
    existing: "Existente",
    planned: "Por hacer",
    demolition: "Por demoler",
};

const LOG_STATUSES: { id: RenovationStatus; label: string }[] = [
    { id: "planned", label: "Planificada" },
    { id: "in_progress", label: "En curso" },
    { id: "completed", label: "Terminada" },
    { id: "cancelled", label: "Cancelada" },
];

const DEMOLITION_SWATCH = "#ff5c7a";

export function layerLabel(layer: SpatialLayer): string {
    return WORK_LAYERS.find((item) => item.id === layer)?.label ?? layer;
}

export function workSwatch(element: SpatialElement): string {
    return element.work_status === "demolition"
        ? DEMOLITION_SWATCH
        : (WORK_LAYERS.find((item) => item.id === element.layer)?.swatch ?? DEMOLITION_SWATCH);
}

function formatDay(day: string): string {
    const [year, month, date] = day.split("-");

    return `${date}/${month}/${year}`;
}

function timeline(log: RenovationLog): string | null {
    if (log.planned_start === null && log.planned_end === null) {
        return null;
    }

    if (log.planned_start !== null && log.planned_end !== null) {
        return `${formatDay(log.planned_start)} – ${formatDay(log.planned_end)}`;
    }

    return log.planned_start !== null
        ? `Desde el ${formatDay(log.planned_start)}`
        : `Hasta el ${formatDay(log.planned_end ?? "")}`;
}

interface RoomWorksPanelProps {
    projectId: number;
    roomId: number;
    title: string;
    description: string | null;
    elements: SpatialElement[];
    logs: RenovationLog[];
    unavailable: string | null;
    assetNote: string | null;
    onChanged: () => void;
    onFocus: (element: SpatialElement) => void;
}

export function RoomWorksPanel({
    projectId,
    roomId,
    title,
    description,
    elements,
    logs,
    unavailable,
    assetNote,
    onChanged,
    onFocus,
}: RoomWorksPanelProps) {
    const [newTitle, setNewTitle] = useState("");
    const [newLayer, setNewLayer] = useState<SpatialLayer>("finishes");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    function save(action: Promise<unknown>, done?: () => void) {
        setSaving(true);
        setError(null);
        action
            .then(() => {
                done?.();
                onChanged();
            })
            .catch((reason: unknown) => setError(errorMessage(reason)))
            .finally(() => setSaving(false));
    }

    function addLog(event: FormEvent) {
        event.preventDefault();

        const text = newTitle.trim();

        if (text !== "") {
            save(
                walkthroughApi.createLog({
                    project_id: projectId,
                    room_id: roomId,
                    layer: newLayer,
                    title: text,
                }),
                () => setNewTitle(""),
            );
        }
    }

    return (
        <aside className="hud hud-works" aria-label="Obras del cuarto">
            <h3>Corrida de interior</h3>
            <p className="hud-works-title" aria-live="polite">
                {title}
            </p>
            {description !== null && <p>{description}</p>}
            {unavailable !== null && (
                <p className="message message-error" role="alert">
                    No se pudieron cargar las obras: {unavailable}
                </p>
            )}
            {assetNote !== null && <p>{assetNote}</p>}
            <h4>Elementos del cuarto</h4>
            {elements.length === 0 ? (
                <p>Este cuarto no tiene instalaciones ni acabados registrados.</p>
            ) : (
                <ul className="hud-works-list">
                    {elements.map((element) => (
                        <li key={element.id}>
                            <button
                                type="button"
                                className="hud-item"
                                title="Acerca la cámara a este elemento"
                                onClick={() => onFocus(element)}
                            >
                                <span
                                    className="hud-swatch"
                                    style={{ background: workSwatch(element) }}
                                />
                                {element.name}
                                <small>
                                    {layerLabel(element.layer)} ·{" "}
                                    {WORK_STATUS_LABELS[element.work_status]}
                                </small>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            <h4>Lo que se va a hacer</h4>
            {logs.length === 0 && <p>No hay obras registradas para este cuarto.</p>}
            <ul className="hud-works-list">
                {logs.map((log) => {
                    const dates = timeline(log);

                    return (
                        <li key={log.id} className="hud-work">
                            <strong>{log.title}</strong>
                            <small>
                                {layerLabel(log.layer)}
                                {dates !== null && ` · ${dates}`}
                                {log.estimated_cost !== null &&
                                    ` · ${formatMoney(log.estimated_cost)}`}
                            </small>
                            {log.description !== null && <span>{log.description}</span>}
                            <select
                                aria-label={`Estado de «${log.title}»`}
                                value={log.status}
                                disabled={saving}
                                onChange={(event) =>
                                    save(
                                        walkthroughApi.setLogStatus(
                                            log.id,
                                            event.target.value as RenovationStatus,
                                        ),
                                    )
                                }
                            >
                                {LOG_STATUSES.map((status) => (
                                    <option key={status.id} value={status.id}>
                                        {status.label}
                                    </option>
                                ))}
                            </select>
                        </li>
                    );
                })}
            </ul>
            <form className="hud-works-form" onSubmit={addLog}>
                <input
                    aria-label="Nueva obra"
                    placeholder="Nueva obra…"
                    maxLength={160}
                    value={newTitle}
                    onChange={(event) => setNewTitle(event.target.value)}
                />
                <select
                    aria-label="Capa de la nueva obra"
                    value={newLayer}
                    onChange={(event) => setNewLayer(event.target.value as SpatialLayer)}
                >
                    {WORK_LAYERS.map((layer) => (
                        <option key={layer.id} value={layer.id}>
                            {layer.label}
                        </option>
                    ))}
                </select>
                <button
                    type="submit"
                    className="hud-item"
                    disabled={saving || newTitle.trim() === ""}
                >
                    Agregar obra
                </button>
            </form>
            {error !== null && (
                <p className="message message-error" role="alert">
                    {error}
                </p>
            )}
        </aside>
    );
}
