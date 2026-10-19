import { useAsync } from "../hooks/useAsync";
import { structureApi } from "../services/api";
import { StructureViewer } from "./StructureViewer";

/**
 * The project's real 3D model, without panels, to show it on another screen. It draws nothing
 * until the model arrives, or if the project has nothing to draw: what is behind stays visible.
 */
export function ProjectPreview({ projectId }: { projectId: number }) {
    const structure = useAsync(() => structureApi.get(projectId), [projectId]);
    const data = structure.data;

    if (
        data === null ||
        data.project_id !== projectId ||
        (data.terrains.length === 0 && data.rooms.length === 0 && data.components.length === 0)
    ) {
        return null;
    }

    return <StructureViewer structure={data} preview />;
}
