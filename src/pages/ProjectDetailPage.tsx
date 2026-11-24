import { Fragment, Suspense, lazy, useRef, useState } from "react";

import { AssistantPanel } from "../components/AssistantPanel";
import { AsyncStatus } from "../components/AsyncStatus";
import { BuildPanel } from "../components/builder/BuildPanel";
import { StatusBadge } from "../components/Badge";
import { ElevationsPanel } from "../components/ElevationsPanel";
import { ExtractionPanel } from "../components/extraction/ExtractionPanel";
import { FilesPanel } from "../components/FilesPanel";
import { FloorPlansPanel } from "../components/FloorPlansPanel";
import { GeneratedElevationsPanel } from "../components/GeneratedElevationsPanel";
import { Icon, type IconName } from "../components/Icon";
import { positionOf } from "../components/location/place";
import { confirmDelete } from "../components/modal/confirmDelete";
import { useModal } from "../components/modal/modalContext";
import { MetricCard } from "../components/MetricCard";
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
import { formatNumber } from "../utils/format";

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
    const workspaceData = useAsync(
        () =>
            Promise.all([
                terrainsApi.listByProject(projectId),
                plansApi.listByProject(projectId),
                roomsApi.listByProject(projectId),
            ]),
        [projectId],
    );
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

    function handleBuildChanged() {
        handleExtractionChanged();
        // Rooms and structure live in several panels: all of them load again.
        setPanelsVersion((version) => version + 1);
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
    const [terrains, plans, rooms] = workspaceData.data ?? [[], [], []];
    const siteArea = terrains.reduce((total, terrain) => total + terrain.area_m2, 0);
    const builtArea = rooms.reduce((total, room) => total + room.width_m * room.depth_m, 0);
    const groundLevel =
        plans.find((plan) =>
            /planta baja|primer piso|nivel 1|ground|piso 1/i.test(
                `${plan.title} ${plan.level ?? ""}`,
            ),
        ) ?? plans[0];
    const groundArea = groundLevel
        ? rooms
              .filter((room) => room.plan_id === groundLevel.id)
              .reduce((total, room) => total + room.width_m * room.depth_m, 0)
        : 0;
    const footprintRatio = siteArea > 0 ? (groundArea / siteArea) * 100 : null;
    const floorAreaRatio = siteArea > 0 ? builtArea / siteArea : null;

    return (
        <SaveStateContext.Provider value={{ pending: actionPending, error: actionError }}>
            <div className="studio-workspace">
                <nav className="studio-breadcrumbs" aria-label="Ruta del proyecto">
                    <button type="button" onClick={onBack}>
                        Proyectos
                    </button>
                    <span aria-hidden="true">/</span>
                    <span aria-current="page">{current.name}</span>
                </nav>
                <Panel title={current.name} actions={<StatusBadge status={current.status} />}>
                    <div className="studio-project-toolbar">
                        <span className="studio-project-location">
                            {current.location ?? "Ubicación por definir"}
                        </span>
                        <div className="project-summary">
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
                                Editar
                            </button>
                            <button
                                type="button"
                                className="button-danger"
                                onClick={handleDeleteProject}
                            >
                                Eliminar
                            </button>
                        </div>
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
                <section className="studio-metrics" aria-label="Indicadores del proyecto">
                    <MetricCard
                        label="Área del terreno"
                        value={workspaceData.data ? `${formatNumber(siteArea)} m²` : "—"}
                    />
                    <MetricCard
                        label="Área construida"
                        value={workspaceData.data ? `${formatNumber(builtArea)} m²` : "—"}
                    />
                    <MetricCard
                        label="Niveles"
                        value={workspaceData.data ? formatNumber(plans.length) : "—"}
                    />
                    <MetricCard
                        label="COS / CUS"
                        value={
                            footprintRatio === null || floorAreaRatio === null
                                ? "—"
                                : `${formatNumber(footprintRatio)}% / ${formatNumber(floorAreaRatio)}`
                        }
                        detail="Ocupación / construcción"
                    />
                    {workspaceData.error && (
                        <p className="message message-error" role="alert">
                            No se pudieron cargar los indicadores.{" "}
                            <button
                                type="button"
                                className="button-link"
                                onClick={workspaceData.reload}
                            >
                                Reintentar
                            </button>
                        </p>
                    )}
                </section>
                <nav className="tabs" aria-label="Secciones del proyecto">
                    {SECTIONS.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            className="tab"
                            aria-current={item.id === section ? "page" : undefined}
                            onClick={() => setSection(item.id)}
                        >
                            <Icon name={SECTION_ICONS[item.id]} />
                            <span>{item.label}</span>
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

                {section === "plans" && (
                    <BuildPanel
                        key={projectId}
                        projectId={projectId}
                        onChanged={handleBuildChanged}
                        onOpenModel={() => setSection("model")}
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
                            <PlansPanel
                                projectId={projectId}
                                run={runOnPlans}
                                files={projectFiles}
                            />
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
                    {section === "analysis" && (
                        <RecommendationsPanel projectId={projectId} run={run} />
                    )}
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
            </div>
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

const SECTION_ICONS: Record<SectionId, IconName> = {
    terrain: "terrains",
    plans: "projects",
    model: "viewer",
    elevations: "interior",
    analysis: "dashboard",
    files: "upload",
    assistant: "assistant",
};

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
