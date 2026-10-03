import { useState, type FormEvent } from "react";

import { useAsync } from "../hooks/useAsync";
import { recommendationsApi } from "../services/api";
import type { RecommendationSource } from "../types/api";
import type { SectionProps } from "../types/ui";
import { AsyncStatus } from "./AsyncStatus";
import { Panel } from "./Panel";

const SOURCE_LABELS: Record<RecommendationSource, string> = {
    system: "Automática",
    user: "Manual",
    ai: "IA",
};

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
    const [generating, setGenerating] = useState(false);

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
                }),
            () => {
                setCategory("");
                setContent("");
                recommendations.reload();
            },
        );
    }

    const items = recommendations.data ?? [];

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
                reemplaza las recomendaciones automáticas anteriores. Son una guía, no
                sustituyen un estudio técnico.
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
