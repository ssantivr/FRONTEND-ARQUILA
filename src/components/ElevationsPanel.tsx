import { useState, type FormEvent } from "react";

import { useAsync } from "../hooks/useAsync";
import { elevationsApi } from "../services/api";
import type { Orientation, ProjectFile } from "../types/api";
import type { SectionProps } from "../types/ui";
import { AsyncStatus } from "./AsyncStatus";
import { FileAttachment } from "./FileAttachment";
import { Panel } from "./Panel";

const ORIENTATION_LABELS: Record<Orientation, string> = {
    north: "Norte",
    south: "Sur",
    east: "Este",
    west: "Oeste",
};

const ORIENTATIONS = Object.keys(ORIENTATION_LABELS) as Orientation[];

interface ElevationsPanelProps extends SectionProps {
    files: ProjectFile[];
}

export function ElevationsPanel({ projectId, run, files }: ElevationsPanelProps) {
    const [filter, setFilter] = useState<Orientation | "">("");
    const elevations = useAsync(
        () => elevationsApi.listByProject(projectId, filter || undefined),
        [projectId, filter],
    );
    const [title, setTitle] = useState("");
    const [orientation, setOrientation] = useState<Orientation>("north");

    function handleCreate(event: FormEvent) {
        event.preventDefault();

        run(
            () => elevationsApi.create(projectId, { title: title.trim(), orientation }),
            () => {
                setTitle("");
                elevations.reload();
            },
        );
    }

    const items = elevations.data ?? [];

    return (
        <Panel
            title="Elevaciones"
            actions={
                <select
                    aria-label="Filtrar por orientación"
                    value={filter}
                    onChange={(event) => setFilter(event.target.value as Orientation | "")}
                >
                    <option value="">Todas</option>
                    {ORIENTATIONS.map((value) => (
                        <option key={value} value={value}>
                            {ORIENTATION_LABELS[value]}
                        </option>
                    ))}
                </select>
            }
        >
            <AsyncStatus
                loading={elevations.loading}
                error={elevations.error}
                isEmpty={items.length === 0}
                emptyText={
                    filter === ""
                        ? "Este proyecto no tiene elevaciones."
                        : "No hay elevaciones con esa orientación."
                }
            />
            {items.length > 0 && (
                <table>
                    <thead>
                        <tr>
                            <th>Título</th>
                            <th>Orientación</th>
                            <th>Archivo</th>
                            <th />
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((elevation) => (
                            <tr key={elevation.id}>
                                <td>{elevation.title}</td>
                                <td>{ORIENTATION_LABELS[elevation.orientation]}</td>
                                <td>
                                    <FileAttachment
                                        files={files}
                                        fileId={elevation.file_id}
                                        label={`Archivo de la elevación ${elevation.title}`}
                                        onChange={(fileId) =>
                                            run(
                                                () =>
                                                    elevationsApi.update(elevation.id, {
                                                        file_id: fileId,
                                                    }),
                                                elevations.reload,
                                            )
                                        }
                                    />
                                </td>
                                <td className="numeric">
                                    <button
                                        type="button"
                                        className="button-danger"
                                        aria-label={`Eliminar elevación ${elevation.title}`}
                                        onClick={() =>
                                            run(
                                                () => elevationsApi.remove(elevation.id),
                                                elevations.reload,
                                            )
                                        }
                                    >
                                        Eliminar
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
            <form className="form-row" onSubmit={handleCreate}>
                <label>
                    Título
                    <input
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                        maxLength={160}
                        required
                    />
                </label>
                <label>
                    Orientación
                    <select
                        value={orientation}
                        onChange={(event) => setOrientation(event.target.value as Orientation)}
                    >
                        {ORIENTATIONS.map((value) => (
                            <option key={value} value={value}>
                                {ORIENTATION_LABELS[value]}
                            </option>
                        ))}
                    </select>
                </label>
                <button type="submit" disabled={title.trim() === ""}>
                    Agregar elevación
                </button>
            </form>
        </Panel>
    );
}
