import { useState, type FormEvent } from "react";

import { useAsync } from "../hooks/useAsync";
import { plansApi } from "../services/api";
import type { SectionProps } from "../types/ui";
import { optionalText } from "../utils/format";
import { AsyncStatus } from "./AsyncStatus";
import { Panel } from "./Panel";

export function PlansPanel({ projectId, run }: SectionProps) {
    const plans = useAsync(() => plansApi.listByProject(projectId), [projectId]);
    const [title, setTitle] = useState("");
    const [level, setLevel] = useState("");
    const [scale, setScale] = useState("");

    function handleCreate(event: FormEvent) {
        event.preventDefault();

        run(
            () =>
                plansApi.create(projectId, {
                    title: title.trim(),
                    level: optionalText(level),
                    scale: optionalText(scale),
                }),
            () => {
                setTitle("");
                setLevel("");
                setScale("");
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
                            <th />
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((plan) => (
                            <tr key={plan.id}>
                                <td>{plan.title}</td>
                                <td>{plan.level ?? "—"}</td>
                                <td>{plan.scale ?? "—"}</td>
                                <td className="numeric">
                                    <button
                                        type="button"
                                        className="button-danger"
                                        aria-label={`Eliminar plano ${plan.title}`}
                                        onClick={() =>
                                            run(() => plansApi.remove(plan.id), plans.reload)
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
                <button type="submit" disabled={title.trim() === ""}>
                    Agregar plano
                </button>
            </form>
        </Panel>
    );
}
