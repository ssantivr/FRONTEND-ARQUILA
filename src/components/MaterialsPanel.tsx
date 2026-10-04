import { useEffect, useRef, useState, type FormEvent } from "react";

import { useAsync } from "../hooks/useAsync";
import { materialsApi } from "../services/api";
import { appState } from "../state/appState";
import type { Material } from "../types/api";
import type { SectionProps } from "../types/ui";
import { formatMoney, formatNumber, optionalNumber, optionalText } from "../utils/format";
import { AsyncStatus } from "./AsyncStatus";
import { Panel } from "./Panel";
import { FormActions, RowActions } from "./RowActions";

export function MaterialsPanel({ projectId, run }: SectionProps) {
    const materials = useAsync(() => materialsApi.listByProject(projectId), [projectId]);
    const [editingId, setEditingId] = useState<number | null>(null);
    const form = useRef<HTMLFormElement>(null);
    const [name, setName] = useState("");
    const [category, setCategory] = useState("");
    const [unit, setUnit] = useState("");
    const [quantity, setQuantity] = useState("");
    const [unitCost, setUnitCost] = useState("");

    useEffect(() => {
        if (materials.data !== null) {
            appState.setMaterials(projectId, materials.data);
        }
    }, [projectId, materials.data]);

    function resetForm() {
        setEditingId(null);
        setName("");
        setCategory("");
        setUnit("");
        setQuantity("");
        setUnitCost("");
    }

    function startEdit(material: Material) {
        setEditingId(material.id);
        form.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
        setName(material.name);
        setCategory(material.category ?? "");
        setUnit(material.unit);
        setQuantity(String(material.quantity));
        setUnitCost(String(material.unit_cost));
    }

    function handleSubmit(event: FormEvent) {
        event.preventDefault();

        const data = {
            name: name.trim(),
            category: optionalText(category) ?? null,
            unit: unit.trim(),
            quantity: optionalNumber(quantity) ?? 0,
            unit_cost: optionalNumber(unitCost) ?? 0,
        };

        run(
            () =>
                editingId === null
                    ? materialsApi.create(projectId, data)
                    : materialsApi.update(editingId, data),
            () => {
                resetForm();
                materials.reload();
            },
        );
    }

    function handleDelete(material: Material) {
        run(
            () => materialsApi.remove(material.id),
            () => {
                if (editingId === material.id) {
                    resetForm();
                }
                materials.reload();
            },
        );
    }

    const items = materials.data ?? [];
    const totalCost = items.reduce(
        (total, material) => total + material.quantity * material.unit_cost,
        0,
    );

    return (
        <Panel title="Materiales">
            <AsyncStatus
                loading={materials.loading}
                error={materials.error}
                onRetry={materials.reload}
                isEmpty={items.length === 0}
                emptyText="Este proyecto no tiene materiales."
            />
            {items.length > 0 && (
                <table>
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Categoría</th>
                            <th className="numeric">Cantidad</th>
                            <th className="numeric">Costo unitario</th>
                            <th className="numeric">Subtotal</th>
                            <th />
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((material) => (
                            <tr
                                key={material.id}
                                className={material.id === editingId ? "row-editing" : undefined}
                            >
                                <td data-label="Nombre">{material.name}</td>
                                <td data-label="Categoría">{material.category ?? "—"}</td>
                                <td data-label="Cantidad" className="numeric">
                                    {formatNumber(material.quantity)} {material.unit}
                                </td>
                                <td data-label="Costo unitario" className="numeric">{formatMoney(material.unit_cost)}</td>
                                <td data-label="Subtotal" className="numeric">
                                    {formatMoney(material.quantity * material.unit_cost)}
                                </td>
                                <td>
                                    <RowActions
                                        label={`material ${material.name}`}
                                        onEdit={() => startEdit(material)}
                                        onDelete={() => handleDelete(material)}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr>
                            <th colSpan={4}>Total</th>
                            <th className="numeric">{formatMoney(totalCost)}</th>
                            <th />
                        </tr>
                    </tfoot>
                </table>
            )}
            <form className="form-row" ref={form} onSubmit={handleSubmit}>
                <label>
                    Nombre
                    <input
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        maxLength={160}
                        required
                    />
                </label>
                <label>
                    Categoría
                    <input
                        value={category}
                        onChange={(event) => setCategory(event.target.value)}
                        maxLength={80}
                    />
                </label>
                <label>
                    Unidad
                    <input
                        value={unit}
                        onChange={(event) => setUnit(event.target.value)}
                        maxLength={20}
                        required
                    />
                </label>
                <label>
                    Cantidad
                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={quantity}
                        onChange={(event) => setQuantity(event.target.value)}
                    />
                </label>
                <label>
                    Costo unitario
                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={unitCost}
                        onChange={(event) => setUnitCost(event.target.value)}
                    />
                </label>
                <FormActions
                    editing={editingId !== null}
                    addLabel="Agregar material"
                    onCancel={resetForm}
                />
            </form>
        </Panel>
    );
}
