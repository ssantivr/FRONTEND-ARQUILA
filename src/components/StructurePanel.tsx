import { useAsync } from "../hooks/useAsync";
import { structureApi } from "../services/api";
import type { SectionProps } from "../types/ui";
import { AsyncStatus } from "./AsyncStatus";
import { ComponentsPanel } from "./ComponentsPanel";
import { Icon } from "./Icon";
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
            <section className="viewer-section" aria-labelledby="viewer-title">
                <header className="viewer-section-head">
                    <h2 id="viewer-title">Modelo 3D</h2>
                    <details className="help">
                        <summary>
                            <Icon name="help" />
                            Cómo se arma el modelo
                        </summary>
                        <p>
                            Cada terreno es una losa y cada plano con cuartos o componentes es un
                            nivel. Mientras el proyecto no tenga ninguno, los planos con nivel
                            numérico se dibujan como volúmenes de 3 m dentro del retiro del primer
                            terreno rectangular. Las ventanas, la puerta, el techo y los árboles son
                            decorativos.
                        </p>
                    </details>
                </header>
                <AsyncStatus
                    loading={structure.loading}
                    error={structure.error}
                    onRetry={structure.reload}
                    isEmpty={isEmpty}
                    emptyTitle="Todavía no hay nada que dibujar"
                    emptyText="Registra un terreno con medidas, un cuarto o un componente para ver el modelo."
                />
                {structure.data !== null && !isEmpty && (
                    <StructureViewer structure={structure.data} />
                )}
            </section>
            <RoomsPanel projectId={projectId} run={run} onChanged={structure.reload} />
            <ComponentsPanel projectId={projectId} run={run} onChanged={structure.reload} />
        </>
    );
}
