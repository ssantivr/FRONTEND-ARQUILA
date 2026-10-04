import { AsyncStatus } from "../components/AsyncStatus";
import { MetricCard } from "../components/MetricCard";
import { Panel } from "../components/Panel";
import { useAsync } from "../hooks/useAsync";
import { loadAcrossProjects, terrainsApi } from "../services/api";
import type { Terrain } from "../types/api";
import { formatNumber } from "../utils/format";

interface TerrainsPageProps {
    onOpenProject: (projectId: number) => void;
}

function describeShape(terrain: Terrain): string {
    if (terrain.points.length >= 3) {
        return `${terrain.points.length} vértices`;
    }

    if (terrain.width_m !== null && terrain.length_m !== null) {
        return `${formatNumber(terrain.width_m)} × ${formatNumber(terrain.length_m)} m`;
    }

    return "—";
}

export function TerrainsPage({ onOpenProject }: TerrainsPageProps) {
    const data = useAsync(() => loadAcrossProjects(terrainsApi.listByProject), []);
    const terrains = data.data?.items ?? [];
    const projectNames = new Map((data.data?.projects ?? []).map((item) => [item.id, item.name]));
    const totalArea = terrains.reduce((sum, terrain) => sum + terrain.area_m2, 0);
    const slopes = terrains.flatMap((terrain) =>
        terrain.slope_percent === null ? [] : [terrain.slope_percent],
    );
    const steepest = slopes.length === 0 ? null : Math.max(...slopes);

    return (
        <>
            <Panel title="Terrenos">
                <p className="message">
                    Los terrenos de todos tus proyectos. Para agregar o editar uno, ábrelo desde
                    su proyecto.
                </p>
                <div className="metrics">
                    <MetricCard label="Terrenos" value={formatNumber(terrains.length)} />
                    <MetricCard label="Área total" value={`${formatNumber(totalArea)} m²`} />
                    <MetricCard
                        label="Pendiente máxima"
                        value={steepest === null ? "—" : `${formatNumber(steepest)} %`}
                        detail={`${slopes.length} con pendiente registrada`}
                    />
                </div>
            </Panel>
            <Panel title="Listado">
                <AsyncStatus
                    loading={data.loading}
                    error={data.error}
                    isEmpty={terrains.length === 0}
                    emptyText="Todavía no hay terrenos. Regístralos en la pestaña Terreno de un proyecto."
                />
                {terrains.length > 0 && (
                    <table>
                        <thead>
                            <tr>
                                <th>Terreno</th>
                                <th>Proyecto</th>
                                <th className="numeric">Área</th>
                                <th>Forma</th>
                                <th className="numeric">Pendiente</th>
                                <th>Suelo</th>
                                <th />
                            </tr>
                        </thead>
                        <tbody>
                            {terrains.map((terrain) => (
                                <tr key={terrain.id}>
                                    <td data-label="Terreno">{terrain.name}</td>
                                    <td data-label="Proyecto">
                                        {projectNames.get(terrain.project_id) ?? "—"}
                                    </td>
                                    <td data-label="Área" className="numeric">
                                        {formatNumber(terrain.area_m2)} m²
                                    </td>
                                    <td data-label="Forma">{describeShape(terrain)}</td>
                                    <td data-label="Pendiente" className="numeric">
                                        {terrain.slope_percent === null
                                            ? "—"
                                            : `${formatNumber(terrain.slope_percent)} %`}
                                    </td>
                                    <td data-label="Suelo">{terrain.soil_type ?? "—"}</td>
                                    <td>
                                        <button
                                            type="button"
                                            className="button-secondary"
                                            aria-label={`Abrir el proyecto del terreno ${terrain.name}`}
                                            onClick={() => onOpenProject(terrain.project_id)}
                                        >
                                            Abrir
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </Panel>
        </>
    );
}
