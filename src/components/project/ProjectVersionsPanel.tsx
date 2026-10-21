import { useState, type FormEvent } from "react";

import { useAsync } from "../../hooks/useAsync";
import { versionsApi } from "../../services/api";
import { showToast } from "../../state/toasts";
import type { Version } from "../../types/api";
import type { SectionProps } from "../../types/ui";
import { formatDateTime, formatNumber } from "../../utils/format";
import { AsyncStatus } from "../AsyncStatus";
import { Unavailable } from "../Unavailable";
import { Button } from "../ui/Button";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { Dialog } from "../ui/Dialog";
import { Input } from "../ui/Input";
import { Panel } from "../ui/Panel";

import styles from "./ProjectPanels.module.css";

/** What a version holds, in the words of the screens: `contents` of VersionRead. */
const CONTENT_LABELS: Record<string, [string, string]> = {
    terrains: ["terreno", "terrenos"],
    plans: ["plano", "planos"],
    rooms: ["cuarto", "cuartos"],
    components: ["componente", "componentes"],
    materials: ["material", "materiales"],
    elevations: ["elevación", "elevaciones"],
    tasks: ["tarea", "tareas"],
    walkthrough_points: ["punto de recorrido", "puntos de recorrido"],
};

export function describeContents(contents: Record<string, number>): string[] {
    return Object.entries(contents)
        .filter(([, count]) => count > 0)
        .map(([key, count]) => {
            const [one, many] = CONTENT_LABELS[key] ?? [key, key];

            return `${formatNumber(count)} ${count === 1 ? one : many}`;
        });
}

/** The label the API gives the copy it saves before restoring, in Spanish. */
function labelOf(version: Version): string | null {
    const backup = /^Before restoring version (\d+)$/.exec(version.label ?? "");

    return backup === null ? version.label : `Antes de restaurar la versión ${backup[1]}`;
}

interface ProjectVersionsPanelProps extends SectionProps {
    /** Called after a restore, which changes the whole content of the project. */
    onRestored: () => void;
}

/**
 * Copies of the content of the project saved by the user (`/projects/{id}/versions`): save one,
 * look at what it holds and restore it. Restoring first saves the current state as a version, so
 * it can be undone by restoring that one.
 */
