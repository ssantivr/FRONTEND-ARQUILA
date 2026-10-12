import type { Project } from "../types/api";
import { formatDate } from "../utils/format";
import { StatusBadge } from "./Badge";
import { ProjectCover } from "./ProjectCover";

interface ProjectCardProps {
    project: Project;
    onOpen: (projectId: number) => void;
}

function initials(name: string): string {
    return name
        .split(/\s+/)
        .filter((word) => word !== "")
        .slice(0, 2)
        .map((word) => word.charAt(0).toUpperCase())
        .join("");
}

/** Projects have no cover image in the API, so the cover is a drawing generated per project. */
export function ProjectCard({ project, onOpen }: ProjectCardProps) {
    return (
        <button type="button" className="card project-card" onClick={() => onOpen(project.id)}>
            <span className="project-cover" aria-hidden="true">
                <ProjectCover id={project.id} name={project.name} />
                <span className="project-monogram">{initials(project.name)}</span>
            </span>
            <span className="project-body">
                <span id={`project-${project.id}-name`} className="card-title">
                    {project.name}
                </span>
                <span className="card-subtitle">{project.location ?? "Sin ubicación"}</span>
                <span className="project-meta">
                    <StatusBadge status={project.status} />
                    <span className="card-subtitle">
                        Actualizado {formatDate(project.updated_at)}
                    </span>
                </span>
            </span>
        </button>
    );
}
