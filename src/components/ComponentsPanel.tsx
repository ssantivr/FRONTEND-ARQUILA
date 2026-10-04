import { useRef, useState, type FormEvent } from "react";

import { useAsync } from "../hooks/useAsync";
import { componentsApi, plansApi } from "../services/api";
import type { ComponentKind, StructuralComponent } from "../types/api";
import type { SectionProps } from "../types/ui";
import { formatNumber } from "../utils/format";
import { AsyncStatus } from "./AsyncStatus";
import { Panel } from "./Panel";
import { FormActions, RowActions } from "./RowActions";

interface ComponentsPanelProps extends SectionProps {
    onChanged: () => void;
}

interface Measures {
    width: string;
    depth: string;
    height: string;
}

const KINDS: { id: ComponentKind; label: string; measures: Measures }[] = [
    { id: "column", label: "Columna", measures: { width: "0.3", depth: "0.3", height: "3" } },
    { id: "beam", label: "Viga", measures: { width: "4", depth: "0.3", height: "0.4" } },
    { id: "wall", label: "Muro", measures: { width: "4", depth: "0.2", height: "3" } },
];

const KIND_LABELS = Object.fromEntries(KINDS.map((kind) => [kind.id, kind.label])) as Record<
    ComponentKind,
    string
>;

export function ComponentsPanel({ projectId, run, onChanged }: ComponentsPanelProps) {
    const components = useAsync(() => componentsApi.listByProject(projectId), [projectId]);
    const plans = useAsync(() => plansApi.listByProject(projectId), [projectId]);
    const [editingId, setEditingId] = useState<number | null>(null);
    const form = useRef<HTMLFormElement>(null);
    const [planId, setPlanId] = useState("");
    const [kind, setKind] = useState<ComponentKind>("column");
    const [name, setName] = useState("");
    const [x, setX] = useState("0");
    const [y, setY] = useState("0");
    const [measures, setMeasures] = useState<Measures>(KINDS[0].measures);

    const items = components.data ?? [];
    const planItems = plans.data ?? [];
    const planTitles = new Map(planItems.map((plan) => [plan.id, plan.title]));
    const chosenPlan = planId === "" ? planItems[0]?.id : Number(planId);

    function resetForm() {
        setEditingId(null);
        setName("");
        setX("0");
        setY("0");
        setMeasures(KINDS.find((item) => item.id === kind)?.measures ?? KINDS[0].measures);
    }

    function changeKind(next: ComponentKind) {
        setKind(next);

        if (editingId === null) {
            setMeasures(KINDS.find((item) => item.id === next)?.measures ?? KINDS[0].measures);
        }
    }

    function startEdit(component: StructuralComponent) {
        setEditingId(component.id);
        form.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
        setPlanId(String(component.plan_id));
        setKind(component.kind);
        setName(component.name);
        setX(String(component.x_m));
        setY(String(component.y_m));
        setMeasures({
            width: String(component.width_m),
            depth: String(component.depth_m),
            height: String(component.height_m),
        });
    }

    function reload() {
        components.reload();
        onChanged();
    }

    function handleSubmit(event: FormEvent) {
        event.preventDefault();

        if (chosenPlan === undefined) {
            return;
        }

        const data = {
            plan_id: chosenPlan,
            kind,
            name: name.trim(),
            x_m: Number(x),
            y_m: Number(y),
            width_m: Number(measures.width),
            depth_m: Number(measures.depth),
            height_m: Number(measures.height),
        };

        run(
            () =>
                editingId === null
                    ? componentsApi.create(projectId, data)
                    : componentsApi.update(editingId, data),
            () => {
                resetForm();
                reload();
            },
        );
    }

    function handleDelete(component: StructuralComponent) {
        const label = `${KIND_LABELS[component.kind].toLowerCase()} "${component.name}"`;

        if (!window.confirm(`¿Eliminar ${label}? No se puede deshacer.`)) {
            return;
        }

        run(
            () => componentsApi.remove(component.id),
            () => {
                if (editingId === component.id) {
                    resetForm();
                }
                reload();
            },
        );
    }

    return (
        <Panel title="Componentes estructurales">
            <p className="message">
                Columnas, vigas y muros de cada plano, como cajas. X e Y son la esquina del
                componente, igual que en los cuartos. Una viga se cuelga del techo de su nivel.
            </p>
            <AsyncStatus
                loading={components.loading || plans.loading}
                error={components.error ?? plans.error}
                isEmpty={items.length === 0}
                emptyText={
                    planItems.length === 0
                        ? "Registra un plano en la pestaña Planos para poder agregar componentes."
                        : "Este proyecto no tiene componentes estructurales."
                }
            />
            {items.length > 0 && (
                <table>
                    <thead>
                        <tr>
                            <th>Tipo</th>
                            <th>Nombre</th>
                            <th>Plano</th>
                            <th>Posición (m)</th>
                            <th>Medidas (m)</th>
                            <th />
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((component) => (
                            <tr
                                key={component.id}
                                className={component.id === editingId ? "row-editing" : undefined}
                            >
                                <td data-label="Tipo">{KIND_LABELS[component.kind]}</td>
                                <td data-label="Nombre">{component.name}</td>
                                <td data-label="Plano">
                                    {planTitles.get(component.plan_id) ?? "—"}
                                </td>
                                <td data-label="Posición (m)">
                                    {formatNumber(component.x_m)}; {formatNumber(component.y_m)}
                                </td>
                                <td data-label="Medidas (m)">
                                    {formatNumber(component.width_m)} ×{" "}
                                    {formatNumber(component.depth_m)} ×{" "}
                                    {formatNumber(component.height_m)}
                                </td>
                                <td>
                                    <RowActions
                                        label={`componente ${component.name}`}
                                        onEdit={() => startEdit(component)}
                                        onDelete={() => handleDelete(component)}
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
                        Tipo
                        <select
                            value={kind}
                            onChange={(event) => changeKind(event.target.value as ComponentKind)}
                        >
                            {KINDS.map((item) => (
                                <option key={item.id} value={item.id}>
                                    {item.label}
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
                            placeholder="C1"
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
                            value={measures.width}
                            onChange={(event) =>
                                setMeasures({ ...measures, width: event.target.value })
                            }
                            required
                        />
                    </label>
                    <label>
                        Largo (m)
                        <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={measures.depth}
                            onChange={(event) =>
                                setMeasures({ ...measures, depth: event.target.value })
                            }
                            required
                        />
                    </label>
                    <label>
                        Alto (m)
                        <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={measures.height}
                            onChange={(event) =>
                                setMeasures({ ...measures, height: event.target.value })
                            }
                            required
                        />
                    </label>
                    <FormActions
                        editing={editingId !== null}
                        addLabel="Agregar componente"
                        disabled={name.trim() === ""}
                        onCancel={resetForm}
                    />
                </form>
            )}
        </Panel>
    );
}
