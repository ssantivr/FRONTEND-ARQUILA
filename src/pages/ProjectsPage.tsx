import { useState, type FormEvent } from "react";

import { AsyncStatus } from "../components/AsyncStatus";
import { Icon } from "../components/Icon";
import { PageBand } from "../components/PageBand";
import { Panel } from "../components/Panel";
import { ProjectCard } from "../components/ProjectCard";
import { errorMessage, useAsync } from "../hooks/useAsync";
import { projectsApi, summaryApi, templatesApi } from "../services/api";
import { showToast } from "../state/toasts";
import type { ProjectStatus } from "../types/api";
import { formatNumber, optionalText } from "../utils/format";

type Order = "recent" | "name";

interface ProjectsPageProps {
    onOpenProject: (projectId: number) => void;
    onOpenModel: (projectId: number) => void;
    /** Opens the creation form with the cursor in its name, for arrivals through "Nuevo proyecto". */
    focusCreate?: boolean;
}

export function ProjectsPage({
    onOpenProject,
    onOpenModel,
    focusCreate = false,
}: ProjectsPageProps) {
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState<ProjectStatus | "">("");
    const [order, setOrder] = useState<Order>("recent");
    const [layout, setLayout] = useState<"grid" | "list">("grid");
    const [confirmingId, setConfirmingId] = useState<number | null>(null);
    const [actingId, setActingId] = useState<number | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [name, setName] = useState("");
    const [location, setLocation] = useState("");
    const [description, setDescription] = useState("");
    const [formError, setFormError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [creating, setCreating] = useState(focusCreate);
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
            setCreating(false);
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
            : second.updated_at.localeCompare(first.updated_at),
    );

    const examples = templates.data ?? [];

    return (
        <>
            <PageBand
                title="Tus proyectos"
                text="Cada proyecto reúne su terreno, sus planos, el modelo 3D, los materiales y los archivos."
                stats={
                    summary.data
                        ? [
                              { label: "Proyectos", value: formatNumber(summary.data.projects) },
                              {
                                  label: "Activos",
                                  value: formatNumber(summary.data.active_projects),
                              },
                              {
                                  label: "En borrador",
                                  value: formatNumber(summary.data.draft_projects),
                              },
                              {
                                  label: "Archivados",
                                  value: formatNumber(summary.data.archived_projects),
                              },
                          ]
                        : undefined
                }
                aside={
                    <button
                        type="button"
                        className="button-lime icon-button"
                        aria-expanded={creating}
                        aria-controls="project-create"
                        onClick={() => setCreating((open) => !open)}
                    >
                        <Icon name="plus" />
                        Crear proyecto
                    </button>
                }
            >
                {summary.error && (
                    <AsyncStatus
                        loading={false}
                        error={summary.error}
                        onRetry={summary.reload}
                        isEmpty={false}
                        emptyText=""
                    />
                )}
            </PageBand>

            {creating && (
                <section id="project-create" className="panel create-panel">
                    <header className="panel-header">
                        <h2>Nuevo proyecto</h2>
                        <button
                            type="button"
                            className="button-tertiary"
                            onClick={() => setCreating(false)}
                        >
                            Cancelar
                        </button>
                    </header>
                    <form className="form-row" onSubmit={handleCreate}>
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
                    </form>
                    {formError && (
                        <p className="message message-error" role="alert">
                            {formError}
                        </p>
                    )}
                    {templates.error && (
                        <AsyncStatus
                            loading={false}
                            error={templates.error}
                            onRetry={templates.reload}
                            isEmpty={false}
                            emptyText=""
                        />
                    )}
                    {examples.length > 0 && (
                        <div className="create-examples">
                            <h3>O empieza con un ejemplo</h3>
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
                        </div>
                    )}
                    {templateError && (
                        <p className="message message-error" role="alert">
                            {templateError}
                        </p>
                    )}
                </section>
            )}
            <Panel
                title={
                    projects.data === null
                        ? "Proyectos"
                        : items.length === 1
                          ? "1 proyecto"
                          : `${items.length} proyectos`
                }
                actions={
                    <div className="filters">
                        <input
                            type="search"
                            placeholder="Buscar por nombre"
                            aria-label="Buscar por nombre"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                        />
                        <select
                            aria-label="Filtrar por estado"
                            value={status}
                            onChange={(event) =>
                                setStatus(event.target.value as ProjectStatus | "")
                            }
                        >
                            <option value="">Todos</option>
                            <option value="draft">Borrador</option>
                            <option value="active">Activo</option>
                            <option value="archived">Archivado</option>
                        </select>
                        <select
                            aria-label="Ordenar proyectos"
                            value={order}
                            onChange={(event) => setOrder(event.target.value as Order)}
                        >
                            <option value="recent">Más recientes</option>
                            <option value="name">Por nombre</option>
                        </select>
                        <div className="segmented" role="group" aria-label="Vista de la lista">
                            <button
                                type="button"
                                aria-pressed={layout === "grid"}
                                onClick={() => setLayout("grid")}
                            >
                                Cuadrícula
                            </button>
                            <button
                                type="button"
                                aria-pressed={layout === "list"}
                                onClick={() => setLayout("list")}
                            >
                                Lista
                            </button>
                        </div>
                    </div>
                }
            >
                <AsyncStatus
                    loading={projects.loading}
                    error={projects.error}
                    onRetry={projects.reload}
                    isEmpty={items.length === 0}
                    emptyText="No hay proyectos."
                />
                {actionError && (
                    <p className="message message-error" role="alert">
                        {actionError}
                    </p>
                )}
                <ul
                    className={
                        layout === "grid"
                            ? "card-list project-grid"
                            : "card-list card-list-rows project-grid"
                    }
                >
                    {items.map((project) => (
                        <li key={project.id} className="project-item">
                            <ProjectCard project={project} onOpen={onOpenProject} />
                            <div className="project-actions">
                                {confirmingId === project.id ? (
                                    <>
                                        <span role="status">¿Eliminar «{project.name}»?</span>
                                        <button
                                            type="button"
                                            className="button-danger"
                                            disabled={actingId !== null}
                                            onClick={() => handleRemove(project.id)}
                                        >
                                            Sí, eliminar
                                        </button>
                                        <button
                                            type="button"
                                            className="button-secondary"
                                            onClick={() => setConfirmingId(null)}
                                        >
                                            Cancelar
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            type="button"
                                            className="button-secondary"
                                            disabled={actingId !== null}
                                            aria-describedby={`project-${project.id}-name`}
                                            onClick={() =>
                                                handleStatus(
                                                    project.id,
                                                    project.status === "archived"
                                                        ? "active"
                                                        : "archived",
                                                )
                                            }
                                        >
                                            {project.status === "archived"
                                                ? "Reactivar"
                                                : "Archivar"}
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
                                    </>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            </Panel>
        </>
    );
}
