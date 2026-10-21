import { useState } from "react";

import { errorMessage, useAsync } from "../hooks/useAsync";
import { projectsApi, structureApi } from "../services/api";
import { showToast } from "../state/toasts";
import type { StructureElement } from "../types/api";
import {
    DEFAULT_SURFACE,
    SURFACE_MATERIALS,
    type SurfaceMaterialId,
} from "../utils/surfaceMaterials";
import { AsyncStatus } from "./AsyncStatus";
import { Button } from "./ui/Button";
import { Select } from "./ui/Input";

import styles from "./SurfaceLibrary.module.css";

const KINDS: Record<StructureElement["kind"], string> = {
    room: "Cuarto",
    volume: "Volumen",
    column: "Columna",
    beam: "Viga",
    wall: "Muro",
};

function keyOf(element: StructureElement): string {
    return `${element.kind}:${element.id}`;
}

/**
 * Puts a surface on a room or component of a project's model, the same `PATCH …/surface` the
 * inspector of the 3D editor uses: the choice is saved in the project, not in this browser.
 */
export function SurfaceApply({ surfaceId }: { surfaceId: SurfaceMaterialId }) {
    const projects = useAsync(() => projectsApi.list(), []);
    const [projectId, setProjectId] = useState<number | null>(null);
    const [elementKey, setElementKey] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const structure = useAsync(
        () => (projectId === null ? Promise.resolve(null) : structureApi.get(projectId)),
        [projectId],
    );
    const elements: StructureElement[] =
        structure.data === null ? [] : [...structure.data.rooms, ...structure.data.components];
    const element = elements.find((item) => keyOf(item) === elementKey) ?? null;
    const label = SURFACE_MATERIALS[surfaceId].label;
    // Without a surface of its own an element is drawn with the one of its kind.
    const current = element === null ? null : (element.surface ?? DEFAULT_SURFACE[element.kind]);

    async function apply() {
        if (projectId === null || element === null) {
            return;
        }

        setSaving(true);
        setError(null);

        try {
            await structureApi.setSurface(projectId, element, surfaceId);
            structure.reload();
            showToast(`«${label}» aplicada a ${element.name}.`);
        } catch (reason) {
            setError(errorMessage(reason));
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className={styles.apply}>
            <AsyncStatus
                loading={projects.loading}
                error={projects.error}
                onRetry={projects.reload}
                isEmpty={(projects.data ?? []).length === 0}
                emptyText="Todavía no tienes proyectos: crea uno con su modelo para aplicar superficies."
            />
            {(projects.data ?? []).length > 0 && (
                <Select
                    label="Proyecto"
                    value={projectId ?? ""}
                    onChange={(event) => {
                        setProjectId(event.target.value === "" ? null : Number(event.target.value));
                        setElementKey("");
                        setError(null);
                    }}
                >
                    <option value="">Elige un proyecto</option>
                    {(projects.data ?? []).map((project) => (
                        <option key={project.id} value={project.id}>
                            {project.name}
                        </option>
                    ))}
                </Select>
            )}
            {projectId !== null && (
                <AsyncStatus
                    loading={structure.loading}
                    error={structure.error}
                    onRetry={structure.reload}
                    isEmpty={elements.length === 0}
                    emptyText="Este proyecto todavía no tiene cuartos ni componentes en su modelo."
                />
            )}
            {elements.length > 0 && (
                <Select
                    label="Elemento del modelo"
                    value={elementKey}
                    onChange={(event) => setElementKey(event.target.value)}
                >
                    <option value="">Elige un cuarto o un componente</option>
                    {elements.map((item) => (
                        <option key={keyOf(item)} value={keyOf(item)}>
                            {KINDS[item.kind]} · {item.name}
                            {item.level === null ? "" : ` (${item.level})`}
                        </option>
                    ))}
                </Select>
            )}
            {element !== null && current !== null && (
                <p className="message" role="status">
                    Ahora: {SURFACE_MATERIALS[current].label}
                    {element.surface === null ? " (la de su tipo, sin elegir)" : ""}.
                </p>
            )}
            {error !== null && (
                <p className="message message-error" role="alert">
                    {error}
                </p>
            )}
            {element !== null && (
                <Button
                    loading={saving}
                    disabled={current === surfaceId}
                    disabledReason={
                        current === surfaceId ? `${element.name} ya tiene «${label}».` : undefined
                    }
                    onClick={() => void apply()}
                >
                    Aplicar «{label}» a {element.name}
                </Button>
            )}
        </div>
    );
}
