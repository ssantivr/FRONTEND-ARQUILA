import { useThumbnail } from "../state/thumbnails";
import type { Project } from "../types/api";
import { formatDate } from "../utils/format";
import { StatusBadge } from "./ui/Badge";
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

/**
 * The cover is the picture of the project's 3D model, taken the last time it was opened in this
 * browser. Until then it is a drawing generated per project, because the API has no cover image.
 */
export function ProjectCard({ project, onOpen, layout = "grid" }: ProjectCardProps) {
    const place = project.location ?? "Sin ubicación";
    const updated = `Actualizado ${formatDate(project.updated_at)}`;
    const thumbnail = useThumbnail(project.id);

    return (
        <button
            type="button"
            className={layout === "grid" ? "card project-card" : "card project-card project-row"}
            onClick={() => onOpen(project.id)}
        >
            <span className="project-cover" aria-hidden="true">
                {thumbnail === null ? (
                    <>
                        <ProjectCover id={project.id} name={project.name} />
                        <span className="project-monogram">{initials(project.name)}</span>
                    </>
                ) : (
                    <img className="project-thumbnail" src={thumbnail} alt="" loading="lazy" />
                )}
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
