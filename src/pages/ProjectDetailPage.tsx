import { Fragment, Suspense, lazy, useRef, useState } from "react";

import { AssistantPanel } from "../components/AssistantPanel";
import { AsyncStatus } from "../components/AsyncStatus";
import { StatusBadge } from "../components/Badge";
import { ElevationsPanel } from "../components/ElevationsPanel";
import { ExtractionPanel } from "../components/extraction/ExtractionPanel";
import { FilesPanel } from "../components/FilesPanel";
import { FloorPlansPanel } from "../components/FloorPlansPanel";
import { GeneratedElevationsPanel } from "../components/GeneratedElevationsPanel";
import { positionOf } from "../components/location/place";
import { confirmDelete } from "../components/modal/confirmDelete";
import { useModal } from "../components/modal/modalContext";
import { SaveStateContext } from "../components/modal/saveState";
import { Panel } from "../components/Panel";
import { PlansPanel } from "../components/PlansPanel";
import { ProjectEditForm } from "../components/ProjectEditForm";
import { RecommendationsPanel } from "../components/RecommendationsPanel";
import { SitePlanPanel } from "../components/SitePlanPanel";
import { TerrainsPanel } from "../components/TerrainsPanel";
import { errorMessage, useAsync } from "../hooks/useAsync";
import { filesApi, plansApi, projectsApi, roomsApi, terrainsApi, undoApi } from "../services/api";
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
    const modal = useModal();
    const project = useAsync(() => projectsApi.get(projectId), [projectId]);
    const undoable = useAsync(() => undoApi.list(projectId), [projectId]);
    const files = useAsync(() => filesApi.listByProject(projectId), [projectId]);
    const [actionError, setActionError] = useState<string | null>(null);
    const [actionPending, setActionPending] = useState(false);
    const running = useRef(false);
    const [panelsVersion, setPanelsVersion] = useState(0);
    const [terrainsVersion, setTerrainsVersion] = useState(0);
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

    function handleExtractionChanged() {
        project.reload();
        files.reload();
        setTerrainsVersion((version) => version + 1);
        setPlansVersion((version) => version + 1);
    }

    async function handleDeleteProject() {
        const deleted = await confirmDelete(modal, {
            what: "el proyecto",
            name: project.data?.name ?? "",
            undoable: false,
            impact: await deletionImpact(projectId, projectFiles.length),
            requireText: project.data?.name,
            action: () => projectsApi.remove(projectId),
        });

        if (deleted) {
            onBack();
        }
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
        <SaveStateContext.Provider value={{ pending: actionPending, error: actionError }}>
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
                        onClick={() => setEditingProject(true)}
                    >
                        Editar proyecto
                    </button>
                    <button type="button" className="button-danger" onClick={handleDeleteProject}>
                        Eliminar proyecto
                    </button>
                </div>
                {current.description && <p className="message">{current.description}</p>}
                {editingProject && (
                    <ProjectEditForm
                        project={current}
                        onCancel={() => setEditingProject(false)}
                        onSave={async (data) => {
                            await projectsApi.update(projectId, data);
                            setEditingProject(false);
                            project.reload();
                        }}
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

            {section === "terrain" && (
                <ExtractionPanel
                    key={projectId}
                    projectId={projectId}
                    onChanged={handleExtractionChanged}
                />
            )}

            <Fragment key={panelsVersion}>
                {section === "terrain" && (
                    <TerrainsPanel
                        projectId={projectId}
                        run={run}
                        near={positionOf(current)}
                        version={terrainsVersion}
                    />
                )}
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
        </SaveStateContext.Provider>
    );
}

export type SectionId =
    "terrain" | "plans" | "model" | "elevations" | "analysis" | "files" | "assistant";

const SECTIONS: { id: SectionId; label: string }[] = [
    { id: "terrain", label: "Terreno" },
    { id: "plans", label: "Planos" },
    { id: "model", label: "Modelo 3D" },
    { id: "elevations", label: "Elevaciones" },
    { id: "analysis", label: "Análisis" },
    { id: "files", label: "Archivos" },
    { id: "assistant", label: "Asistente IA" },
];

const KIND_LABELS: Record<DeletedItemKind, string> = {
    terrain: "terreno",
    material: "material",
    plan: "plano",
    elevation: "elevación",
    room: "cuarto",
    component: "componente",
};

async function deletionImpact(projectId: number, files: number): Promise<string[]> {
    try {
        const [terrains, plans, rooms] = await Promise.all([
            terrainsApi.listByProject(projectId),
            plansApi.listByProject(projectId),
            roomsApi.listByProject(projectId),
        ]);

        return [
            `Terrenos: ${terrains.length}`,
            `Planos: ${plans.length}`,
            `Cuartos: ${rooms.length}`,
            `Archivos: ${files}`,
            "También sus materiales, elevaciones y conversaciones.",
        ];
    } catch {
        // The delete can go on without the counts.
        return ["Se elimina todo lo que contiene el proyecto."];
    }
}

function BackButton({ onBack }: { onBack: () => void }) {
    return (
        <button type="button" className="button-secondary" onClick={onBack}>
            ← Proyectos
        </button>
    );
}
