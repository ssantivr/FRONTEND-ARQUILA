import { useState } from "react";

import { useAsync } from "../hooks/useAsync";
import { structureApi } from "../services/api";
import { buildingIndicators, planLevels } from "../utils/building";
import { formatNumber } from "../utils/format";
import { placeOpenings } from "../utils/openings";
import { AsyncStatus } from "./AsyncStatus";
import { FloorPlan } from "./FloorPlan";
import { MetricCard } from "./ui/MetricCard";
import { Panel } from "./ui/Panel";
import { readSiteSettings, saveSiteLimits } from "../state/siteSettings";

interface FloorPlansPanelProps {
    projectId: number;
    projectName: string;
    version: number;
}

const MAX_OVERLAPS_SHOWN = 5;
const DEFAULT_MAX_COS = "0.6";
const DEFAULT_MAX_CUS = "1.8";

function ratio(value: number): string {
    return value.toFixed(2).replace(".", ",");
}

function squareMeters(value: number): string {
    return `${formatNumber(value)} m²`;
}

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

export function FloorPlansPanel({ projectId, projectName, version }: FloorPlansPanelProps) {
    const structure = useAsync(() => structureApi.get(projectId), [projectId, version]);
    // The limits the user wrote for this project come back when the tab is opened again.
    const [saved] = useState(() => readSiteSettings(projectId));
    const [maxCos, setMaxCos] = useState(saved.maxCos ?? DEFAULT_MAX_COS);
    const [maxCus, setMaxCus] = useState(saved.maxCus ?? DEFAULT_MAX_CUS);
    const levels = structure.data === null ? [] : planLevels(structure.data);
    const indicators = structure.data === null ? null : buildingIndicators(structure.data);
    const openings = placeOpenings(structure.data?.rooms ?? []);

    return (
        <>
            <Panel title="Ocupación del lote">
                <p className="message">
                    Se calcula con los cuartos del modelo y el contorno del primer terreno. El COS
                    es la huella de la planta baja entre el área del lote; el CUS, el área
                    construida de todos los niveles entre el área del lote. Los máximos se escriben
                    aquí según la norma del municipio y se recuerdan en este navegador.
                </p>
                <AsyncStatus
                    loading={structure.loading}
                    error={structure.error}
                    onRetry={structure.reload}
                    isEmpty={indicators === null}
                    emptyText="Agrega cuartos en la pestaña Modelo 3D, o crea un proyecto de ejemplo, para calcular la ocupación."
                />
                {indicators !== null && indicators.overlaps.length > 0 && (
                    <div className="message message-warning" role="status">
                        <p>
                            <strong>
                                {indicators.overlaps.length === 1
                                    ? "Hay dos cuartos que se solapan."
                                    : `Hay ${indicators.overlaps.length} pares de cuartos que se solapan.`}
                            </strong>{" "}
                            El suelo que comparten se cuenta una sola vez en el COS, el CUS y las
                            áreas. Revisa su posición o sus medidas en la pestaña Modelo 3D.
                        </p>
                        <ul>
                            {indicators.overlaps.slice(0, MAX_OVERLAPS_SHOWN).map((overlap) => (
                                <li key={`${overlap.level}-${overlap.first}-${overlap.second}`}>
                                    {overlap.first} y {overlap.second} ({overlap.level}):{" "}
                                    {formatNumber(overlap.area)} m² en común
                                </li>
                            ))}
                        </ul>
                        {indicators.overlaps.length > MAX_OVERLAPS_SHOWN && (
                            <p>
                                Y {indicators.overlaps.length - MAX_OVERLAPS_SHOWN} más, de menor
                                tamaño.
                            </p>
                        )}
                    </div>
                )}
                {indicators !== null && (
                    <>
                        <div className="metrics">
                            <MetricCard
                                label="COS"
                                value={indicators.cos === null ? "—" : ratio(indicators.cos)}
                                count={
                                    indicators.cos === null
                                        ? undefined
                                        : { to: indicators.cos, format: ratio, step: 0.01 }
                                }
                                detail={compliance(indicators.cos, maxCos)}
                            />
                            <MetricCard
                                label="CUS"
                                value={indicators.cus === null ? "—" : ratio(indicators.cus)}
                                count={
                                    indicators.cus === null
                                        ? undefined
                                        : { to: indicators.cus, format: ratio, step: 0.01 }
                                }
                                detail={compliance(indicators.cus, maxCus)}
                            />
                            <MetricCard
                                label="Huella construida"
                                value={`${formatNumber(indicators.footprint)} m²`}
                                count={{ to: indicators.footprint, format: squareMeters }}
                                detail={
                                    indicators.freeArea === null
                                        ? undefined
                                        : `${formatNumber(indicators.freeArea)} m² libres de ${formatNumber(indicators.lotArea)} m²`
                                }
                            />
                            <MetricCard
                                label="Área construida"
                                value={`${formatNumber(indicators.builtArea)} m²`}
                                count={{ to: indicators.builtArea, format: squareMeters }}
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
                                    onChange={(event) => {
                                        setMaxCos(event.target.value);
                                        saveSiteLimits(projectId, { maxCos: event.target.value });
                                    }}
                                />
                            </label>
                            <label>
                                CUS máximo
                                <input
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    value={maxCus}
                                    onChange={(event) => {
                                        setMaxCus(event.target.value);
                                        saveSiteLimits(projectId, { maxCus: event.target.value });
                                    }}
                                />
                            </label>
                        </div>
                    </>
                )}
            </Panel>
            <Panel title="Plantas generadas">
                <p className="message">
                    Una planta por cada nivel del modelo, con ejes, cotas entre ejes, muros,
                    ventanas y puerta. Los ejes pasan por los bordes de los cuartos. Se actualizan
                    solas al cambiar el modelo.
                </p>
                <AsyncStatus
                    loading={structure.loading}
                    error={structure.error}
                    onRetry={structure.reload}
                    isEmpty={levels.length === 0}
                    emptyText="Todavía no hay niveles con cuartos o componentes."
                />
                {levels.map((level) => (
                    <FloorPlan
                        key={level.planId}
                        level={level}
                        projectName={projectName}
                        openings={openings}
                    />
                ))}
            </Panel>
        </>
    );
}
