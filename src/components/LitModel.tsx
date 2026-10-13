import { useAsync } from "../hooks/useAsync";
import { structureApi } from "../services/api";
import type { StructureViewer as Engine } from "../three/BuildingSceneManager";
import type { LightingSettings } from "../utils/lighting";
import { AsyncStatus } from "./AsyncStatus";
import { StructureViewer } from "./StructureViewer";

export type { Engine };

interface LitModelProps {
    projectId: number;
    lighting: LightingSettings;
    onEngine?: (engine: Engine | null) => void;
}

/** A project's model alone, under the presentation light, for the lighting and render screens. */
export function LitModel({ projectId, lighting, onEngine }: LitModelProps) {
    const structure = useAsync(() => structureApi.get(projectId), [projectId]);
    const data = structure.data;
    const isEmpty =
        data === null ||
        data.project_id !== projectId ||
        (data.terrains.length === 0 && data.rooms.length === 0 && data.components.length === 0);

    return (
        <>
            <AsyncStatus
                loading={structure.loading}
                error={structure.error}
                onRetry={structure.reload}
                isEmpty={isEmpty}
                emptyTitle="Sin modelo"
                emptyText="Este proyecto todavía no tiene terrenos con medidas, cuartos ni componentes que dibujar."
            />
            {data !== null && !isEmpty && (
                <StructureViewer structure={data} preview lighting={lighting} onEngine={onEngine} />
            )}
        </>
    );
}
