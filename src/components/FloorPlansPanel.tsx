import { useState } from "react";

import { useAsync } from "../hooks/useAsync";
import { structureApi } from "../services/api";
import { buildingIndicators, planLevels } from "../utils/building";
import { formatNumber } from "../utils/format";
import { AsyncStatus } from "./AsyncStatus";
import { FloorPlan } from "./FloorPlan";
import { MetricCard } from "./MetricCard";
import { Panel } from "./Panel";

interface FloorPlansPanelProps {
    projectId: number;
    projectName: string;
}

const DEFAULT_MAX_COS = "0.6";
const DEFAULT_MAX_CUS = "1.8";

function compliance(value: number | null, limit: string): string {
    const max = Number(limit);

    if (value === null) {
        return "Falta el contorno del terreno";
    }

    if (limit.trim() === "" || !Number.isFinite(max) || max <= 0) {
        return "Escribe un máximo para comparar";
    }

    return `${value <= max ? "Cumple" : "No cumple"} · máx. ${formatNumber(max)}`;
}

export function FloorPlansPanel({ projectId, projectName }: FloorPlansPanelProps) {
    const structure = useAsync(() => structureApi.get(projectId), [projectId]);
    const [maxCos, setMaxCos] = useState(DEFAULT_MAX_COS);
    const [maxCus, setMaxCus] = useState(DEFAULT_MAX_CUS);
    const levels = structure.data === null ? [] : planLevels(structure.data);
    const indicators = structure.data === null ? null : buildingIndicators(structure.data);

    return (
        <>
            <Panel title="Ocupación del lote">
                <p className="message">
                    Se calcula con los cuartos del modelo y el contorno del primer terreno. El
                    COS es la huella de la planta baja entre el área del lote; el CUS, el área
                    construida de todos los niveles entre el área del lote. Los máximos se
                    escriben aquí según la norma del municipio y no se guardan.
                </p>
                <AsyncStatus
                    loading={structure.loading}
                    error={structure.error}
                    isEmpty={indicators === null}
                    emptyText="Agrega cuartos en la pestaña Modelo 3D, o crea un proyecto de ejemplo, para calcular la ocupación."
                />
                {indicators !== null && (
                    <>
                        <div className="metrics">
                            <MetricCard
                                label="COS"
                                value={indicators.cos === null ? "—" : indicators.cos.toFixed(2)}
                                detail={compliance(indicators.cos, maxCos)}
                            />
                            <MetricCard
                                label="CUS"
                                value={indicators.cus === null ? "—" : indicators.cus.toFixed(2)}
                                detail={compliance(indicators.cus, maxCus)}
                            />
                            <MetricCard
                                label="Huella construida"
                                value={`${formatNumber(indicators.footprint)} m²`}
                                detail={
                                    indicators.freeArea === null
                                        ? undefined
                                        : `${formatNumber(indicators.freeArea)} m² libres de ${formatNumber(indicators.lotArea)} m²`
                                }
                            />
                            <MetricCard
                                label="Área construida"
                                value={`${formatNumber(indicators.builtArea)} m²`}
                                detail={`${indicators.levels === 1 ? "1 nivel" : `${indicators.levels} niveles`} · ${formatNumber(indicators.height)} m de altura`}
                            />
                        </div>
                        <div className="form-row">
                            <label>
                                COS máximo
                                <input
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    value={maxCos}
                                    onChange={(event) => setMaxCos(event.target.value)}
                                />
                            </label>
                            <label>
                                CUS máximo
                                <input
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    value={maxCus}
                                    onChange={(event) => setMaxCus(event.target.value)}
                                />
                            </label>
                        </div>
                    </>
                )}
            </Panel>
            <Panel title="Plantas generadas">
                <p className="message">
                    Una planta por cada nivel del modelo, dibujada con sus cuartos y componentes
                    y con las cotas totales. Se actualizan solas al cambiar el modelo.
                </p>
                <AsyncStatus
                    loading={structure.loading}
                    error={structure.error}
                    isEmpty={levels.length === 0}
                    emptyText="Todavía no hay niveles con cuartos o componentes."
                />
                {levels.map((level) => (
                    <FloorPlan key={level.planId} level={level} projectName={projectName} />
                ))}
            </Panel>
        </>
    );
}
