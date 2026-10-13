import type { Project } from "../types/api";
import { formatDate } from "../utils/format";
import { StatusBadge } from "./Badge";
import { ProjectCover } from "./ProjectCover";

interface ProjectCardProps {
    project: Project;
    onOpen: (projectId: number) => void;
    /** A card with a large cover, or one row of a light table with the cover as a thumbnail. */
    layout?: "grid" | "list";
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
export function ProjectCard({ project, onOpen, layout = "grid" }: ProjectCardProps) {
    const place = project.location ?? "Sin ubicación";
    const updated = `Actualizado ${formatDate(project.updated_at)}`;

    return (
        <button
            type="button"
            className={layout === "grid" ? "card project-card" : "card project-card project-row"}
            onClick={() => onOpen(project.id)}
        >
            <span className="project-cover" aria-hidden="true">
                <ProjectCover id={project.id} name={project.name} />
                <span className="project-monogram">{initials(project.name)}</span>
            </span>
            {layout === "grid" ? (
                <>
                    <StatusBadge status={project.status} />
                    <span className="project-body">
                        <span id={`project-${project.id}-name`} className="card-title">
                            {project.name}
                        </span>
                        <span className="project-meta">
                            <span>{place}</span>
                            <span>{updated}</span>
                        </span>
                    </span>
                </>
            ) : (
                <>
                    <span id={`project-${project.id}-name`} className="card-title">
                        {project.name}
                    </span>
                    <span className="project-row-place">{place}</span>
                    <StatusBadge status={project.status} />
                    <span className="project-row-date">{updated}</span>
                </>
            )}
        </button>
    );
}
