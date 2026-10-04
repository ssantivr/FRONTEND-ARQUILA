import { useAsync } from "../hooks/useAsync";
import { structureApi } from "../services/api";
import type { SectionProps } from "../types/ui";
import { AsyncStatus } from "./AsyncStatus";
import { ComponentsPanel } from "./ComponentsPanel";
import { Panel } from "./Panel";
import { RoomsPanel } from "./RoomsPanel";
import { StructureViewer } from "./StructureViewer";

export function StructurePanel({ projectId, run }: SectionProps) {
    const structure = useAsync(() => structureApi.get(projectId), [projectId]);
    const isEmpty =
        structure.data === null ||
        (structure.data.terrains.length === 0 &&
            structure.data.rooms.length === 0 &&
            structure.data.components.length === 0);

    return (
        <>
            <Panel title="Modelo 3D">
                <p className="message">
                    Cada terreno es una losa y cada plano con cuartos o componentes es un nivel.
                    Mientras el proyecto no tenga ninguno, los planos con nivel numérico se
                    dibujan como volúmenes de 3 m dentro del retiro del primer terreno
                    rectangular. Las ventanas, la puerta, el techo y los árboles son decorativos.
                </p>
                <AsyncStatus
                    loading={structure.loading}
                    error={structure.error}
                    isEmpty={isEmpty}
                    emptyText="Registra un terreno con medidas, un cuarto o un componente para ver el modelo."
                />
                {structure.data !== null && !isEmpty && (
                    <StructureViewer structure={structure.data} />
                )}
            </Panel>
            <RoomsPanel projectId={projectId} run={run} onChanged={structure.reload} />
            <ComponentsPanel projectId={projectId} run={run} onChanged={structure.reload} />
        </>
    );
}
