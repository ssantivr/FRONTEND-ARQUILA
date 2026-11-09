import type { ProjectTemplate } from "../types/api";
import { formatNumber } from "../utils/format";

interface TemplateCardsProps {
    templates: ProjectTemplate[];
    /** While one is being created, every card waits. */
    disabled: boolean;
    onChoose: (templateId: string) => void;
}

/** The example projects of GET /templates as cards: kind, name, description and sizes. Used by the
 *  projects screen («Ejemplos») and by the empty home. */
export function TemplateCards({ templates, disabled, onChoose }: TemplateCardsProps) {
    return (
        <ul className="card-list">
            {templates.map((template) => (
                <li key={template.id}>
                    <button
                        type="button"
                        className="card module-card"
                        disabled={disabled}
                        onClick={() => onChoose(template.id)}
                    >
                        <span className="badge badge-source-system">{template.kind}</span>
                        <span className="card-title">{template.name}</span>
                        <span className="card-subtitle">{template.description}</span>
                        <span className="card-subtitle">
                            {template.levels === 1 ? "1 nivel" : `${template.levels} niveles`} ·{" "}
                            {formatNumber(template.built_area_m2)} m² construidos · lote de{" "}
                            {formatNumber(template.lot_area_m2)} m²
                        </span>
                    </button>
                </li>
            ))}
        </ul>
    );
}
