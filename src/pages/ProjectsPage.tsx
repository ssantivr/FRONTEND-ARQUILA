import { useState, type FormEvent } from "react";

import { AsyncStatus } from "../components/AsyncStatus";
import { StatusBadge } from "../components/Badge";
import { Panel } from "../components/Panel";
import { errorMessage, useAsync } from "../hooks/useAsync";
import { projectsApi } from "../services/api";
import type { ProjectStatus } from "../types/api";
import { optionalText } from "../utils/format";

interface ProjectsPageProps {
    onOpenProject: (projectId: number) => void;
}

export function ProjectsPage({ onOpenProject }: ProjectsPageProps) {
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState<ProjectStatus | "">("");
    const [name, setName] = useState("");
    const [location, setLocation] = useState("");
    const [description, setDescription] = useState("");
    const [formError, setFormError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

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
