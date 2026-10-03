import { useState, type FormEvent } from "react";

import { useAsync } from "../hooks/useAsync";
import { terrainsApi } from "../services/api";
import type { Terrain } from "../types/api";
import type { SectionProps } from "../types/ui";
import { formatNumber, optionalNumber, optionalText } from "../utils/format";
import { AsyncStatus } from "./AsyncStatus";
import { Panel } from "./Panel";
import { FormActions, RowActions } from "./RowActions";
import { TerrainDiagrams } from "./TerrainDiagrams";

export function TerrainsPanel({ projectId, run }: SectionProps) {
    const terrains = useAsync(() => terrainsApi.listByProject(projectId), [projectId]);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [name, setName] = useState("");
    const [width, setWidth] = useState("");
    const [length, setLength] = useState("");
    const [area, setArea] = useState("");
    const [slope, setSlope] = useState("");
    const [soilType, setSoilType] = useState("");

    const widthValue = optionalNumber(width);
    const lengthValue = optionalNumber(length);
    const rectangleArea =
        widthValue !== undefined && lengthValue !== undefined
            ? widthValue * lengthValue
            : undefined;

    function resetForm() {
        setEditingId(null);
        setName("");
        setWidth("");
        setLength("");
        setArea("");
        setSlope("");
        setSoilType("");
    }

    function startEdit(terrain: Terrain) {
        setEditingId(terrain.id);
        setName(terrain.name);
        setWidth(String(terrain.width_m ?? ""));
        setLength(String(terrain.length_m ?? ""));
        setArea(String(terrain.area_m2));
        setSlope(String(terrain.slope_percent ?? ""));
        setSoilType(terrain.soil_type ?? "");
    }

    function handleSubmit(event: FormEvent) {
        event.preventDefault();

        const data = {
            name: name.trim(),
            area_m2: optionalNumber(area) ?? rectangleArea ?? 0,
            width_m: widthValue ?? null,
            length_m: lengthValue ?? null,
            slope_percent: optionalNumber(slope) ?? null,
            soil_type: optionalText(soilType) ?? null,
        };

        run(
            () =>
                editingId === null
                    ? terrainsApi.create(projectId, data)
                    : terrainsApi.update(editingId, data),
            () => {
                resetForm();
                terrains.reload();
            },
        );
    }

    function handleDelete(terrain: Terrain) {
        run(
            () => terrainsApi.remove(terrain.id),
            () => {
                if (editingId === terrain.id) {
                    resetForm();
                }
                terrains.reload();
            },
        );
    }

    const items = terrains.data ?? [];

    return (
        <Panel title="Terrenos">
            <AsyncStatus
                loading={terrains.loading}
                error={terrains.error}
                isEmpty={items.length === 0}
                emptyText="Este proyecto no tiene terrenos."
            />
            {items.length > 0 && (
                <table>
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th className="numeric">Ancho × largo (m)</th>
                            <th className="numeric">Área (m²)</th>
                            <th className="numeric">Pendiente (%)</th>
                            <th>Suelo</th>
                            <th />
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((terrain) => (
                            <tr
                                key={terrain.id}
                                className={terrain.id === editingId ? "row-editing" : undefined}
                            >
                                <td>{terrain.name}</td>
                                <td className="numeric">
                                    {formatNumber(terrain.width_m)} ×{" "}
                                    {formatNumber(terrain.length_m)}
                                </td>
                                <td className="numeric">{formatNumber(terrain.area_m2)}</td>
                                <td className="numeric">
                                    {formatNumber(terrain.slope_percent)}
                                </td>
                                <td>{terrain.soil_type ?? "—"}</td>
                                <td>
                                    <RowActions
                                        label={`terreno ${terrain.name}`}
                                        onEdit={() => startEdit(terrain)}
                                        onDelete={() => handleDelete(terrain)}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
            {items.map((terrain) => (
                <TerrainDiagrams key={terrain.id} terrain={terrain} />
            ))}
            <form className="form-row" onSubmit={handleSubmit}>
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
                    Ancho (m)
                    <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={width}
                        onChange={(event) => setWidth(event.target.value)}
                    />
                </label>
                <label>
                    Largo (m)
                    <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={length}
                        onChange={(event) => setLength(event.target.value)}
                    />
                </label>
                <label>
                    Área (m²)
                    <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={area}
                        onChange={(event) => setArea(event.target.value)}
                        placeholder={
                            rectangleArea === undefined ? undefined : formatNumber(rectangleArea)
                        }
                        required={rectangleArea === undefined}
                    />
                </label>
                <label>
                    Pendiente (%)
                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={slope}
                        onChange={(event) => setSlope(event.target.value)}
                    />
                </label>
                <label>
                    Suelo
                    <input
                        value={soilType}
                        onChange={(event) => setSoilType(event.target.value)}
                        maxLength={80}
                    />
                </label>
                <FormActions
                    editing={editingId !== null}
                    addLabel="Agregar terreno"
                    onCancel={resetForm}
                />
            </form>
        </Panel>
    );
}
