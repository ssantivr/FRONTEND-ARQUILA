import { useState } from "react";

import { useAsync } from "../hooks/useAsync";
import { structureApi } from "../services/api";
import { facade, section } from "../utils/elevations";
import type { Side } from "../utils/openings";
import { AsyncStatus } from "./AsyncStatus";
import { ElevationDrawing } from "./ElevationDrawing";
import { Panel } from "./Panel";

interface GeneratedElevationsPanelProps {
    projectId: number;
    projectName: string;
}

type ViewId = Side | "section";

const VIEWS: { id: ViewId; label: string; title: string }[] = [
    { id: "front", label: "Frontal", title: "Fachada principal" },
    { id: "back", label: "Posterior", title: "Fachada posterior" },
    { id: "left", label: "Lateral izq.", title: "Fachada lateral izquierda" },
    { id: "right", label: "Lateral der.", title: "Fachada lateral derecha" },
    { id: "section", label: "Corte", title: "Corte esquemático A-A" },
];

export function GeneratedElevationsPanel({ projectId, projectName }: GeneratedElevationsPanelProps) {
    const structure = useAsync(() => structureApi.get(projectId), [projectId]);
    const [viewId, setViewId] = useState<ViewId>("front");
    const view = VIEWS.find((item) => item.id === viewId) ?? VIEWS[0];
    const drawing =
        structure.data === null
            ? null
            : view.id === "section"
              ? section(structure.data)
              : facade(structure.data, view.id);

    return (
        <Panel
            title="Fachadas y corte generados"
            actions={
                <div className="segmented" role="group" aria-label="Vista">
                    {VIEWS.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            className="button-secondary"
                            aria-pressed={item.id === viewId}
                            onClick={() => setViewId(item.id)}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            }
        >
            <p className="message">
                Se dibujan con los cuartos del modelo: cada nivel con su altura, las mismas
                ventanas, puerta y techo decorativos del modelo 3D, y las cotas de nivel. El
                corte pasa por la mitad del ancho de la edificación.
            </p>
            <AsyncStatus
                loading={structure.loading}
                error={structure.error}
                onRetry={structure.reload}
                isEmpty={drawing === null}
                emptyText="Agrega cuartos en la pestaña Modelo 3D, o crea un proyecto de ejemplo, para generar las fachadas."
            />
            {drawing !== null && (
                <ElevationDrawing
                    drawing={drawing}
                    title={view.title}
                    fileName={`${view.id === "section" ? "corte" : "fachada"}-${projectName}-${view.label}`}
                    sectioned={view.id === "section"}
                />
            )}
        </Panel>
    );
}
