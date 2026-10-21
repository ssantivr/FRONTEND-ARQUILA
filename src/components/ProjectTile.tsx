import type { ReactNode } from "react";

import { useThumbnail } from "../state/thumbnails";
import type { Project } from "../types/api";
import { formatDate } from "../utils/format";
import { StatusBadge } from "./ui/Badge";
import { BlueprintGrid } from "./ui/Blueprint";

import styles from "./ProjectTile.module.css";

interface ProjectTileProps {
    project: Project;
    onOpen: (projectId: number) => void;
    /** A card with a large picture, or one row with the picture as a thumbnail. */
    layout?: "grid" | "list";
    /** Controls of the project next to the card, such as its menu of actions. */
    actions?: ReactNode;
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
 * A project as the API gives it: its name, state and last change, and its place only when it
 * has one. The picture is the project's own 3D model, taken the last time it was opened in this
 * browser (the API stores no cover). Until then the card shows a blank sheet with the initials,
 * which does not pretend to be the building. The API has no project type, so none is shown.
 */
export function ProjectTile({ project, onOpen, layout = "grid", actions }: ProjectTileProps) {
    const thumbnail = useThumbnail(project.id);

    return (
        <article className={`${styles.tile} ${styles[layout]}`}>
            <button type="button" className={styles.open} onClick={() => onOpen(project.id)}>
                <span className={styles.cover} aria-hidden="true">
                    {thumbnail === null ? (
                        <span className={styles.blank}>
                            <BlueprintGrid cell={12} />
                            <span className={styles.monogram}>{initials(project.name)}</span>
                        </span>
                    ) : (
                        <img className={styles.image} src={thumbnail} alt="" loading="lazy" />
                    )}
                </span>
                <span className={styles.body}>
                    <span className={styles.name}>{project.name}</span>
                    <span className={styles.meta}>
                        <StatusBadge status={project.status} />
                        {project.location !== null && project.location.trim() !== "" && (
                            <span className={styles.place}>{project.location}</span>
                        )}
                        <span className={styles.date}>
                            Actualizado{" "}
                            <time dateTime={project.updated_at}>
                                {formatDate(project.updated_at)}
                            </time>
                        </span>
                    </span>
                </span>
            </button>
            {actions !== undefined && <div className={styles.actions}>{actions}</div>}
        </article>
    );
}
