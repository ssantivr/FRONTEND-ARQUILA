import type { Project } from "../types/api";
import { formatDate } from "../utils/format";
import { StatusBadge } from "./Badge";
import { RENDERS } from "./RenderImage";

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

/**
 * Projects have no cover image in the API, so the cover is the project's initials over a dimmed
 * sample render: decoration, not a picture of the project.
 */
export function ProjectCard({ project, onOpen }: ProjectCardProps) {
    const render = project.id % 2 === 0 ? RENDERS.day : RENDERS.night;

    return (
        <button type="button" className="card project-card" onClick={() => onOpen(project.id)}>
            <span
                className={`project-cover project-cover-${project.id % 4}`}
                style={{
                    backgroundImage: `linear-gradient(rgba(11, 33, 26, 0.45), rgba(11, 33, 26, 0.8)), url(${render})`,
                }}
                aria-hidden="true"
            >
                {initials(project.name)}
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
