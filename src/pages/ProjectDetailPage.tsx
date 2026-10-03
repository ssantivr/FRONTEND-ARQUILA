import { useState, type FormEvent } from "react";

import { AsyncStatus } from "../components/AsyncStatus";
import { StatusBadge } from "../components/Badge";
import { ElevationsPanel } from "../components/ElevationsPanel";
import { Panel } from "../components/Panel";
import { PlansPanel } from "../components/PlansPanel";
import { errorMessage, useAsync } from "../hooks/useAsync";
import { materialsApi, projectsApi, terrainsApi } from "../services/api";
import type { ProjectStatus } from "../types/api";
import type { SectionProps } from "../types/ui";
import { formatMoney, formatNumber, optionalNumber, optionalText } from "../utils/format";

interface ProjectDetailPageProps {
    projectId: number;
    onBack: () => void;
}

export function ProjectDetailPage({ projectId, onBack }: ProjectDetailPageProps) {
    const project = useAsync(() => projectsApi.get(projectId), [projectId]);
    const [actionError, setActionError] = useState<string | null>(null);

    async function run(action: () => Promise<unknown>, onDone: () => void) {
        setActionError(null);

        try {
            await action();
            onDone();
        } catch (reason) {
            setActionError(errorMessage(reason));
        }
    }

    if (project.data === null) {
        return (
            <Panel title="Proyecto" actions={<BackButton onBack={onBack} />}>
                <AsyncStatus
                    loading={project.loading}
                    error={project.error}
                    isEmpty
                    emptyText="Proyecto no encontrado."
                />
            </Panel>
        );
    }

    const current = project.data;

    return (
        <>
            <Panel title={current.name} actions={<BackButton onBack={onBack} />}>
                <div className="project-summary">
                    <StatusBadge status={current.status} />
                    <span>{current.location ?? "Sin ubicación"}</span>
                    <select
                        aria-label="Cambiar estado"
                        value={current.status}
                        onChange={(event) =>
                            run(
                                () =>
                                    projectsApi.update(projectId, {
                                        status: event.target.value as ProjectStatus,
                                    }),
                                project.reload,
                            )
                        }
                    >
                        <option value="draft">Borrador</option>
                        <option value="active">Activo</option>
                        <option value="archived">Archivado</option>
                    </select>
                    <button
                        type="button"
                        className="button-danger"
                        onClick={() => {
                            if (window.confirm(`¿Eliminar el proyecto "${current.name}"?`)) {
                                run(() => projectsApi.remove(projectId), onBack);
                            }
                        }}
                    >
                        Eliminar proyecto
                    </button>
                </div>
                {actionError && (
                    <p className="message message-error" role="alert">
                        {actionError}
                    </p>
                )}
            </Panel>

            <TerrainsPanel projectId={projectId} run={run} />
            <PlansPanel projectId={projectId} run={run} />
            <ElevationsPanel projectId={projectId} run={run} />
            <MaterialsPanel projectId={projectId} run={run} />
        </>
    );
}

function BackButton({ onBack }: { onBack: () => void }) {
    return (
        <button type="button" className="button-secondary" onClick={onBack}>
            ← Proyectos
        </button>
    );
}

function TerrainsPanel({ projectId, run }: SectionProps) {
    const terrains = useAsync(() => terrainsApi.listByProject(projectId), [projectId]);
    const [name, setName] = useState("");
    const [area, setArea] = useState("");
    const [slope, setSlope] = useState("");
    const [soilType, setSoilType] = useState("");

    function handleCreate(event: FormEvent) {
        event.preventDefault();

        run(
            () =>
                terrainsApi.create(projectId, {
                    name: name.trim(),
                    area_m2: Number(area),
                    slope_percent: optionalNumber(slope),
                    soil_type: optionalText(soilType),
                }),
            () => {
                setName("");
                setArea("");
                setSlope("");
                setSoilType("");
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
                            <th className="numeric">Área (m²)</th>
                            <th className="numeric">Pendiente (%)</th>
                            <th>Suelo</th>
                            <th />
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((terrain) => (
                            <tr key={terrain.id}>
                                <td>{terrain.name}</td>
                                <td className="numeric">{formatNumber(terrain.area_m2)}</td>
                                <td className="numeric">
                                    {formatNumber(terrain.slope_percent)}
                                </td>
                                <td>{terrain.soil_type ?? "—"}</td>
                                <td className="numeric">
                                    <button
                                        type="button"
                                        className="button-danger"
                                        aria-label={`Eliminar terreno ${terrain.name}`}
                                        onClick={() =>
                                            run(
                                                () => terrainsApi.remove(terrain.id),
                                                terrains.reload,
                                            )
                                        }
                                    >
                                        Eliminar
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
            <form className="form-row" onSubmit={handleCreate}>
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
                    Área (m²)
                    <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={area}
                        onChange={(event) => setArea(event.target.value)}
                        required
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
                <button type="submit">Agregar terreno</button>
            </form>
        </Panel>
    );
}

function MaterialsPanel({ projectId, run }: SectionProps) {
    const materials = useAsync(() => materialsApi.listByProject(projectId), [projectId]);
    const [name, setName] = useState("");
    const [category, setCategory] = useState("");
    const [unit, setUnit] = useState("");
    const [quantity, setQuantity] = useState("");
    const [unitCost, setUnitCost] = useState("");

    function handleCreate(event: FormEvent) {
        event.preventDefault();

        run(
            () =>
                materialsApi.create(projectId, {
                    name: name.trim(),
                    category: optionalText(category),
                    unit: unit.trim(),
                    quantity: optionalNumber(quantity),
                    unit_cost: optionalNumber(unitCost),
                }),
            () => {
                setName("");
                setCategory("");
                setUnit("");
                setQuantity("");
                setUnitCost("");
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
                            <tr key={material.id}>
                                <td>{material.name}</td>
                                <td>{material.category ?? "—"}</td>
                                <td className="numeric">
                                    {formatNumber(material.quantity)} {material.unit}
                                </td>
                                <td className="numeric">{formatMoney(material.unit_cost)}</td>
                                <td className="numeric">
                                    {formatMoney(material.quantity * material.unit_cost)}
                                </td>
                                <td className="numeric">
                                    <button
                                        type="button"
                                        className="button-danger"
                                        aria-label={`Eliminar material ${material.name}`}
                                        onClick={() =>
                                            run(
                                                () => materialsApi.remove(material.id),
                                                materials.reload,
                                            )
                                        }
                                    >
                                        Eliminar
                                    </button>
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
            <form className="form-row" onSubmit={handleCreate}>
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
                <button type="submit">Agregar material</button>
            </form>
        </Panel>
    );
}
