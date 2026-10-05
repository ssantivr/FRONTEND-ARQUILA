import { Fragment, Suspense, lazy, useRef, useState } from "react";

import { AssistantPanel } from "../components/AssistantPanel";
import { AsyncStatus } from "../components/AsyncStatus";
import { StatusBadge } from "../components/Badge";
import { ElevationsPanel } from "../components/ElevationsPanel";
import { FilesPanel } from "../components/FilesPanel";
import { FloorPlansPanel } from "../components/FloorPlansPanel";
import { GeneratedElevationsPanel } from "../components/GeneratedElevationsPanel";
import { MaterialsPanel } from "../components/MaterialsPanel";
import { Panel } from "../components/Panel";
import { PlansPanel } from "../components/PlansPanel";
import { ProjectEditForm } from "../components/ProjectEditForm";
import { RecommendationsPanel } from "../components/RecommendationsPanel";
import { SitePlanPanel } from "../components/SitePlanPanel";
import { TerrainsPanel } from "../components/TerrainsPanel";
import { errorMessage, useAsync } from "../hooks/useAsync";
import { filesApi, projectsApi, undoApi } from "../services/api";
import type { DeletedItemKind, ProjectStatus } from "../types/api";

const StructurePanel = lazy(() =>
    import("../components/StructurePanel").then((module) => ({ default: module.StructurePanel })),
);

interface ProjectDetailPageProps {
    projectId: number;
    initialSection?: SectionId;
    onBack: () => void;
}

export function ProjectDetailPage({
    projectId,
    initialSection = "terrain",
    onBack,
}: ProjectDetailPageProps) {
    const project = useAsync(() => projectsApi.get(projectId), [projectId]);
    const undoable = useAsync(() => undoApi.list(projectId), [projectId]);
    const files = useAsync(() => filesApi.listByProject(projectId), [projectId]);
    const [actionError, setActionError] = useState<string | null>(null);
    const [actionPending, setActionPending] = useState(false);
    const running = useRef(false);
    const [panelsVersion, setPanelsVersion] = useState(0);
    const [plansVersion, setPlansVersion] = useState(0);
    const [section, setSection] = useState<SectionId>(initialSection);
    const [editingProject, setEditingProject] = useState(false);
    const projectFiles = files.data ?? [];

    function handleFilesChanged() {
        files.reload();
        setPanelsVersion((version) => version + 1);
    }

    async function run(action: () => Promise<unknown>, onDone: () => void) {
        if (running.current) {
            return;
        }

        running.current = true;
        setActionPending(true);
        setActionError(null);

        try {
            await action();
        } catch (reason) {
            setActionError(errorMessage(reason));
            return;
        } finally {
            running.current = false;
            setActionPending(false);
        }

        onDone();
        undoable.reload();
    }

    function runOnPlans(action: () => Promise<unknown>, onDone: () => void) {
        return run(action, () => {
            onDone();
            setPlansVersion((version) => version + 1);
        });
    }

    const lastDeleted = undoable.data?.[0];

    if (project.data === null) {
        return (
            <Panel title="Proyecto" actions={<BackButton onBack={onBack} />}>
                <AsyncStatus
                    loading={project.loading}
                    error={project.error}
                    onRetry={project.reload}
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
                        className="button-secondary"
                        onClick={() => setEditingProject((editing) => !editing)}
                    >
                        Editar proyecto
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
                {current.description && !editingProject && (
                    <p className="message">{current.description}</p>
                )}
                {editingProject && (
                    <ProjectEditForm
                        project={current}
                        onCancel={() => setEditingProject(false)}
                        onSave={(data) =>
                            run(
                                () => projectsApi.update(projectId, data),
                                () => {
                                    setEditingProject(false);
                                    project.reload();
                                },
                            )
                        }
                    />
                )}
                {actionPending && (
                    <p className="message" role="status">
                        Guardando…
                    </p>
                )}
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
                    <>
                        <PlansPanel projectId={projectId} run={runOnPlans} files={projectFiles} />
                        <FloorPlansPanel
                            projectId={projectId}
                            projectName={current.name}
                            version={plansVersion}
                        />
                        <SitePlanPanel projectId={projectId} />
                    </>
                )}
                {section === "model" && (
                    <Suspense fallback={<p className="message">Cargando…</p>}>
                        <StructurePanel projectId={projectId} run={run} />
                    </Suspense>
                )}
                {section === "elevations" && (
                    <>
                        <ElevationsPanel projectId={projectId} run={run} files={projectFiles} />
                        <GeneratedElevationsPanel
                            projectId={projectId}
                            projectName={current.name}
                        />
                    </>
                )}
                {section === "materials" && <MaterialsPanel projectId={projectId} run={run} />}
                {section === "analysis" && <RecommendationsPanel projectId={projectId} run={run} />}
            </Fragment>

            {section === "files" && (
                <FilesPanel
                    projectId={projectId}
                    run={run}
                    files={projectFiles}
                    busy={actionPending}
                    onChanged={handleFilesChanged}
                />
            )}
            {section === "assistant" && <AssistantPanel projectId={projectId} />}
        </>
    );
}

export type SectionId =
    "terrain" | "plans" | "model" | "elevations" | "materials" | "analysis" | "files" | "assistant";

const SECTIONS: { id: SectionId; label: string }[] = [
    { id: "terrain", label: "Terreno" },
    { id: "plans", label: "Planos" },
    { id: "model", label: "Modelo 3D" },
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
