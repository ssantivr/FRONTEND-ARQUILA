import { useState, type FormEvent } from "react";

import { AsyncStatus } from "../components/AsyncStatus";
import { Icon } from "../components/Icon";
import { ProjectCard } from "../components/ProjectCard";
import { ProjectTimeline } from "../components/ProjectTimeline";
import { StatusBadge } from "../components/ui/Badge";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { DataTable } from "../components/ui/DataTable";
import { FilterBar } from "../components/ui/FilterBar";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { Skeleton } from "../components/ui/Skeleton";
import { errorMessage, useAsync } from "../hooks/useAsync";
import {
    loadAcrossProjects,
    loadProjectTasks,
    projectsApi,
    summaryApi,
    templatesApi,
} from "../services/api";
import { showToast } from "../state/toasts";
import type { Project, ProjectStatus, Summary } from "../types/api";
import { formatDate, formatNumber, optionalText } from "../utils/format";
import { LiveForm } from "../components/ui/LiveForm";

type Order = "recent" | "created" | "name";
type Layout = "grid" | "list" | "timeline";

const LAYOUTS = [
    { value: "grid", label: "Cuadrícula", icon: "grid" },
    { value: "list", label: "Lista", icon: "rows" },
    { value: "timeline", label: "Cronograma", icon: "tasks" },
] as const;

/** Today as a `YYYY-MM-DD` day of the user's calendar, like the dates of a task. */
function localDay(): string {
    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, "0");

    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
/** What the panel under the page head shows: nothing, the form or the ready-made examples. */
type Creating = "closed" | "form" | "examples";

interface ProjectsPageProps {
    onOpenProject: (projectId: number) => void;
    onOpenModel: (projectId: number) => void;
    /** Opens the creation form with the cursor in its name, for arrivals through "Nuevo proyecto". */
    focusCreate?: boolean;
}

function countsOf(summary: Summary): string {
    return [
        `${formatNumber(summary.active_projects)} ${summary.active_projects === 1 ? "activo" : "activos"}`,
        `${formatNumber(summary.draft_projects)} en borrador`,
        `${formatNumber(summary.archived_projects)} ${summary.archived_projects === 1 ? "archivado" : "archivados"}`,
    ].join(" · ");
}

