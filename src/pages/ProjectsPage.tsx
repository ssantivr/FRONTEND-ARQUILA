import { useState, type FormEvent } from "react";

import { AsyncStatus } from "../components/AsyncStatus";
import { Icon } from "../components/Icon";
import { ProjectEditForm } from "../components/ProjectEditForm";
import { ProjectTile } from "../components/ProjectTile";
import { ProjectTimeline } from "../components/ProjectTimeline";
import { StatusBadge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { DataTable } from "../components/ui/DataTable";
import { Dialog } from "../components/ui/Dialog";
import { FilterBar } from "../components/ui/FilterBar";
import { SelectControl } from "../components/ui/Input";
import { LiveForm } from "../components/ui/LiveForm";
import { Menu } from "../components/ui/Menu";
import { Pagination } from "../components/ui/Pagination";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { Skeleton } from "../components/ui/Skeleton";
import { errorMessage, useAsync } from "../hooks/useAsync";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import {
    loadAcrossProjects,
    loadProjectTasks,
    projectsApi,
    summaryApi,
    templatesApi,
} from "../services/api";
import { showToast } from "../state/toasts";
import type { Project, ProjectQuery, Summary } from "../types/api";
import { formatDate, formatNumber, optionalText } from "../utils/format";

import styles from "./ProjectsPage.module.css";

type Layout = "grid" | "list" | "timeline";

const LAYOUTS = [
    { value: "grid", label: "Cuadrícula", icon: "grid" },
    { value: "list", label: "Lista", icon: "rows" },
    { value: "timeline", label: "Cronograma", icon: "tasks" },
] as const;

const PAGE_SIZE = 12;

/** Which projects the list shows; each one is a parameter of GET /projects. */
type Show = "current" | "active" | "draft" | "archived" | "all";

const SHOWS: Record<Show, { label: string; query: Pick<ProjectQuery, "status" | "archived"> }> = {
    current: { label: "Sin archivar", query: { archived: false } },
    active: { label: "Activos", query: { status: "active" } },
    draft: { label: "En borrador", query: { status: "draft" } },
    archived: { label: "Archivados", query: { archived: true } },
    all: { label: "Todos, también archivados", query: {} },
};

type Order = "recent" | "created" | "name" | "progress";

const ORDERS: Record<Order, { label: string; query: Pick<ProjectQuery, "sort" | "order"> }> = {
    recent: { label: "Actualizados recientemente", query: { sort: "updated_at", order: "desc" } },
    created: { label: "Creados recientemente", query: { sort: "created_at", order: "desc" } },
    name: { label: "Por nombre", query: { sort: "name", order: "asc" } },
    progress: { label: "Más avanzados primero", query: { sort: "progress", order: "desc" } },
};

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
    const [show, setShow] = useState<Show>("current");
    const [order, setOrder] = useState<Order>("recent");
    const [layout, setLayout] = useState<Layout>("grid");
    const [confirming, setConfirming] = useState<Project | null>(null);
    const [editing, setEditing] = useState<Project | null>(null);
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
    // The search goes to the API once the user pauses, not on every key.
    const wanted = useDebouncedValue(search.trim());
    // A new search, filter or order starts again on the first page.
    const filterKey = `${wanted}|${show}|${order}`;
    const [paging, setPaging] = useState({ key: filterKey, page: 1 });
    const page = paging.key === filterKey ? paging.page : 1;

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
            projectsApi.page({
                page,
                page_size: PAGE_SIZE,
                q: wanted === "" ? undefined : wanted,
                ...SHOWS[show].query,
                ...ORDERS[order].query,
            }),
        [page, wanted, show, order],
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

    /** Runs an action on one project; the list and the counts are asked for again after it. */
    async function act(
        projectId: number,
        action: () => Promise<unknown>,
        done: (result: unknown) => string,
    ): Promise<boolean> {
        setActingId(projectId);
        setActionError(null);

        try {
            const result = await action();

            projects.reload();
            summary.reload();
            showToast(done(result));

            return true;
        } catch (reason) {
            setActionError(errorMessage(reason));

            return false;
        } finally {
            setActingId(null);
        }
    }

    function menuOf(project: Project) {
        const archived = project.status === "archived";
        const busy = actingId !== null;

        return (
            <Menu
                label={`Acciones de ${project.name}`}
                align="end"
                items={[
                    { label: "Abrir", icon: "projects", onSelect: () => onOpenProject(project.id) },
                    {
                        label: "Editar…",
                        icon: "edit",
                        disabled: busy,
                        onSelect: () => setEditing(project),
                    },
                    {
                        label: "Duplicar",
                        icon: "copy",
                        disabled: busy,
                        onSelect: () =>
                            void act(
                                project.id,
                                () => projectsApi.duplicate(project.id),
                                (copy) => `Proyecto duplicado como «${(copy as Project).name}».`,
                            ),
                    },
                    {
                        label: archived ? "Desarchivar" : "Archivar",
                        icon: archived ? "unarchive" : "archive",
                        disabled: busy,
                        onSelect: () =>
                            void act(
                                project.id,
                                () =>
                                    archived
                                        ? projectsApi.unarchive(project.id)
                                        : projectsApi.archive(project.id),
                                () => (archived ? "Proyecto desarchivado." : "Proyecto archivado."),
                            ),
                    },
                    {
                        label: "Eliminar…",
                        icon: "trash",
                        danger: true,
                        separated: true,
                        disabled: busy,
                        onSelect: () => setConfirming(project),
                    },
                ]}
            />
        );
    }

    const items = projects.data?.items ?? [];
    const total = projects.data?.total ?? 0;
    // The tasks are only asked for when the timeline is opened: one request per project.
    const showTimeline = layout === "timeline";
    const tasks = useAsync(
        () => (showTimeline ? loadAcrossProjects(loadProjectTasks) : Promise.resolve(null)),
        [showTimeline],
    );
    const examples = templates.data ?? [];
    const filtered = wanted !== "" || show !== "current";

    function clearFilters() {
        setSearch("");
        setShow("current");
    }

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
                    searchLabel="Buscar por nombre, descripción o lugar"
                    search={search}
                    onSearch={setSearch}
                    resultText={
                        projects.data === null
                            ? undefined
                            : total === 1
                              ? "1 resultado"
                              : `${formatNumber(total)} resultados`
                    }
                    active={filtered}
                    onClear={clearFilters}
                >
                    <SelectControl
                        aria-label="Qué proyectos mostrar"
                        value={show}
                        onChange={(event) => setShow(event.target.value as Show)}
                    >
                        {(Object.keys(SHOWS) as Show[]).map((key) => (
                            <option key={key} value={key}>
                                {SHOWS[key].label}
                            </option>
                        ))}
                    </SelectControl>
                    <SelectControl
                        aria-label="Ordenar proyectos"
                        value={order}
                        onChange={(event) => setOrder(event.target.value as Order)}
                    >
                        {(Object.keys(ORDERS) as Order[]).map((key) => (
                            <option key={key} value={key}>
                                {ORDERS[key].label}
                            </option>
                        ))}
                    </SelectControl>
                    <SegmentedControl
                        label="Vista de la lista"
                        options={LAYOUTS}
                        value={layout}
                        onChange={setLayout}
                    />
                </FilterBar>

                {projects.data?.paged === false && (
                    <p className="message" role="note">
                        La API en uso no pagina la lista: la búsqueda, los filtros y el orden se
                        hacen en este navegador con todos tus proyectos.
                    </p>
                )}

                <AsyncStatus
                    loading={projects.loading}
                    error={projects.error}
                    onRetry={projects.reload}
                    isEmpty={items.length === 0}
                    skeleton={layout === "grid" ? "cards" : "rows"}
                    emptyTitle={filtered ? "Ningún proyecto coincide" : "Todavía no hay proyectos"}
                    emptyText={
                        filtered
                            ? "Prueba con otra búsqueda o muestra también los archivados."
                            : "Crea el primero con su nombre; el terreno, los planos y el modelo se agregan después."
                    }
                    emptyAction={
                        filtered ? (
                            <Button variant="secondary" onClick={clearFilters}>
                                Quitar los filtros
                            </Button>
                        ) : (
                            <Button onClick={() => setCreating("form")}>
                                Crear el primer proyecto
                            </Button>
                        )
                    }
                />
                {actionError && (
                    <p className="message message-error" role="alert">
                        {actionError}
                    </p>
                )}

                {layout === "grid" && items.length > 0 && (
                    <ul className={styles.grid}>
                        {items.map((project) => (
                            <li key={project.id}>
                                <ProjectTile
                                    project={project}
                                    onOpen={onOpenProject}
                                    actions={menuOf(project)}
                                />
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
                                cell: (project) => (
                                    <button
                                        type="button"
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
                                cell: (project) => project.location ?? "Sin ubicación",
                            },
                            {
                                id: "status",
                                header: "Estado",
                                cell: (project) => <StatusBadge status={project.status} />,
                            },
                            ...(items.some((project) => project.progress !== undefined)
                                ? [
                                      {
                                          id: "progress",
                                          header: "Avance",
                                          numeric: true,
                                          cell: (project: Project) =>
                                              project.progress === undefined
                                                  ? "—"
                                                  : `${project.progress} %`,
                                      },
                                  ]
                                : []),
                            {
                                id: "updated",
                                header: "Actualizado",
                                cell: (project) => formatDate(project.updated_at),
                            },
                            {
                                id: "actions",
                                header: "Acciones",
                                cell: (project) => menuOf(project),
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

                {projects.data !== null && (
                    <Pagination
                        page={page}
                        pageSize={PAGE_SIZE}
                        total={total}
                        noun="proyectos"
                        disabled={projects.loading}
                        onPage={(next) => setPaging({ key: filterKey, page: next })}
                    />
                )}
            </section>

            {editing !== null && (
                <Dialog title={`Editar «${editing.name}»`} onClose={() => setEditing(null)}>
                    <ProjectEditForm
                        project={editing}
                        onCancel={() => setEditing(null)}
                        onSave={(data) =>
                            void act(
                                editing.id,
                                () => projectsApi.update(editing.id, data),
                                () => "Cambios guardados.",
                            ).then((saved) => {
                                if (saved) {
                                    setEditing(null);
                                }
                            })
                        }
                    />
                    {actionError && (
                        <p className="message message-error" role="alert">
                            {actionError}
                        </p>
                    )}
                </Dialog>
            )}

            {confirming !== null && (
                <ConfirmDialog
                    title={`¿Eliminar «${confirming.name}»?`}
                    confirmLabel="Sí, eliminar"
                    danger
                    pending={actingId !== null}
                    onConfirm={() =>
                        void act(
                            confirming.id,
                            () => projectsApi.remove(confirming.id),
                            () => "Proyecto eliminado.",
                        ).then(() => setConfirming(null))
                    }
                    onCancel={() => setConfirming(null)}
                >
                    <p>
                        Se eliminan también sus terrenos, planos, cuartos, materiales, tareas,
                        versiones y archivos. No se puede deshacer.
                    </p>
                </ConfirmDialog>
            )}
        </>
    );
}
