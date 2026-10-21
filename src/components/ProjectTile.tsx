import { useState, type ReactNode } from "react";

import { filesApi } from "../services/api";
import { useThumbnail } from "../state/thumbnails";
import type { Project } from "../types/api";
import { formatDate } from "../utils/format";
import { StatusBadge } from "./ui/Badge";
import { BlueprintGrid } from "./ui/Blueprint";
import { ProgressBar } from "./ui/ProgressBar";

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
 * A project as the API gives it: its name, state, progress and last change, and its place only
 * when it has one. The picture is the cover chosen among its files; without one (or if it cannot
 * be read), the project's own 3D model as it was last opened in this browser; and without that, a
 * blank sheet with the initials, which does not pretend to be the building. `ProjectRead` has no
 * project type, so none is shown.
 */
export function ProjectTile({ project, onOpen, layout = "grid", actions }: ProjectTileProps) {
    const thumbnail = useThumbnail(project.id);
    const [coverFailed, setCoverFailed] = useState(false);
    const coverId = project.cover_file_id ?? null;
    const picture = coverId !== null && !coverFailed ? filesApi.contentUrl(coverId) : thumbnail;

    return (
        <article className={`${styles.tile} ${styles[layout]}`}>
            <button type="button" className={styles.open} onClick={() => onOpen(project.id)}>
                <span className={styles.cover} aria-hidden="true">
                    {picture === null ? (
                        <span className={styles.blank}>
                            <BlueprintGrid cell={12} />
                            <span className={styles.monogram}>{initials(project.name)}</span>
                        </span>
                    ) : (
                        <img
                            className={styles.image}
                            src={picture}
                            alt=""
                            loading="lazy"
                            onError={picture === thumbnail ? undefined : () => setCoverFailed(true)}
                        />
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
                    {project.progress !== undefined && (
                        <span className={styles.progress}>
                            <ProgressBar label="Avance" value={project.progress / 100} showValue />
                        </span>
                    )}
                </span>
            </button>
            {actions !== undefined && <div className={styles.actions}>{actions}</div>}
        </article>
    );
}
