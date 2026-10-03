import { Fragment, useState } from "react";

import { AssistantPanel } from "../components/AssistantPanel";
import { AsyncStatus } from "../components/AsyncStatus";
import { StatusBadge } from "../components/Badge";
import { ElevationsPanel } from "../components/ElevationsPanel";
import { FilesPanel } from "../components/FilesPanel";
import { MaterialsPanel } from "../components/MaterialsPanel";
import { Panel } from "../components/Panel";
import { PlansPanel } from "../components/PlansPanel";
import { RecommendationsPanel } from "../components/RecommendationsPanel";
import { TerrainsPanel } from "../components/TerrainsPanel";
import { errorMessage, useAsync } from "../hooks/useAsync";
import { filesApi, projectsApi, undoApi } from "../services/api";
import type { DeletedItemKind, ProjectStatus } from "../types/api";

interface ProjectDetailPageProps {
    projectId: number;
    onBack: () => void;
}

export function ProjectDetailPage({ projectId, onBack }: ProjectDetailPageProps) {
    const project = useAsync(() => projectsApi.get(projectId), [projectId]);
    const undoable = useAsync(() => undoApi.list(projectId), [projectId]);
    const files = useAsync(() => filesApi.listByProject(projectId), [projectId]);
    const [actionError, setActionError] = useState<string | null>(null);
    const [panelsVersion, setPanelsVersion] = useState(0);
    const [section, setSection] = useState<SectionId>("terrain");
    const projectFiles = files.data ?? [];

    function handleFilesChanged() {
        files.reload();
        setPanelsVersion((version) => version + 1);
    }

    async function run(action: () => Promise<unknown>, onDone: () => void) {
        setActionError(null);

        try {
            await action();
            onDone();
            undoable.reload();
        } catch (reason) {
            setActionError(errorMessage(reason));
        }
    }

    const lastDeleted = undoable.data?.[0];

    if (project.data === null) {
        return (
            <Panel title="Proyecto" actions={<BackButton onBack={onBack} />}>
                <AsyncStatus
                    loading={project.loading}
                    error={project.error}
                    isEmpty
                    emptyText="Proyecto no encontrado."
                />
            </Panel>
        );
    }

    const current = project.data;

    return (
        <>
            <Panel title={current.name} actions={<BackButton onBack={onBack} />}>
                <div className="project-summary">
                    <StatusBadge status={current.status} />
                    <span>{current.location ?? "Sin ubicación"}</span>
                    <select
                        aria-label="Cambiar estado"
                        value={current.status}
                        onChange={(event) =>
                            run(
                                () =>
                                    projectsApi.update(projectId, {
                                        status: event.target.value as ProjectStatus,
                                    }),
                                project.reload,
                            )
                        }
                    >
                        <option value="draft">Borrador</option>
                        <option value="active">Activo</option>
                        <option value="archived">Archivado</option>
                    </select>
                    <button
                        type="button"
                        className="button-secondary"
                        disabled={lastDeleted === undefined}
                        onClick={() =>
                            run(
                                () => undoApi.undoLast(projectId),
                                () => setPanelsVersion((version) => version + 1),
                            )
                        }
                    >
                        {lastDeleted === undefined
                            ? "Nada que deshacer"
                            : `Deshacer: ${KIND_LABELS[lastDeleted.kind]} «${lastDeleted.label}»`}
                    </button>
                    <button
                        type="button"
                        className="button-danger"
                        onClick={() => {
                            if (window.confirm(`¿Eliminar el proyecto "${current.name}"?`)) {
                                run(() => projectsApi.remove(projectId), onBack);
                            }
                        }}
                    >
                        Eliminar proyecto
                    </button>
                </div>
                {actionError && (
                    <p className="message message-error" role="alert">
                        {actionError}
                    </p>
                )}
            </Panel>

            <nav className="tabs" aria-label="Secciones del proyecto">
                {SECTIONS.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        className="tab"
                        aria-current={item.id === section ? "page" : undefined}
                        onClick={() => setSection(item.id)}
                    >
                        {item.label}
                    </button>
                ))}
            </nav>

            <Fragment key={panelsVersion}>
                {section === "terrain" && <TerrainsPanel projectId={projectId} run={run} />}
                {section === "plans" && (
                    <PlansPanel projectId={projectId} run={run} files={projectFiles} />
                )}
                {section === "elevations" && (
                    <ElevationsPanel projectId={projectId} run={run} files={projectFiles} />
                )}
                {section === "materials" && <MaterialsPanel projectId={projectId} run={run} />}
                {section === "analysis" && (
                    <RecommendationsPanel projectId={projectId} run={run} />
                )}
            </Fragment>

            {section === "files" && (
                <FilesPanel
                    projectId={projectId}
                    run={run}
                    files={projectFiles}
                    onChanged={handleFilesChanged}
                />
            )}
            {section === "assistant" && <AssistantPanel projectId={projectId} />}
        </>
    );
}

type SectionId =
    | "terrain"
    | "plans"
    | "elevations"
    | "materials"
    | "analysis"
    | "files"
    | "assistant";

const SECTIONS: { id: SectionId; label: string }[] = [
    { id: "terrain", label: "Terreno" },
    { id: "plans", label: "Planos" },
    { id: "elevations", label: "Elevaciones" },
    { id: "materials", label: "Materiales" },
    { id: "analysis", label: "Análisis" },
    { id: "files", label: "Archivos" },
    { id: "assistant", label: "Asistente IA" },
];

const KIND_LABELS: Record<DeletedItemKind, string> = {
    terrain: "terreno",
    material: "material",
    plan: "plano",
    elevation: "elevación",
};

function BackButton({ onBack }: { onBack: () => void }) {
    return (
        <button type="button" className="button-secondary" onClick={onBack}>
            ← Proyectos
        </button>
    );
}
