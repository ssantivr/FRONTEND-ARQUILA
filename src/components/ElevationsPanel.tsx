import { useRef, useState, type FormEvent } from "react";

import { useAsync } from "../hooks/useAsync";
import { elevationsApi } from "../services/api";
import type { Elevation, Orientation, ProjectFile } from "../types/api";
import type { SectionProps } from "../types/ui";
import { AsyncStatus } from "./AsyncStatus";
import { FileAttachment } from "./FileAttachment";
import { Panel } from "./Panel";
import { FormActions, RowActions } from "./RowActions";

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
    const [editingId, setEditingId] = useState<number | null>(null);
    const form = useRef<HTMLFormElement>(null);
    const [title, setTitle] = useState("");
    const [orientation, setOrientation] = useState<Orientation>("north");

    function resetForm() {
        setEditingId(null);
        setTitle("");
    }

    function startEdit(elevation: Elevation) {
        setEditingId(elevation.id);
        form.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
        setTitle(elevation.title);
        setOrientation(elevation.orientation);
    }

    function handleSubmit(event: FormEvent) {
        event.preventDefault();

        const data = { title: title.trim(), orientation };

        run(
            () =>
                editingId === null
                    ? elevationsApi.create(projectId, data)
                    : elevationsApi.update(editingId, data),
            () => {
                resetForm();
                elevations.reload();
            },
        );
    }

    function handleDelete(elevation: Elevation) {
        run(
            () => elevationsApi.remove(elevation.id),
            () => {
                if (editingId === elevation.id) {
                    resetForm();
                }
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
                            <tr
                                key={elevation.id}
                                className={elevation.id === editingId ? "row-editing" : undefined}
                            >
                                <td data-label="Título">{elevation.title}</td>
                                <td data-label="Orientación">{ORIENTATION_LABELS[elevation.orientation]}</td>
                                <td data-label="Archivo">
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
                                <td>
                                    <RowActions
                                        label={`elevación ${elevation.title}`}
                                        onEdit={() => startEdit(elevation)}
                                        onDelete={() => handleDelete(elevation)}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
            <form className="form-row" ref={form} onSubmit={handleSubmit}>
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
                <FormActions
                    editing={editingId !== null}
                    addLabel="Agregar elevación"
                    disabled={title.trim() === ""}
                    onCancel={resetForm}
                />
            </form>
        </Panel>
    );
}
