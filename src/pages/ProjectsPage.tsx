import { useState, type FormEvent } from "react";

import { AsyncStatus } from "../components/AsyncStatus";
import { StatusBadge } from "../components/Badge";
import { Panel } from "../components/Panel";
import { errorMessage, useAsync } from "../hooks/useAsync";
import { projectsApi, templatesApi } from "../services/api";
import type { ProjectStatus } from "../types/api";
import { formatNumber, optionalText } from "../utils/format";

interface ProjectsPageProps {
    onOpenProject: (projectId: number) => void;
    onOpenModel: (projectId: number) => void;
}

export function ProjectsPage({ onOpenProject, onOpenModel }: ProjectsPageProps) {
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState<ProjectStatus | "">("");
    const [name, setName] = useState("");
    const [location, setLocation] = useState("");
    const [description, setDescription] = useState("");
    const [formError, setFormError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
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
            projects.reload();
        } catch (reason) {
            setFormError(errorMessage(reason));
        } finally {
            setSaving(false);
        }
    }

    const items = projects.data ?? [];

    return (
        <>
            <Panel title="Nuevo proyecto">
                <form className="form-row" onSubmit={handleCreate}>
                    <label>
                        Nombre
                        <input
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
            </Panel>

            <Panel title="Ejemplos">
                <p className="message">
                    Crea un proyecto ya armado, con su terreno, planos, cuartos y columnas, y
                    ábrelo en el modelo 3D. Después se puede editar como cualquier otro.
                </p>
                <AsyncStatus
                    loading={templates.loading}
                    error={templates.error}
                    isEmpty={(templates.data ?? []).length === 0}
                    emptyText="No hay ejemplos disponibles."
                />
                <ul className="card-list">
                    {(templates.data ?? []).map((template) => (
                        <li key={template.id}>
                            <button
                                type="button"
                                className="card module-card"
                                disabled={creatingTemplate !== null}
                                onClick={() => handleTemplate(template.id)}
                            >
                                <span className="badge badge-source-system">{template.kind}</span>
                                <span className="card-title">{template.name}</span>
                                <span className="card-subtitle">{template.description}</span>
                                <span className="card-subtitle">
                                    {template.levels === 1
                                        ? "1 nivel"
                                        : `${template.levels} niveles`}{" "}
                                    · {formatNumber(template.built_area_m2)} m² construidos · lote
                                    de {formatNumber(template.lot_area_m2)} m²
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
            </Panel>

            <Panel
                title="Proyectos"
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
                    </div>
                }
            >
                <AsyncStatus
                    loading={projects.loading}
                    error={projects.error}
                    isEmpty={items.length === 0}
                    emptyText="No hay proyectos."
                />
                <ul className="card-list">
                    {items.map((project) => (
                        <li key={project.id}>
                            <button
                                type="button"
                                className="card"
                                onClick={() => onOpenProject(project.id)}
                            >
                                <span className="card-title">{project.name}</span>
                                <span className="card-subtitle">
                                    {project.location ?? "Sin ubicación"}
                                </span>
                                <StatusBadge status={project.status} />
                            </button>
                        </li>
                    ))}
                </ul>
            </Panel>
        </>
    );
}
