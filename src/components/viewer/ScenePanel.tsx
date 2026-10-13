import type { LayerName, Layers } from "../../three/BuildingSceneManager";
import type { RoofKind } from "../../types/api";

const LAYERS: { id: LayerName; label: string }[] = [
    { id: "rooms", label: "Cuartos" },
    { id: "roof", label: "Techo" },
    { id: "environment", label: "Árboles" },
    { id: "grid", label: "Cuadrícula" },
];

const ROOFS: { id: RoofKind; label: string }[] = [
    { id: "gable", label: "A dos aguas" },
    { id: "flat", label: "Plana" },
];

const SUN_STEP_DEG = 15;
const EXPLODE_STEP_PERCENT = 5;
const CUT_MIN_PERCENT = 10;
const CUT_STEP_PERCENT = 5;

interface ScenePanelProps {
    layers: Layers;
    onLayers: (layers: Layers) => void;
    /** Height of the section plane, as a percentage of the model's height; 100 is no cut. */
    cut: number;
    onCut: (cut: number) => void;
    explode: number;
    onExplode: (explode: number) => void;
    /** Angle of the sun around the model, in degrees. */
    sun: number;
    onSun: (sun: number) => void;
    roof: RoofKind;
    onRoof: (roof: RoofKind) => void;
}

/** Layers, section cut, exploded levels, sun and roof of the scene. */
export function ScenePanel({
    layers,
    onLayers,
    cut,
    onCut,
    explode,
    onExplode,
    sun,
    onSun,
    roof,
    onRoof,
}: ScenePanelProps) {
    return (
        <aside className="hud hud-scene" aria-label="Corte, despiece y capas">
            <details open>
                <summary>Escena</summary>
                <div className="hud-scene-layers" role="group" aria-label="Capas del modelo">
                    {LAYERS.map((layer) => (
                        <label key={layer.id} className="checkbox">
                            <input
                                type="checkbox"
                                checked={layers[layer.id]}
                                onChange={(event) =>
                                    onLayers({ ...layers, [layer.id]: event.target.checked })
                                }
                            />
                            {layer.label}
                        </label>
                    ))}
                </div>
                <label
                    className="hud-field"
                    title="Corta el modelo a una altura para ver su interior"
                >
                    Corte
                    <input
                        type="range"
                        min={CUT_MIN_PERCENT}
                        max={100}
                        step={CUT_STEP_PERCENT}
                        value={cut}
                        aria-valuetext={cut === 100 ? "Sin corte" : `${cut} % de la altura`}
                        onChange={(event) => onCut(Number(event.target.value))}
                    />
                    <output className="hud-readout">{cut} %</output>
                </label>
                <label className="hud-field" title="Separa los niveles para ver cada planta">
                    Despiece
                    <input
                        type="range"
                        min={0}
                        max={100}
                        step={EXPLODE_STEP_PERCENT}
                        value={explode}
                        aria-valuetext={explode === 0 ? "Sin despiece" : `${explode} %`}
                        onChange={(event) => onExplode(Number(event.target.value))}
                    />
                    <output className="hud-readout">{explode} %</output>
                </label>
                <label
                    className="hud-field"
                    title="Gira el sol alrededor del modelo para estudiar las sombras"
                >
                    Sol
                    <input
                        type="range"
                        min={0}
                        max={360}
                        step={SUN_STEP_DEG}
                        value={sun}
                        aria-valuetext={`${sun} grados`}
                        onChange={(event) => onSun(Number(event.target.value))}
                    />
                    <output className="hud-readout">{sun}°</output>
                </label>
                <label className="hud-field">
                    Cubierta
                    <select
                        value={roof}
                        onChange={(event) => onRoof(event.target.value as RoofKind)}
                    >
                        {ROOFS.map((item) => (
                            <option key={item.id} value={item.id}>
                                {item.label}
                            </option>
                        ))}
                    </select>
                </label>
            </details>
        </aside>
    );
}
