import { useAsync } from "../hooks/useAsync";
import { structureApi } from "../services/api";
import type { StructureViewer as Engine } from "../three/BuildingSceneManager";
import type { LightingSettings, SolarSite } from "../utils/lighting";
import { AsyncStatus } from "./AsyncStatus";
import { StructureViewer } from "./StructureViewer";

export type { Engine };

interface LitModelProps {
    projectId: number;
    lighting: LightingSettings;
    /** Coordinates of the lot: with them the light is the real sun of the date and hour. */
    site?: SolarSite | null;
    onEngine?: (engine: Engine | null) => void;
}

/** A project's model alone, under the presentation light, for the lighting and render screens. */
export function LitModel({ projectId, lighting, site = null, onEngine }: LitModelProps) {
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
                <StructureViewer
                    structure={data}
                    preview
                    lighting={lighting}
                    site={site}
                    onEngine={onEngine}
                />
            )}
        </>
    );
}
