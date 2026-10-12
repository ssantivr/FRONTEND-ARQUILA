import { useState } from "react";

import { useFavorites } from "../hooks/useFavorites";
import {
    SURFACE_MATERIAL_IDS,
    SURFACE_MATERIALS,
    type SurfaceMaterialId,
} from "../utils/surfaceMaterials";
import { Modal } from "./Modal";
import { Panel } from "./Panel";
import { ProgressBar } from "./ui/ProgressBar";

const FAVORITES_KEY = "arquila:favorite-surfaces";

function cssColor(color: number): string {
    return `#${color.toString(16).padStart(6, "0")}`;
}

/** The swatch hints at the finish: a soft highlight that sharpens as the surface gets smoother. */
function swatch(id: SurfaceMaterialId): React.CSSProperties {
    const surface = SURFACE_MATERIALS[id];
    const shine = Math.round((1 - surface.roughness) * 55 + surface.metalness * 25);

    return {
        background: `linear-gradient(135deg, rgba(255, 255, 255, ${shine / 100}) 0%, transparent 55%), ${cssColor(surface.color)}`,
        opacity: Math.max(surface.opacity, 0.45),
    };
}

/**
 * The surface finishes the 3D viewer can put on a room or component. The figures are the ones the
 * engine renders with, not a catalogue of products.
 */
export function SurfaceLibrary() {
    const favorites = useFavorites(FAVORITES_KEY);
    const [onlyFavorites, setOnlyFavorites] = useState(false);
    const [previewId, setPreviewId] = useState<SurfaceMaterialId | null>(null);
    const shown = SURFACE_MATERIAL_IDS.filter((id) => !onlyFavorites || favorites.isFavorite(id));
    const preview = previewId === null ? null : SURFACE_MATERIALS[previewId];

    return (
        <Panel
            title="Superficies del modelo 3D"
            actions={
                <label className="checkbox">
                    <input
                        type="checkbox"
                        checked={onlyFavorites}
                        onChange={(event) => setOnlyFavorites(event.target.checked)}
                    />
                    Solo favoritas de este navegador
                </label>
            }
        >
            <p className="message">
                Acabados que el visor 3D puede aplicar a un cuarto o a un componente, con los
                valores con que se dibujan. Las favoritas se guardan en este navegador, no en tu
                cuenta: no las verás en otro equipo.
            </p>
            {shown.length === 0 && (
                <p className="message" role="status">
                    Todavía no marcaste ninguna superficie como favorita.
                </p>
            )}
            <ul className="card-list surface-list">
                {shown.map((id) => {
                    const surface = SURFACE_MATERIALS[id];
                    const favorite = favorites.isFavorite(id);

                    return (
                        <li key={id} className="surface-item">
                            <button
                                type="button"
                                className="card surface-card"
                                onClick={() => setPreviewId(id)}
                            >
                                <span
                                    className="surface-swatch"
                                    style={swatch(id)}
                                    aria-hidden="true"
                                />
                                <span className="card-title">{surface.label}</span>
                                <span className="card-subtitle numeric">
                                    Rugosidad {surface.roughness} · Metal {surface.metalness}
                                </span>
                            </button>
                            <button
                                type="button"
                                className="surface-favorite"
                                aria-pressed={favorite}
                                aria-label={`${favorite ? "Quitar de favoritas" : "Marcar como favorita"}: ${surface.label}`}
                                onClick={() => favorites.toggle(id)}
                            >
                                {favorite ? "★" : "☆"}
                            </button>
                        </li>
                    );
                })}
            </ul>
            {preview !== null && previewId !== null && (
                <Modal title={preview.label} onClose={() => setPreviewId(null)}>
                    <div className="surface-preview">
                        <span
                            className="surface-swatch surface-swatch-large"
                            style={swatch(previewId)}
                            aria-hidden="true"
                        />
                        <dl className="definition-list">
                            <dt>Color base</dt>
                            <dd>
                                <code>{cssColor(preview.color)}</code>
                            </dd>
                            <dt>Rugosidad</dt>
                            <dd>
                                <ProgressBar label="Rugosidad" value={preview.roughness} />
                            </dd>
                            <dt>Metalicidad</dt>
                            <dd>
                                <ProgressBar label="Metalicidad" value={preview.metalness} />
                            </dd>
                            <dt>Opacidad</dt>
                            <dd>
                                <ProgressBar label="Opacidad" value={preview.opacity} />
                            </dd>
                            <dt>Relieve</dt>
                            <dd>{preview.grain > 0 ? "Con grano" : "Liso"}</dd>
                        </dl>
                    </div>
                </Modal>
            )}
        </Panel>
    );
}
