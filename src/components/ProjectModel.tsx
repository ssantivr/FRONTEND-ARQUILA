import { useAsync } from "../hooks/useAsync";
import { structureApi } from "../services/api";
import { AsyncStatus } from "./AsyncStatus";
import { StructureViewer } from "./StructureViewer";

export function ProjectModel({ projectId }: { projectId: number }) {
    const structure = useAsync(() => structureApi.get(projectId), [projectId]);
    const isEmpty =
        structure.data === null ||
        structure.data.project_id !== projectId ||
        (structure.data.terrains.length === 0 &&
            structure.data.rooms.length === 0 &&
            structure.data.components.length === 0);

    return (
        <>
            <AsyncStatus
                loading={structure.loading}
                error={structure.error}
                onRetry={structure.reload}
                isEmpty={isEmpty}
                emptyText="Este proyecto todavía no tiene terrenos con medidas, cuartos ni componentes."
            />
            {structure.data !== null && !isEmpty && <StructureViewer structure={structure.data} />}
        </>
    );
}
