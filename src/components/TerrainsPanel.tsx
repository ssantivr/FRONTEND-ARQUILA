import { useRef, useState, type FormEvent } from "react";

import { useAsync } from "../hooks/useAsync";
import { terrainsApi } from "../services/api";
import type { Terrain } from "../types/api";
import type { SectionProps } from "../types/ui";
import { formatNumber, optionalNumber, optionalText } from "../utils/format";
import { formatPoints, parsePoints, polygonArea } from "../utils/geometry";
import { AsyncStatus } from "./AsyncStatus";
import { LocationField } from "./location/LocationField";
import { positionOf, type Position } from "./location/place";
import { alreadyDone, confirmDelete } from "./modal/confirmDelete";
import { useModal } from "./modal/modalContext";
import { EditDialog } from "./modal/EditDialog";
import { TextField } from "./TextField";
import { Panel } from "./Panel";
import { FormActions, RowActions } from "./RowActions";
import { TerrainDiagrams } from "./TerrainDiagrams";

interface TerrainsPanelProps extends SectionProps {
    /** The map of a terrain opens where its project is. */
    near?: Position | null;
    /** A new number reloads the list without losing what is being typed. */
    version?: number;
}

export function TerrainsPanel({ projectId, run, near, version = 0 }: TerrainsPanelProps) {
    const modal = useModal();
    const terrains = useAsync(() => terrainsApi.listByProject(projectId), [projectId, version]);
    const [editingId, setEditingId] = useState<number | null>(null);
    const form = useRef<HTMLFormElement>(null);
    const [name, setName] = useState("");
    const [width, setWidth] = useState("");
    const [length, setLength] = useState("");
    const [area, setArea] = useState("");
    const [slope, setSlope] = useState("");
    const [soilType, setSoilType] = useState("");
    const [pointsText, setPointsText] = useState("");
    const [position, setPosition] = useState<Position | null>(null);

    const widthValue = optionalNumber(width);
    const lengthValue = optionalNumber(length);
    const parsed = parsePoints(pointsText);
    const polygon = "points" in parsed && parsed.points.length >= 3 ? parsed.points : null;
    const suggestedArea =
        polygon !== null
            ? polygonArea(polygon)
            : widthValue !== undefined && lengthValue !== undefined
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
        setPointsText("");
        setPosition(null);
    }

    function startEdit(terrain: Terrain) {
        setEditingId(terrain.id);
        form.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
        setName(terrain.name);
        setWidth(String(terrain.width_m ?? ""));
        setLength(String(terrain.length_m ?? ""));
        setArea(String(terrain.area_m2));
        setSlope(String(terrain.slope_percent ?? ""));
        setSoilType(terrain.soil_type ?? "");
        setPosition(positionOf(terrain));
        setPointsText(
            formatPoints(terrain.points.map((point) => ({ x: point.x_m, y: point.y_m }))),
        );
    }

    function handleSubmit(event: FormEvent) {
        event.preventDefault();

        if ("error" in parsed) {
            return;
        }

        const data = {
            name: name.trim(),
            area_m2: optionalNumber(area) ?? suggestedArea ?? 0,
            width_m: widthValue ?? null,
            length_m: lengthValue ?? null,
            slope_percent: optionalNumber(slope) ?? null,
            soil_type: optionalText(soilType) ?? null,
            latitude: position?.latitude ?? null,
            longitude: position?.longitude ?? null,
            points:
                polygon === null ? null : polygon.map((point) => ({ x_m: point.x, y_m: point.y })),
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

    async function handleDelete(terrain: Terrain) {
        const confirmed = await confirmDelete(modal, {
            what: "el terreno",
            name: terrain.name,
            undoable: true,
            action: () => terrainsApi.remove(terrain.id),
        });

        if (!confirmed) {
            return;
        }

        run(alreadyDone, () => {
            if (editingId === terrain.id) {
                resetForm();
            }
            terrains.reload();
        });
    }

    const items = terrains.data ?? [];

    return (
        <Panel title="Terrenos">
            <AsyncStatus
                loading={terrains.loading}
                error={terrains.error}
                onRetry={terrains.reload}
                isEmpty={items.length === 0}
                emptyText="Este proyecto no tiene terrenos."
            />
            {items.length > 0 && (
                <table>
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Forma</th>
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
                                <td data-label="Nombre">{terrain.name}</td>
                                <td data-label="Forma">
                                    {terrain.points.length >= 3
                                        ? `Polígono de ${terrain.points.length} vértices`
                                        : `${formatNumber(terrain.width_m)} × ${formatNumber(terrain.length_m)} m`}
                                </td>
                                <td data-label="Área (m²)" className="numeric">
                                    {formatNumber(terrain.area_m2)}
                                </td>
                                <td data-label="Pendiente (%)" className="numeric">
                                    {formatNumber(terrain.slope_percent)}
                                </td>
                                <td data-label="Suelo">{terrain.soil_type ?? "—"}</td>
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
            <EditDialog
                editing={editingId !== null}
                title="Actualizar el terreno"
                onCancel={resetForm}
            >
                <form className="form-row" ref={form} onSubmit={handleSubmit}>
                    <TextField label="Nombre" value={name} onChange={setName} max={160} required />
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
                                suggestedArea === undefined
                                    ? undefined
                                    : formatNumber(suggestedArea)
                            }
                            required={suggestedArea === undefined}
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
                    <TextField label="Suelo" value={soilType} onChange={setSoilType} max={80} />
                    <LocationField
                        withLabel={false}
                        near={near}
                        value={{ label: "", position }}
                        onChange={(next) => setPosition(next.position)}
                    />
                    <label className="field-full">
                        Vértices del lote, si no es rectangular: un punto «x y» en metros por línea
                        <textarea
                            value={pointsText}
                            onChange={(event) => setPointsText(event.target.value)}
                            rows={4}
                            // Numbers only: room for the 50 points the API takes.
                            maxLength={2000}
                            placeholder={"0 0\n20 0\n20 10\n10 10\n10 30\n0 30"}
                            aria-invalid={"error" in parsed}
                        />
                    </label>
                    {"error" in parsed && (
                        <p className="message message-error field-full" role="alert">
                            {parsed.error}
                        </p>
                    )}
                    <FormActions
                        editing={editingId !== null}
                        addLabel="Agregar terreno"
                        disabled={"error" in parsed}
                        onCancel={resetForm}
                    />
                </form>
            </EditDialog>
        </Panel>
    );
}
