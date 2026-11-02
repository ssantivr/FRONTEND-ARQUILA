import type { OverlayLayers } from "../../three/BuildingSceneManager";
import type { RecommendationPriority, SpatialLayer, StructureElement } from "../../types/api";
import {
    HIGH_COLOR,
    KIND_COLORS,
    LOW_COLOR,
    PRIORITY_COLORS,
    cssColor,
    type ColorMode,
} from "../../utils/elementColors";
import { WORK_LAYERS } from "../RoomWorksPanel";
import { KIND_LABELS } from "./labels";

const COLOR_MODES: { id: ColorMode; label: string }[] = [
    { id: "realistic", label: "Realista" },
    { id: "kind", label: "Tipo" },
    { id: "cost", label: "Costo" },
    { id: "alerts", label: "Alertas" },
];

const PRIORITY_LABELS: Record<RecommendationPriority, string> = {
    high: "Prioridad alta",
    medium: "Prioridad media",
    low: "Prioridad baja",
};

const KIND_LEGEND = (Object.keys(KIND_LABELS) as StructureElement["kind"][]).map((kind) => ({
    label: KIND_LABELS[kind],
    swatch: cssColor(KIND_COLORS[kind]),
}));

const COST_LEGEND = [
    {
        label: "De menor a mayor costo estimado",
        swatch: `linear-gradient(90deg, ${cssColor(LOW_COLOR)}, ${cssColor(HIGH_COLOR)})`,
    },
];

const ALERT_LEGEND = (Object.keys(PRIORITY_LABELS) as RecommendationPriority[]).map((priority) => ({
    label: PRIORITY_LABELS[priority],
    swatch: cssColor(PRIORITY_COLORS[priority]),
}));

const HIGHLIGHTS: Record<SpatialLayer, { title: string; empty: string }> = {
    structure: {
        title: "Resalta columnas, vigas y muros",
        empty: "El proyecto no tiene componentes estructurales.",
    },
    installations: {
        title: "Atenúa el modelo para dejar a la vista las instalaciones",
        empty: "El proyecto no tiene instalaciones registradas.",
    },
    finishes: {
        title: "Resalta los elementos con un material asignado",
        empty: "Ningún elemento tiene un material distinto al predeterminado.",
    },
};

interface ColorPanelProps {
    colorMode: ColorMode;
    onColorMode: (mode: ColorMode) => void;
    /** Elements with a cost, and elements with an alert. */
    costCount: number;
    alertCount: number;
    workLayers: OverlayLayers;
    onWorkLayers: (layers: OverlayLayers) => void;
    /** Registered elements of each work layer; unknown until they load. */
    workCounts: Partial<Record<SpatialLayer, number>> | undefined;
    highlight: SpatialLayer | null;
    onHighlight: (layer: SpatialLayer | null) => void;
    nothingToHighlight: boolean;
}

/** How the model is coloured, and which work layers are drawn over it. */
export function ColorPanel({
    colorMode,
    onColorMode,
    costCount,
    alertCount,
    workLayers,
    onWorkLayers,
    workCounts,
    highlight,
    onHighlight,
    nothingToHighlight,
}: ColorPanelProps) {
    const legend =
        colorMode === "kind" ? KIND_LEGEND : colorMode === "cost" ? COST_LEGEND : ALERT_LEGEND;
    const colorNote =
        colorMode === "cost" && costCount === 0
            ? "Registra materiales con cantidad y costo para ver el reparto."
            : colorMode === "alerts" && alertCount === 0
              ? "Ninguna recomendación menciona un elemento por su nombre."
              : null;

    return (
        <aside className="hud hud-colors" aria-label="Color del modelo">
            <details>
                <summary>
                    Color · {COLOR_MODES.find((mode) => mode.id === colorMode)?.label}
                </summary>
                <div className="hud-modes" role="group" aria-label="Modo de color">
                    {COLOR_MODES.map((mode) => (
                        <button
                            key={mode.id}
                            type="button"
                            className="hud-item"
                            aria-pressed={mode.id === colorMode}
                            onClick={() => onColorMode(mode.id)}
                        >
                            {mode.label}
                        </button>
                    ))}
                </div>
                {colorMode !== "realistic" && (
                    <ul className="hud-legend">
                        {legend.map((item) => (
                            <li key={item.label}>
                                <span className="hud-swatch" style={{ background: item.swatch }} />
                                {item.label}
                            </li>
                        ))}
                    </ul>
                )}
                {colorMode === "cost" && costCount > 0 && (
                    <p>Reparto del presupuesto de materiales según el volumen de cada elemento.</p>
                )}
                {colorNote !== null && <p>{colorNote}</p>}
                <h4>Capas de obra</h4>
                <div className="hud-work-layers" role="group" aria-label="Capas de obra">
                    {WORK_LAYERS.map((layer) => (
                        <div key={layer.id}>
                            <label
                                className="checkbox"
                                title={`Muestra u oculta los elementos de ${layer.label.toLowerCase()} registrados`}
                            >
                                <input
                                    type="checkbox"
                                    checked={workLayers[layer.id]}
                                    onChange={(event) =>
                                        onWorkLayers({
                                            ...workLayers,
                                            [layer.id]: event.target.checked,
                                        })
                                    }
                                />
                                <span className="hud-swatch" style={{ background: layer.swatch }} />
                                {layer.label}
                                <span className="hud-count">{workCounts?.[layer.id] ?? 0}</span>
                            </label>
                            <button
                                type="button"
                                className="hud-item"
                                aria-pressed={layer.id === highlight}
                                title={HIGHLIGHTS[layer.id].title}
                                onClick={() =>
                                    onHighlight(layer.id === highlight ? null : layer.id)
                                }
                            >
                                Resaltar
                            </button>
                        </div>
                    ))}
                </div>
                {highlight !== null && nothingToHighlight && <p>{HIGHLIGHTS[highlight].empty}</p>}
            </details>
        </aside>
    );
}
