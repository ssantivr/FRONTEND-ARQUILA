import { useState } from "react";

import type { SectionId } from "../../pages/sections";
import { filesApi, projectsApi } from "../../services/api";
import { showToast } from "../../state/toasts";
import type { Project, ProjectFile } from "../../types/api";
import type { SectionProps } from "../../types/ui";
import { formatDate } from "../../utils/format";
import { StatusBadge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { SelectControl } from "../ui/Input";
import { Panel } from "../ui/Panel";
import { ProgressBar } from "../ui/ProgressBar";

import styles from "./ProjectPanels.module.css";

/** The images a cover can be: the API takes PNG, JPEG or WebP files of the same project. */
const COVER_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

const SHORTCUTS: { section: SectionId; label: string }[] = [
    { section: "tasks", label: "Tareas" },
    { section: "versions", label: "Versiones" },
    { section: "activity", label: "Historial" },
    { section: "files", label: "Archivos" },
    { section: "model", label: "Modelo 3D" },
];

interface ProjectSummaryPanelProps extends SectionProps {
    project: Project;
    files: ProjectFile[];
    onChanged: () => void;
    onEdit: () => void;
    onSection: (section: SectionId) => void;
}

/**
 * The card of the project: what it is, where, its state and progress, its cover and the way into
 * its tasks, versions and history. Only what the API returns; the architectural type is not in
 * `ProjectRead`, so it is not shown.
 */
export function ProjectSummaryPanel({
    projectId,
    run,
    project,
    files,
    onChanged,
    onEdit,
    onSection,
}: ProjectSummaryPanelProps) {
    const [coverFailed, setCoverFailed] = useState(false);
    const images = files.filter((file) => COVER_TYPES.has(file.mime_type));
    const coverId = project.cover_file_id ?? null;
    // An API older than the cover sends no `cover_file_id` at all: then there is nothing to choose.
    const canCover = project.cover_file_id !== undefined;

    function setCover(next: number | null) {
        setCoverFailed(false);
        void run(
            () => projectsApi.update(projectId, { cover_file_id: next }),
            () => {
                onChanged();
                showToast(next === null ? "Portada quitada." : "Portada cambiada.");
            },
        );
    }

    return (
        <Panel
            title="Resumen"
            actions={
                <Button variant="secondary" icon="edit" onClick={onEdit}>
                    Editar datos
                </Button>
            }
        >
            <div className={styles.summary}>
                <div>
                    <dl className={styles.facts}>
                        <div>
                            <dt>Estado</dt>
                            <dd>
                                <StatusBadge status={project.status} />
                                {project.archived_at !== null &&
                                    project.archived_at !== undefined && (
                                        <span className={styles.note}>
                                            Archivado el {formatDate(project.archived_at)}
                                        </span>
                                    )}
                            </dd>
                        </div>
                        {project.progress !== undefined && (
                            <div>
                                <dt>Avance</dt>
                                <dd>
                                    <div className={styles.progress}>
                                        <span aria-hidden="true">{project.progress} %</span>
                                        <ProgressBar
                                            label="Avance del proyecto"
                                            value={project.progress / 100}
                                        />
                                    </div>
                                </dd>
                            </div>
                        )}
                        <div>
                            <dt>Ubicación</dt>
                            <dd>{project.location ?? "Sin registrar"}</dd>
                        </div>
                        <div>
                            <dt>Responsable</dt>
                            <dd>
                                Tú
                                <span className={styles.note}>
                                    Los proyectos no se comparten con otras cuentas
                                </span>
                            </dd>
                        </div>
                        <div>
                            <dt>Creado</dt>
                            <dd>{formatDate(project.created_at)}</dd>
                        </div>
                        <div>
                            <dt>Última modificación</dt>
                            <dd>{formatDate(project.updated_at)}</dd>
                        </div>
                        <div>
                            <dt>Archivos</dt>
                            <dd>
                                {files.length === 0
                                    ? "Ninguno"
                                    : files.length === 1
                                      ? "1 archivo"
                                      : `${files.length} archivos`}
                            </dd>
                        </div>
                        {project.description !== null && (
                            <div>
                                <dt>Descripción</dt>
                                <dd>{project.description}</dd>
                            </div>
                        )}
                    </dl>
                    <nav className={styles.shortcuts} aria-label="Ir a una sección del proyecto">
                        {SHORTCUTS.map((item) => (
                            <Button
                                key={item.section}
                                variant="secondary"
                                size="sm"
                                iconEnd="arrowRight"
                                onClick={() => onSection(item.section)}
                            >
                                {item.label}
                            </Button>
                        ))}
                    </nav>
                </div>

                {canCover && (
                    <section className={styles.cover} aria-label="Portada">
                        {coverId !== null && !coverFailed ? (
                            <img
                                className={styles.coverImage}
                                src={filesApi.contentUrl(coverId)}
                                alt={`Portada de ${project.name}`}
                                onError={() => setCoverFailed(true)}
                            />
                        ) : (
                            <p className={styles.coverEmpty}>
                                {coverId !== null
                                    ? "No se pudo cargar la imagen de la portada."
                                    : images.length === 0
                                      ? "Sin portada. Sube una imagen PNG, JPEG o WebP en Archivos para usarla."
                                      : "Sin portada. Elige una de las imágenes del proyecto."}
                            </p>
                        )}
                        {images.length > 0 && (
                            <SelectControl
                                aria-label="Imagen de portada"
                                value={coverId ?? ""}
                                onChange={(event) =>
                                    setCover(
                                        event.target.value === ""
                                            ? null
                                            : Number(event.target.value),
                                    )
                                }
                            >
                                <option value="">Sin portada</option>
                                {images.map((file) => (
                                    <option key={file.id} value={file.id}>
                                        {file.filename}
                                    </option>
                                ))}
                            </SelectControl>
                        )}
                    </section>
                )}
            </div>
        </Panel>
    );
}
