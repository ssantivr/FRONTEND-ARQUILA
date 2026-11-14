import type { LayerName, Layers, RenderMode, SectionAxis } from "../../three/BuildingSceneManager";
import type { RoofKind } from "../../types/api";
import { Select } from "../ui/Input";

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

const RENDER_MODES: { id: RenderMode; label: string }[] = [
    { id: "solid", label: "Sólido con luz" },
    { id: "wireframe", label: "Sólido con malla" },
    { id: "materials", label: "Solo materiales" },
];

/** What the cut crosses, and what its percentage is a share of. */
const SECTION_AXES: { id: SectionAxis; label: string; share: string }[] = [
    { id: "y", label: "Corte en planta (altura)", share: "de la altura" },
    { id: "x", label: "Corte transversal (ancho)", share: "del ancho" },
    { id: "z", label: "Corte longitudinal (fondo)", share: "del fondo" },
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
    renderMode: RenderMode;
    onRenderMode: (mode: RenderMode) => void;
    sectionAxis: SectionAxis;
    onSectionAxis: (axis: SectionAxis) => void;
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
    renderMode,
    onRenderMode,
    sectionAxis,
    onSectionAxis,
}: ScenePanelProps) {
    const share = SECTION_AXES.find((item) => item.id === sectionAxis)?.share ?? "";

    return (
        <aside className="hud hud-scene" aria-label="Corte, despiece y capas">
            <details open>
                <summary>Escena</summary>
                <Select
                    label="Modo de vista"
                    fieldClassName="hud-field hud-field-stack"
                    value={renderMode}
                    onChange={(event) => onRenderMode(event.target.value as RenderMode)}
                >
                    {RENDER_MODES.map((item) => (
                        <option key={item.id} value={item.id}>
                            {item.label}
                        </option>
                    ))}
                </Select>
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
                    title="Corta el modelo para ver su interior, en planta o de lado."
                >
                    Corte
                    <input
                        type="range"
                        min={CUT_MIN_PERCENT}
                        max={100}
                        step={CUT_STEP_PERCENT}
                        value={cut}
                        aria-valuetext={cut === 100 ? "Sin corte" : `Corte al ${cut} % ${share}`}
                        onChange={(event) => onCut(Number(event.target.value))}
                    />
                    <output className="hud-readout">{cut} %</output>
                </label>
                <Select
                    label="Eje del corte"
                    fieldClassName="hud-field hud-field-stack"
                    value={sectionAxis}
                    onChange={(event) => onSectionAxis(event.target.value as SectionAxis)}
                >
                    {SECTION_AXES.map((item) => (
                        <option key={item.id} value={item.id}>
                            {item.label}
                        </option>
                    ))}
                </Select>
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
                <Select
                    label="Cubierta"
                    fieldClassName="hud-field hud-field-stack"
                    value={roof}
                    onChange={(event) => onRoof(event.target.value as RoofKind)}
                >
                    {ROOFS.map((item) => (
                        <option key={item.id} value={item.id}>
                            {item.label}
                        </option>
                    ))}
                </Select>
            </details>
        </aside>
    );
}
