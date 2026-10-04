import { useRef, useState, type FormEvent } from "react";

import { useAsync } from "../hooks/useAsync";
import { plansApi } from "../services/api";
import type { Plan, ProjectFile } from "../types/api";
import type { SectionProps } from "../types/ui";
import { optionalText } from "../utils/format";
import { AsyncStatus } from "./AsyncStatus";
import { FileAttachment } from "./FileAttachment";
import { Panel } from "./Panel";
import { FormActions, RowActions } from "./RowActions";

interface PlansPanelProps extends SectionProps {
    files: ProjectFile[];
}

export function PlansPanel({ projectId, run, files }: PlansPanelProps) {
    const plans = useAsync(() => plansApi.listByProject(projectId), [projectId]);
    const [editingId, setEditingId] = useState<number | null>(null);
    const form = useRef<HTMLFormElement>(null);
    const [title, setTitle] = useState("");
    const [level, setLevel] = useState("");
    const [scale, setScale] = useState("");

    function resetForm() {
        setEditingId(null);
        setTitle("");
        setLevel("");
        setScale("");
    }

    function startEdit(plan: Plan) {
        setEditingId(plan.id);
        form.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
        setTitle(plan.title);
        setLevel(plan.level ?? "");
        setScale(plan.scale ?? "");
    }

    function handleSubmit(event: FormEvent) {
        event.preventDefault();

        const data = {
            title: title.trim(),
            level: optionalText(level) ?? null,
            scale: optionalText(scale) ?? null,
        };

        run(
            () =>
                editingId === null
                    ? plansApi.create(projectId, data)
                    : plansApi.update(editingId, data),
            () => {
                resetForm();
                plans.reload();
            },
        );
    }

    function handleDelete(plan: Plan) {
        run(
            () => plansApi.remove(plan.id),
            () => {
                if (editingId === plan.id) {
                    resetForm();
                }
                plans.reload();
            },
        );
    }

    const items = plans.data ?? [];

    return (
        <Panel title="Planos">
            <AsyncStatus
                loading={plans.loading}
                error={plans.error}
                onRetry={plans.reload}
                isEmpty={items.length === 0}
                emptyText="Este proyecto no tiene planos."
            />
            {items.length > 0 && (
                <table>
                    <thead>
                        <tr>
                            <th>Título</th>
                            <th>Nivel</th>
                            <th>Escala</th>
                            <th>Archivo</th>
                            <th />
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((plan) => (
                            <tr
                                key={plan.id}
                                className={plan.id === editingId ? "row-editing" : undefined}
                            >
                                <td data-label="Título">{plan.title}</td>
                                <td data-label="Nivel">{plan.level ?? "—"}</td>
                                <td data-label="Escala">{plan.scale ?? "—"}</td>
                                <td data-label="Archivo">
                                    <FileAttachment
                                        files={files}
                                        fileId={plan.file_id}
                                        label={`Archivo del plano ${plan.title}`}
                                        onChange={(fileId) =>
                                            run(
                                                () =>
                                                    plansApi.update(plan.id, {
                                                        file_id: fileId,
                                                    }),
                                                plans.reload,
                                            )
                                        }
                                    />
                                </td>
                                <td>
                                    <RowActions
                                        label={`plano ${plan.title}`}
                                        onEdit={() => startEdit(plan)}
                                        onDelete={() => handleDelete(plan)}
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
                    Nivel
                    <input
                        value={level}
                        onChange={(event) => setLevel(event.target.value)}
                        maxLength={60}
                        placeholder="Planta baja"
                    />
                </label>
                <label>
                    Escala
                    <input
                        value={scale}
                        onChange={(event) => setScale(event.target.value)}
                        maxLength={20}
                        placeholder="1:100"
                    />
                </label>
                <FormActions
                    editing={editingId !== null}
                    addLabel="Agregar plano"
                    disabled={title.trim() === ""}
                    onCancel={resetForm}
                />
            </form>
        </Panel>
    );
}