export function ProjectVersionsPanel({ projectId, run, onRestored }: ProjectVersionsPanelProps) {
    const versions = useAsync(() => versionsApi.listByProject(projectId), [projectId]);
    const [label, setLabel] = useState("");
    const [viewing, setViewing] = useState<Version | null>(null);
    const [restoring, setRestoring] = useState<Version | null>(null);
    const detail = useAsync(
        () => (viewing === null ? Promise.resolve(null) : versionsApi.get(viewing.id)),
        [viewing?.id],
    );
    const items = versions.data ?? [];

    function handleSave(event: FormEvent) {
        event.preventDefault();

        const wanted = label.trim();

        void run(
            () => versionsApi.create(projectId, wanted === "" ? undefined : wanted),
            () => {
                setLabel("");
                versions.reload();
                showToast("Versión guardada.");
            },
        );
    }

    if (versions.unavailable) {
        return (
            <Panel title="Versiones">
                <Unavailable what="Las versiones" />
            </Panel>
        );
    }

    const snapshot = detail.data?.snapshot;
    const project =
        snapshot !== undefined && typeof snapshot.project === "object" && snapshot.project !== null
            ? (snapshot.project as Record<string, unknown>)
            : null;

    return (
        <Panel
            title="Versiones"
            description="Copias del contenido del proyecto: terrenos, planos, cuartos, materiales, elevaciones, tareas y recorrido. Los archivos no se copian."
        >
            <form className={styles.toolbar} onSubmit={handleSave}>
                <Input
                    label="Etiqueta de la versión"
                    optional
                    placeholder="Anteproyecto"
                    maxLength={160}
                    value={label}
                    onChange={(event) => setLabel(event.target.value)}
                />
                <Button type="submit" icon="save">
                    Guardar versión
                </Button>
            </form>
            <AsyncStatus
                loading={versions.loading}
                error={versions.error}
                onRetry={versions.reload}
                isEmpty={items.length === 0}
                skeleton="rows"
                emptyTitle="Sin versiones"
                emptyText="Guarda la primera antes de un cambio grande: después podrás volver a ella."
            />
            {items.length > 0 && (
                <ol className={styles.list} aria-label="Versiones guardadas">
                    {items.map((version) => (
                        <li key={version.id} className={styles.row}>
                            <div className={styles.rowMain}>
                                <h3 className={styles.rowTitle}>
                                    Versión {version.version_number}
                                    {labelOf(version) !== null && ` · ${labelOf(version)}`}
                                </h3>
                                <p className={styles.meta}>
                                    <time className={styles.when} dateTime={version.created_at}>
                                        {formatDateTime(version.created_at)}
                                    </time>
                                </p>
                                <ul className={styles.contents}>
                                    {describeContents(version.contents).map((text) => (
                                        <li key={text}>{text}</li>
                                    ))}
                                </ul>
                            </div>
                            <div className={styles.rowActions}>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    aria-label={`Ver la versión ${version.version_number}`}
                                    onClick={() => setViewing(version)}
                                >
                                    Ver
                                </Button>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    icon="undo"
                                    aria-label={`Restaurar la versión ${version.version_number}`}
                                    onClick={() => setRestoring(version)}
                                >
                                    Restaurar
                                </Button>
                            </div>
                        </li>
                    ))}
                </ol>
            )}

            {viewing !== null && (
                <Dialog
                    title={`Versión ${viewing.version_number}${labelOf(viewing) === null ? "" : ` · ${labelOf(viewing)}`}`}
                    onClose={() => setViewing(null)}
                >
                    <AsyncStatus
                        loading={detail.loading}
                        error={detail.error}
                        onRetry={detail.reload}
                        isEmpty={false}
                        emptyText=""
                    />
                    <dl className={styles.facts}>
                        <div>
                            <dt>Guardada</dt>
                            <dd>{formatDateTime(viewing.created_at)}</dd>
                        </div>
                        <div>
                            <dt>Contenido</dt>
                            <dd>{describeContents(viewing.contents).join(" · ") || "Vacía"}</dd>
                        </div>
                        {project !== null && typeof project.description === "string" && (
                            <div>
                                <dt>Descripción</dt>
                                <dd>{project.description}</dd>
                            </div>
                        )}
                        {project !== null && typeof project.location === "string" && (
                            <div>
                                <dt>Ubicación</dt>
                                <dd>{project.location}</dd>
                            </div>
                        )}
                        {project !== null && typeof project.progress === "number" && (
                            <div>
                                <dt>Avance</dt>
                                <dd>{project.progress} %</dd>
                            </div>
                        )}
                    </dl>
                    <div className={styles.shortcuts}>
                        <Button
                            icon="undo"
                            onClick={() => {
                                setRestoring(viewing);
                                setViewing(null);
                            }}
                        >
                            Restaurar esta versión
                        </Button>
                    </div>
                </Dialog>
            )}

            {restoring !== null && (
                <ConfirmDialog
                    title={`¿Restaurar la versión ${restoring.version_number}?`}
                    confirmLabel="Restaurar"
                    onConfirm={() =>
                        void run(
                            () => versionsApi.restore(restoring.id),
                            () => {
                                setRestoring(null);
                                versions.reload();
                                onRestored();
                                showToast(`Versión ${restoring.version_number} restaurada.`);
                            },
                        )
                    }
                    onCancel={() => setRestoring(null)}
                >
                    <p>
                        El contenido del proyecto se sustituye por el de esa versión. Antes se
                        guarda el estado actual como una versión nueva, así que puedes volver a él.
                        El nombre y el estado no cambian, y el historial de «Deshacer» se vacía.
                    </p>
                </ConfirmDialog>
            )}
        </Panel>
    );
}
