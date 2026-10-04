import { useRef, useState, type FormEvent } from "react";

import { useAsync } from "../hooks/useAsync";
import { plansApi, roomsApi } from "../services/api";
import type { Room } from "../types/api";
import type { SectionProps } from "../types/ui";
import { formatNumber } from "../utils/format";
import { AsyncStatus } from "./AsyncStatus";
import { Panel } from "./Panel";
import { FormActions, RowActions } from "./RowActions";

interface RoomsPanelProps extends SectionProps {
    onChanged: () => void;
}

const DEFAULT_HEIGHT = "3";

export function RoomsPanel({ projectId, run, onChanged }: RoomsPanelProps) {
    const rooms = useAsync(() => roomsApi.listByProject(projectId), [projectId]);
    const plans = useAsync(() => plansApi.listByProject(projectId), [projectId]);
    const [editingId, setEditingId] = useState<number | null>(null);
    const form = useRef<HTMLFormElement>(null);
    const [planId, setPlanId] = useState("");
    const [name, setName] = useState("");
    const [x, setX] = useState("0");
    const [y, setY] = useState("0");
    const [width, setWidth] = useState("");
    const [depth, setDepth] = useState("");
    const [height, setHeight] = useState(DEFAULT_HEIGHT);

    const items = rooms.data ?? [];
    const planItems = plans.data ?? [];
    const planTitles = new Map(planItems.map((plan) => [plan.id, plan.title]));
    const chosenPlan = planId === "" ? planItems[0]?.id : Number(planId);

    function resetForm() {
        setEditingId(null);
        setName("");
        setX("0");
        setY("0");
        setWidth("");
        setDepth("");
        setHeight(DEFAULT_HEIGHT);
    }

    function startEdit(room: Room) {
        setEditingId(room.id);
        form.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
        setPlanId(String(room.plan_id));
        setName(room.name);
        setX(String(room.x_m));
        setY(String(room.y_m));
        setWidth(String(room.width_m));
        setDepth(String(room.depth_m));
        setHeight(String(room.height_m));
    }

    function reload() {
        rooms.reload();
        onChanged();
    }

    function handleSubmit(event: FormEvent) {
        event.preventDefault();

        if (chosenPlan === undefined) {
            return;
        }

        const data = {
            plan_id: chosenPlan,
            name: name.trim(),
            x_m: Number(x),
            y_m: Number(y),
            width_m: Number(width),
            depth_m: Number(depth),
            height_m: Number(height),
        };

        run(
            () =>
                editingId === null
                    ? roomsApi.create(projectId, data)
                    : roomsApi.update(editingId, data),
            () => {
                resetForm();
                reload();
            },
        );
    }

    function handleDelete(room: Room) {
        if (!window.confirm(`¿Eliminar el cuarto "${room.name}"? No se puede deshacer.`)) {
            return;
        }

        run(
            () => roomsApi.remove(room.id),
            () => {
                if (editingId === room.id) {
                    resetForm();
                }
                reload();
            },
        );
    }

    return (
        <Panel title="Cuartos">
            <p className="message">
                Cada cuarto pertenece a un plano. X e Y son la distancia, en metros, desde la
                esquina de origen del primer terreno hasta la esquina del cuarto.
            </p>
            <AsyncStatus
                loading={rooms.loading || plans.loading}
                error={rooms.error ?? plans.error}
                isEmpty={items.length === 0}
                emptyText={
                    planItems.length === 0
                        ? "Registra un plano en la pestaña Planos para poder agregar cuartos."
                        : "Este proyecto no tiene cuartos."
                }
            />
            {items.length > 0 && (
                <table>
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Plano</th>
                            <th>Posición (m)</th>
                            <th>Medidas (m)</th>
                            <th>Área</th>
                            <th />
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((room) => (
                            <tr
                                key={room.id}
                                className={room.id === editingId ? "row-editing" : undefined}
                            >
                                <td data-label="Nombre">{room.name}</td>
                                <td data-label="Plano">{planTitles.get(room.plan_id) ?? "—"}</td>
                                <td data-label="Posición (m)">
                                    {formatNumber(room.x_m)}; {formatNumber(room.y_m)}
                                </td>
                                <td data-label="Medidas (m)">
                                    {formatNumber(room.width_m)} × {formatNumber(room.depth_m)} ×{" "}
                                    {formatNumber(room.height_m)}
                                </td>
                                <td data-label="Área">
                                    {formatNumber(room.width_m * room.depth_m)} m²
                                </td>
                                <td>
                                    <RowActions
                                        label={`cuarto ${room.name}`}
                                        onEdit={() => startEdit(room)}
                                        onDelete={() => handleDelete(room)}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
            {planItems.length > 0 && (
                <form className="form-row" ref={form} onSubmit={handleSubmit}>
                    <label>
                        Plano
                        <select
                            value={chosenPlan}
                            onChange={(event) => setPlanId(event.target.value)}
                        >
                            {planItems.map((plan) => (
                                <option key={plan.id} value={plan.id}>
                                    {plan.title}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label>
                        Nombre
                        <input
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            maxLength={160}
                            placeholder="Cocina"
                            required
                        />
                    </label>
                    <label>
                        X (m)
                        <input
                            type="number"
                            step="0.01"
                            value={x}
                            onChange={(event) => setX(event.target.value)}
                            required
                        />
                    </label>
                    <label>
                        Y (m)
                        <input
                            type="number"
                            step="0.01"
                            value={y}
                            onChange={(event) => setY(event.target.value)}
                            required
                        />
                    </label>
                    <label>
                        Ancho (m)
                        <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={width}
                            onChange={(event) => setWidth(event.target.value)}
                            required
                        />
                    </label>
                    <label>
                        Largo (m)
                        <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={depth}
                            onChange={(event) => setDepth(event.target.value)}
                            required
                        />
                    </label>
                    <label>
                        Alto (m)
                        <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={height}
                            onChange={(event) => setHeight(event.target.value)}
                            required
                        />
                    </label>
                    <FormActions
                        editing={editingId !== null}
                        addLabel="Agregar cuarto"
                        disabled={name.trim() === ""}
                        onCancel={resetForm}
                    />
                </form>
            )}
        </Panel>
    );
}
