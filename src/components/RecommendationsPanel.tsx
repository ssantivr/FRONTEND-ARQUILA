import { useEffect, useState, type FormEvent } from "react";

import { useAsync } from "../hooks/useAsync";
import { recommendationsApi } from "../services/api";
import { appState } from "../state/appState";
import type { RecommendationPriority, RecommendationSource } from "../types/api";
import type { SectionProps } from "../types/ui";
import { AsyncStatus } from "./AsyncStatus";
import { Panel } from "./Panel";

const SOURCE_LABELS: Record<RecommendationSource, string> = {
    system: "Automática",
    user: "Manual",
    ai: "IA",
};

const PRIORITIES: { id: RecommendationPriority; label: string }[] = [
    { id: "high", label: "Prioridad alta" },
    { id: "medium", label: "Prioridad media" },
    { id: "low", label: "Prioridad baja" },
];

const PRIORITY_ORDER: Record<RecommendationPriority, number> = { high: 0, medium: 1, low: 2 };

const CATEGORY_LABELS: Record<string, string> = {
    terrain: "Terreno",
    materials: "Materiales",
};

export function RecommendationsPanel({ projectId, run }: SectionProps) {
    const recommendations = useAsync(
        () => recommendationsApi.listByProject(projectId),
        [projectId],
    );
    const [category, setCategory] = useState("");
    const [content, setContent] = useState("");
    const [priority, setPriority] = useState<RecommendationPriority>("medium");
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        if (recommendations.data !== null) {
            appState.setRecommendations(projectId, recommendations.data);
        }
    }, [projectId, recommendations.data]);

    async function handleGenerate() {
        setGenerating(true);
        await run(() => recommendationsApi.generate(projectId), recommendations.reload);
        setGenerating(false);
    }

    function handleCreate(event: FormEvent) {
        event.preventDefault();

        run(
            () =>
                recommendationsApi.create(projectId, {
                    category: category.trim(),
                    content: content.trim(),
                    priority,
                }),
            () => {
                setCategory("");
                setContent("");
                setPriority("medium");
                recommendations.reload();
            },
        );
    }

    const items = [...(recommendations.data ?? [])].sort(
        (first, second) =>
            PRIORITY_ORDER[first.priority] - PRIORITY_ORDER[second.priority] ||
            first.id - second.id,
    );

    return (
        <Panel
            title="Recomendaciones"
            actions={
                <button type="button" onClick={handleGenerate} disabled={generating}>
                    Analizar proyecto
                </button>
            }
        >
            <p className="message">
                «Analizar proyecto» revisa los terrenos y materiales con reglas generales y
                reemplaza las recomendaciones automáticas anteriores. Se ordenan por
                prioridad. Son preliminares: sirven para planificar y no sustituyen la revisión
                de un arquitecto o un ingeniero.
            </p>
            <AsyncStatus
                loading={recommendations.loading}
                error={recommendations.error}
                isEmpty={items.length === 0}
                emptyText="No hay recomendaciones."
            />
            <ul className="recommendation-list">
                {items.map((recommendation) => (
                    <li key={recommendation.id} className="recommendation">
                        <div className="recommendation-meta">
                            <span className={`badge badge-priority-${recommendation.priority}`}>
                                {PRIORITIES.find((item) => item.id === recommendation.priority)
                                    ?.label ?? recommendation.priority}
                            </span>
                            <span className={`badge badge-source-${recommendation.source}`}>
                                {SOURCE_LABELS[recommendation.source]}
                            </span>
                            <span>
                                {CATEGORY_LABELS[recommendation.category] ??
                                    recommendation.category}
                            </span>
                        </div>
                        <p>{recommendation.content}</p>
                        <button
                            type="button"
                            className="button-danger"
                            aria-label={`Eliminar recomendación: ${recommendation.content}`}
                            onClick={() =>
                                run(
                                    () => recommendationsApi.remove(recommendation.id),
                                    recommendations.reload,
                                )
                            }
                        >
                            Eliminar
                        </button>
                    </li>
                ))}
            </ul>
            <form className="form-row" onSubmit={handleCreate}>
                <label>
                    Categoría
                    <input
                        value={category}
                        onChange={(event) => setCategory(event.target.value)}
                        maxLength={80}
                        required
                    />
                </label>
                <label className="field-wide">
                    Recomendación
                    <input
                        value={content}
                        onChange={(event) => setContent(event.target.value)}
                        maxLength={2000}
                        required
                    />
                </label>
                <label>
                    Prioridad
                    <select
                        value={priority}
                        onChange={(event) =>
                            setPriority(event.target.value as RecommendationPriority)
                        }
                    >
                        {PRIORITIES.map((item) => (
                            <option key={item.id} value={item.id}>
                                {item.label}
                            </option>
                        ))}
                    </select>
                </label>
                <button
                    type="submit"
                    disabled={category.trim() === "" || content.trim() === ""}
                >
                    Agregar
                </button>
            </form>
        </Panel>
    );
}
