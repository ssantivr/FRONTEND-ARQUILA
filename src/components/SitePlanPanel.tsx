import { useAsync } from "../hooks/useAsync";
import { terrainsApi } from "../services/api";
import { AsyncStatus } from "./AsyncStatus";
import { Panel } from "./Panel";
import { SitePlan } from "./SitePlan";

export function SitePlanPanel({ projectId }: { projectId: number }) {
    const terrains = useAsync(() => terrainsApi.listByProject(projectId), [projectId]);
    const items = terrains.data ?? [];

    return (
        <Panel title="Plano de implantación">
            <p className="message">
                Se dibuja con las medidas del terreno. El retiro y el norte se eligen aquí y no se
                guardan; el acceso se asume por el frente del lote.
            </p>
            <AsyncStatus
                loading={terrains.loading}
                error={terrains.error}
                onRetry={terrains.reload}
                isEmpty={items.length === 0}
                emptyText="Registra un terreno para ver su implantación."
            />
            {items.map((terrain) => (
                <SitePlan key={terrain.id} terrain={terrain} />
            ))}
        </Panel>
    );
}