export function ProjectsPage({
    onOpenProject,
    onOpenModel,
    focusCreate = false,
}: ProjectsPageProps) {
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState<ProjectStatus | "">("");
    const [order, setOrder] = useState<Order>("recent");
    const [layout, setLayout] = useState<Layout>("grid");
    const [confirmingId, setConfirmingId] = useState<number | null>(null);
    const [actingId, setActingId] = useState<number | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [name, setName] = useState("");
    const [location, setLocation] = useState("");
    const [description, setDescription] = useState("");
    const [formError, setFormError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [creating, setCreating] = useState<Creating>(focusCreate ? "form" : "closed");
    const summary = useAsync(() => summaryApi.get(), []);
    const templates = useAsync(() => templatesApi.list(), []);
    const [templateError, setTemplateError] = useState<string | null>(null);
    const [creatingTemplate, setCreatingTemplate] = useState<string | null>(null);

    async function handleTemplate(templateId: string) {
        setCreatingTemplate(templateId);
        setTemplateError(null);

        try {
            const project = await templatesApi.createProject(templateId);
            onOpenModel(project.id);
        } catch (reason) {
            setTemplateError(errorMessage(reason));
            setCreatingTemplate(null);
        }
    }

    const projects = useAsync(
        () =>
            projectsApi.list({
                search: optionalText(search),
                status: status || undefined,
            }),
        [search, status],
    );

    async function handleCreate(event: FormEvent) {
        event.preventDefault();
        setSaving(true);
        setFormError(null);

        try {
            await projectsApi.create({
                name: name.trim(),
                location: optionalText(location),
                description: optionalText(description),
            });
            setName("");
            setLocation("");
            setDescription("");
            setCreating("closed");
            projects.reload();
            summary.reload();
            showToast("Proyecto creado.");
        } catch (reason) {
            setFormError(errorMessage(reason));
        } finally {
            setSaving(false);
        }
    }

    async function act(projectId: number, done: string, action: () => Promise<unknown>) {
        setActingId(projectId);
        setActionError(null);

        try {
            await action();
            projects.reload();
            summary.reload();
            showToast(done);
        } catch (reason) {
            setActionError(errorMessage(reason));
        } finally {
            setActingId(null);
            setConfirmingId(null);
        }
    }

    function handleStatus(projectId: number, next: ProjectStatus) {
        void act(
            projectId,
            next === "archived" ? "Proyecto archivado." : "Proyecto reactivado.",
            () => projectsApi.update(projectId, { status: next }),
        );
    }

    function handleRemove(projectId: number) {
        void act(projectId, "Proyecto eliminado.", () => projectsApi.remove(projectId));
    }

    const items = [...(projects.data ?? [])].sort((first, second) =>
        order === "name"
            ? first.name.localeCompare(second.name, "es")
            : order === "created"
              ? second.created_at.localeCompare(first.created_at)
              : second.updated_at.localeCompare(first.updated_at),
    );
    // The tasks are only asked for when the timeline is opened: one request per project.
    const showTimeline = layout === "timeline";
    const tasks = useAsync(
        () => (showTimeline ? loadAcrossProjects(loadProjectTasks) : Promise.resolve(null)),
        [showTimeline],
    );
    const confirming = items.find((project) => project.id === confirmingId) ?? null;

    function actions(project: Project) {
        return (
            <div className="project-actions">
                <button
                    type="button"
                    className="button-secondary"
                    disabled={actingId !== null}
                    aria-describedby={`project-${project.id}-name`}
                    onClick={() =>
                        handleStatus(
                            project.id,
                            project.status === "archived" ? "active" : "archived",
                        )
                    }
                >
                    {project.status === "archived" ? "Reactivar" : "Archivar"}
                </button>
                <button
                    type="button"
                    className="button-danger"
                    disabled={actingId !== null}
                    aria-describedby={`project-${project.id}-name`}
                    onClick={() => setConfirmingId(project.id)}
                >
                    Eliminar
                </button>
            </div>
        );
    }
    const examples = templates.data ?? [];
    const filtered = search.trim() !== "" || status !== "";

    return (
        <>
            <header className="page-head">
                <div>
                    <h2>
                        {summary.data
                            ? summary.data.projects === 1
                                ? "1 proyecto"
                                : `${formatNumber(summary.data.projects)} proyectos`
                            : "Proyectos"}
                    </h2>
                    {/* The line is there from the start, so the list does not move down when it fills. */}
                    <p className="page-head-meta">{summary.data ? countsOf(summary.data) : " "}</p>
                    {summary.error && (
                        <AsyncStatus
                            loading={false}
                            error={summary.error}
                            onRetry={summary.reload}
                            isEmpty={false}
                            emptyText=""
                        />
                    )}
                </div>
                <div className="page-head-actions">
                    {examples.length > 0 && (
                        <button
                            type="button"
                            className="button-secondary"
                            aria-expanded={creating === "examples"}
                            aria-controls="project-create"
                            onClick={() =>
                                setCreating(creating === "examples" ? "closed" : "examples")
                            }
                        >
                            Ejemplos
                        </button>
                    )}
                    <button
                        type="button"
                        className="button-lime icon-button"
                        aria-expanded={creating === "form"}
                        aria-controls="project-create"
                        onClick={() => setCreating(creating === "form" ? "closed" : "form")}
                    >
                        <Icon name="plus" />
                        Crear proyecto
                    </button>
                </div>
            </header>

            {creating !== "closed" && (
                <section id="project-create" className="panel create-panel">
                    <header className="panel-header">
                        <h2>{creating === "form" ? "Nuevo proyecto" : "Empezar con un ejemplo"}</h2>
                        <button
                            type="button"
                            className="button-tertiary"
                            onClick={() => setCreating("closed")}
                        >
                            Cancelar
                        </button>
                    </header>
                    {creating === "form" ? (
                        <>
                            <LiveForm className="form-row" onSubmit={handleCreate}>
                                <label>
                                    Nombre
                                    <input
                                        autoFocus
                                        value={name}
                                        onChange={(event) => setName(event.target.value)}
                                        maxLength={160}
                                        required
                                    />
                                </label>
                                <label>
                                    Ubicación
                                    <input
                                        value={location}
                                        onChange={(event) => setLocation(event.target.value)}
                                        maxLength={255}
                                    />
                                </label>
                                <label className="field-wide">
                                    Descripción
                                    <input
                                        value={description}
                                        onChange={(event) => setDescription(event.target.value)}
                                    />
                                </label>
                                <button type="submit" disabled={saving || name.trim() === ""}>
                                    Crear
                                </button>
                            </LiveForm>
                            {formError && (
                                <p className="message message-error" role="alert">
                                    {formError}
                                </p>
                            )}
                        </>
                    ) : (
                        <>
                            <p className="message">
                                Un proyecto ya armado, con su terreno, planos, cuartos y columnas,
                                que se abre en el modelo 3D. Después se edita como cualquier otro.
                            </p>
                            <ul className="card-list">
                                {examples.map((template) => (
                                    <li key={template.id}>
                                        <button
                                            type="button"
                                            className="card module-card"
                                            disabled={creatingTemplate !== null}
                                            onClick={() => handleTemplate(template.id)}
                                        >
                                            <span className="badge badge-source-system">
                                                {template.kind}
                                            </span>
                                            <span className="card-title">{template.name}</span>
                                            <span className="card-subtitle">
                                                {template.description}
                                            </span>
                                            <span className="card-subtitle">
                                                {template.levels === 1
                                                    ? "1 nivel"
                                                    : `${template.levels} niveles`}{" "}
                                                · {formatNumber(template.built_area_m2)} m²
                                                construidos · lote de{" "}
                                                {formatNumber(template.lot_area_m2)} m²
                                            </span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                            {templateError && (
                                <p className="message message-error" role="alert">
                                    {templateError}
                                </p>
                            )}
                        </>
                    )}
                </section>
            )}

            <section className="list-section" aria-label="Lista de proyectos">
                <FilterBar
                    searchLabel="Buscar por nombre"
                    search={search}
                    onSearch={setSearch}
                    resultText={
                        filtered && projects.data !== null
                            ? items.length === 1
                                ? "1 resultado"
                                : `${items.length} resultados`
                            : undefined
                    }
                >
                    <select
                        aria-label="Filtrar por estado"
                        value={status}
                        onChange={(event) => setStatus(event.target.value as ProjectStatus | "")}
                    >
                        <option value="">Todos los estados</option>
                        <option value="draft">Borrador</option>
                        <option value="active">Activo</option>
                        <option value="archived">Archivado</option>
                    </select>
                    <select
                        aria-label="Ordenar proyectos"
                        value={order}
                        onChange={(event) => setOrder(event.target.value as Order)}
                    >
                        <option value="recent">Actualizados recientemente</option>
                        <option value="created">Creados recientemente</option>
                        <option value="name">Por nombre</option>
                    </select>
                    <SegmentedControl
                        label="Vista de la lista"
                        options={LAYOUTS}
                        value={layout}
                        onChange={setLayout}
                    />
                </FilterBar>

                <AsyncStatus
                    loading={projects.loading}
                    error={projects.error}
                    onRetry={projects.reload}
                    isEmpty={items.length === 0}
                    skeleton={layout === "grid" ? "cards" : "rows"}
                    emptyTitle={filtered ? "Ningún proyecto coincide" : "Todavía no hay proyectos"}
                    emptyText={
                        filtered
                            ? "Prueba con otro nombre o con otro estado."
                            : "Crea el primero con su nombre; el terreno, los planos y el modelo se agregan después."
                    }
                    emptyAction={
                        filtered ? (
                            <button
                                type="button"
                                className="button-secondary"
                                onClick={() => {
                                    setSearch("");
                                    setStatus("");
                                }}
                            >
                                Quitar los filtros
                            </button>
                        ) : (
                            <button type="button" onClick={() => setCreating("form")}>
                                Crear el primer proyecto
                            </button>
                        )
                    }
                />
                {actionError && (
                    <p className="message message-error" role="alert">
                        {actionError}
                    </p>
                )}

                {layout === "grid" && items.length > 0 && (
                    <ul className="card-list project-grid">
                        {items.map((project) => (
                            <li key={project.id} className="project-item">
                                <ProjectCard project={project} onOpen={onOpenProject} />
                                {actions(project)}
                            </li>
                        ))}
                    </ul>
                )}

                {layout === "list" && items.length > 0 && (
                    <DataTable
                        caption="Proyectos"
                        rows={items}
                        rowKey={(project) => project.id}
                        columns={[
                            {
                                id: "name",
                                header: "Proyecto",
                                sortValue: (project) => project.name,
                                cell: (project) => (
                                    <button
                                        type="button"
                                        id={`project-${project.id}-name`}
                                        className="table-link"
                                        onClick={() => onOpenProject(project.id)}
                                    >
                                        {project.name}
                                    </button>
                                ),
                            },
                            {
                                id: "location",
                                header: "Ubicación",
                                sortValue: (project) => project.location,
                                cell: (project) => project.location ?? "Sin ubicación",
                            },
                            {
                                id: "status",
                                header: "Estado",
                                sortValue: (project) => project.status,
                                cell: (project) => <StatusBadge status={project.status} />,
                            },
                            {
                                id: "updated",
                                header: "Actualizado",
                                sortValue: (project) => project.updated_at,
                                cell: (project) => formatDate(project.updated_at),
                            },
                            {
                                id: "actions",
                                header: "Acciones",
                                cell: (project) => actions(project),
                            },
                        ]}
                    />
                )}

                {layout === "timeline" &&
                    items.length > 0 &&
                    (tasks.data === null ? (
                        <>
                            <AsyncStatus
                                loading={tasks.loading}
                                error={tasks.error}
                                onRetry={tasks.reload}
                                isEmpty={false}
                                emptyText=""
                            />
                            {tasks.loading && <Skeleton shape="rows" count={4} />}
                        </>
                    ) : (
                        <ProjectTimeline
                            projects={items}
                            tasks={tasks.data.items}
                            onOpenProject={onOpenProject}
                            today={localDay()}
                        />
                    ))}
            </section>

            {confirming !== null && (
                <ConfirmDialog
                    title={`¿Eliminar «${confirming.name}»?`}
                    confirmLabel="Sí, eliminar"
                    danger
                    pending={actingId !== null}
                    onConfirm={() => handleRemove(confirming.id)}
                    onCancel={() => setConfirmingId(null)}
                >
                    <p>
                        Se eliminan también sus terrenos, planos, cuartos, materiales y archivos. No
                        se puede deshacer.
                    </p>
                </ConfirmDialog>
            )}
        </>
    );
}
