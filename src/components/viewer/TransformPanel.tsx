import { useEffect, useState, type KeyboardEvent } from "react";

import type { StructureRoom } from "../../types/api";
import { formatNumber } from "../../utils/format";
import { SNAP_STEPS, snapSize, snapTo } from "../../utils/snap";
import { Icon } from "../Icon";

export type RoomGeometry = Pick<StructureRoom, "x_m" | "y_m" | "width_m" | "depth_m" | "height_m">;

const FIELDS: { id: keyof RoomGeometry; label: string; size: boolean }[] = [
    { id: "x_m", label: "X", size: false },
    { id: "y_m", label: "Y", size: false },
    { id: "width_m", label: "Ancho", size: true },
    { id: "depth_m", label: "Fondo", size: true },
    { id: "height_m", label: "Alto", size: true },
];

export function geometryOf(room: RoomGeometry): RoomGeometry {
    return {
        x_m: room.x_m,
        y_m: room.y_m,
        width_m: room.width_m,
        depth_m: room.depth_m,
        height_m: room.height_m,
    };
}

interface TransformPanelProps {
    room: StructureRoom;
    snap: number;
    onSnap: (step: number) => void;
    /** Sends the new position or size; the caller saves it with `PATCH /rooms/{id}`. */
    onCommit: (next: RoomGeometry, label: string) => void;
    busy: boolean;
}

/**
 * Where a room sits on its plan and how big it is, in metres, editable. Every value lands on the
 * grid. The room has no angle in the API, so it cannot be rotated: the button says so.
 */
export function TransformPanel({ room, snap, onSnap, onCommit, busy }: TransformPanelProps) {
    const current = geometryOf(room);
    const [draft, setDraft] = useState<Record<keyof RoomGeometry, string>>(() => texts(current));

    // A new room, or the same one after the server answered: the fields show what is saved.
    useEffect(() => {
        setDraft(texts(geometryOf(room)));
    }, [room]);

    function commit(field: (typeof FIELDS)[number]) {
        const typed = Number(draft[field.id].replace(",", "."));

        if (!Number.isFinite(typed)) {
            setDraft(texts(current));

            return;
        }

        const value = field.size ? snapSize(typed, snap) : snapTo(typed, snap);

        if (value === current[field.id]) {
            setDraft(texts(current));

            return;
        }

        onCommit(
            { ...current, [field.id]: value },
            `${field.size ? "redimensionar" : "mover"} ${room.name}`,
        );
    }

    function nudge(dx: number, dy: number) {
        onCommit(
            {
                ...current,
                x_m: snapTo(current.x_m + dx * snap, snap),
                y_m: snapTo(current.y_m + dy * snap, snap),
            },
            `mover ${room.name}`,
        );
    }

    return (
        <section className="hud-transform" aria-label={`Posición y medidas de ${room.name}`}>
            <h4>Posición y medidas</h4>
            <div className="hud-transform-grid">
                {FIELDS.map((field) => (
                    <label key={field.id} className="hud-transform-field">
                        <span>
                            {field.label} <abbr title="metros">m</abbr>
                        </span>
                        <input
                            inputMode="decimal"
                            value={draft[field.id]}
                            disabled={busy}
                            onChange={(event) =>
                                setDraft({ ...draft, [field.id]: event.target.value })
                            }
                            onBlur={() => commit(field)}
                            onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
                                if (event.key === "Enter") {
                                    commit(field);
                                } else if (event.key === "Escape") {
                                    event.stopPropagation();
                                    setDraft(texts(current));
                                }
                            }}
                        />
                    </label>
                ))}
            </div>
            <div className="hud-transform-row">
                <label className="hud-transform-snap">
                    Cuadrícula
                    <select value={snap} onChange={(event) => onSnap(Number(event.target.value))}>
                        {SNAP_STEPS.map((step) => (
                            <option key={step} value={step}>
                                {formatNumber(step)} m
                            </option>
                        ))}
                    </select>
                </label>
                <div className="hud-nudge" role="group" aria-label="Mover un paso de cuadrícula">
                    <button
                        type="button"
                        className="hud-item"
                        disabled={busy}
                        aria-label="Mover a la izquierda"
                        onClick={() => nudge(-1, 0)}
                    >
                        ←
                    </button>
                    <button
                        type="button"
                        className="hud-item"
                        disabled={busy}
                        aria-label="Mover hacia el fondo"
                        onClick={() => nudge(0, 1)}
                    >
                        ↑
                    </button>
                    <button
                        type="button"
                        className="hud-item"
                        disabled={busy}
                        aria-label="Mover hacia el frente"
                        onClick={() => nudge(0, -1)}
                    >
                        ↓
                    </button>
                    <button
                        type="button"
                        className="hud-item"
                        disabled={busy}
                        aria-label="Mover a la derecha"
                        onClick={() => nudge(1, 0)}
                    >
                        →
                    </button>
                </div>
            </div>
            <button
                type="button"
                className="hud-item hud-rotate"
                aria-disabled="true"
                aria-describedby="rotate-why"
                onClick={(event) => event.preventDefault()}
            >
                <Icon name="rotate" />
                Rotar
            </button>
            <p id="rotate-why" className="hud-note-quiet">
                No disponible: la API guarda la posición y las medidas de un cuarto, pero no un
                ángulo, así que un giro no se podría guardar.
            </p>
        </section>
    );
}

/** Without thousands separators: «1250,5» reads back as 1250.5, «1.250,5» would not. */
const FIELD_NUMBER = new Intl.NumberFormat("es", { useGrouping: false, maximumFractionDigits: 3 });

function texts(geometry: RoomGeometry): Record<keyof RoomGeometry, string> {
    return Object.fromEntries(
        FIELDS.map((field) => [field.id, FIELD_NUMBER.format(geometry[field.id])]),
    ) as Record<keyof RoomGeometry, string>;
}
