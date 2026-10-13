import { Suspense, lazy } from "react";

import { ToolHead } from "../components/ToolHead";
import { Button } from "../components/ui/Button";
import { Range } from "../components/ui/Range";
import { useProjectChoice } from "../hooks/useProjectChoice";
import { useLighting } from "../state/lighting";
import { formatNumber } from "../utils/format";
import {
    LIGHTING_LIMITS,
    PRESENTATION_LIGHTING,
    WORK_LIGHTING,
    formatHour,
    skyOf,
    sunPosition,
    type LightingSettings,
    type SkyChoice,
} from "../utils/lighting";

const LitModel = lazy(() =>
    import("../components/LitModel").then((module) => ({ default: module.LitModel })),
);

const SKIES: { id: SkyChoice; label: string }[] = [
    { id: "auto", label: "Según la hora" },
    { id: "day", label: "Día" },
    { id: "sunset", label: "Atardecer" },
    { id: "night", label: "Noche" },
];

const SKY_NAMES = { day: "Día", sunset: "Atardecer", night: "Noche" };

const PRESETS: { label: string; note: string; settings: LightingSettings }[] = [
    {
        label: "Presentación",
        note: "Sol de media mañana con sombras, para mostrar el proyecto.",
        settings: PRESENTATION_LIGHTING,
    },
    {
        label: "Trabajo",
        note: "Luz alta, neutra y sin sombras, para revisar el modelo sin zonas oscuras.",
        settings: WORK_LIGHTING,
    },
];

function sameLighting(first: LightingSettings, second: LightingSettings): boolean {
    return (Object.keys(first) as (keyof LightingSettings)[]).every(
        (key) => first[key] === second[key],
    );
}

interface LightingPageProps {
    onRender: () => void;
}

export function LightingPage({ onRender }: LightingPageProps) {
    const choice = useProjectChoice();
    const projectId = choice.project?.id ?? null;
    const [lighting, setLighting] = useLighting(projectId);
    const sky = skyOf(lighting);
    const sun = sunPosition(lighting);
    const night = sky === "night";

    function set<Key extends keyof LightingSettings>(key: Key, value: LightingSettings[Key]) {
        setLighting({ ...lighting, [key]: value });
    }

    return (
        <>
            <ToolHead
                title="Iluminación y clima"
                meta="Luz de presentación del proyecto · se guarda en este navegador"
                choice={choice}
            >
                <Button variant="secondary" onClick={() => setLighting(PRESENTATION_LIGHTING)}>
                    Restablecer
                </Button>
                <Button className="button-lime" onClick={onRender} disabled={projectId === null}>
                    Renderizar con esta luz
                </Button>
            </ToolHead>

            {projectId !== null && (
                <div className="studio">
                    <section className="studio-stage" aria-label="Previsualización de la luz">
                        <Suspense fallback={<p className="message">Cargando el visor…</p>}>
                            <LitModel key={projectId} projectId={projectId} lighting={lighting} />
                        </Suspense>
                        <p className="studio-caption" role="status">
                            <strong>{formatHour(lighting.hour)}</strong>
                            <span>{SKY_NAMES[sky]}</span>
                            <span>
                                {night ? "Luna" : "Sol"} a {formatNumber(Math.round(sun.elevation))}
                                ° sobre el horizonte
                            </span>
                            <span>{lighting.shadows ? "Con sombras" : "Sin sombras"}</span>
                        </p>
                    </section>

                    <aside className="studio-panel" aria-label="Controles de iluminación">
                        <section>
                            <h3>Ajustes rápidos</h3>
                            <div className="studio-presets">
                                {PRESETS.map((preset) => (
                                    <button
                                        key={preset.label}
                                        type="button"
                                        className="button-secondary"
                                        aria-pressed={sameLighting(lighting, preset.settings)}
                                        title={preset.note}
                                        onClick={() => setLighting(preset.settings)}
                                    >
                                        {preset.label}
                                    </button>
                                ))}
                            </div>
                            <p className="studio-note">
                                El editor 3D del proyecto conserva su luz de trabajo, que sigue al
                                tema claro u oscuro. Lo que ajustas aquí es la luz con la que se
                                presenta y se renderiza.
                            </p>
                        </section>

                        <section>
                            <h3>Sol</h3>
                            <Range
                                label="Hora del día"
                                value={lighting.hour}
                                display={formatHour(lighting.hour)}
                                {...LIGHTING_LIMITS.hour}
                                onChange={(value) => set("hour", value)}
                            />
                            <Range
                                label="Orientación solar"
                                value={lighting.orientation}
                                display={`${lighting.orientation}°`}
                                {...LIGHTING_LIMITS.orientation}
                                onChange={(value) => set("orientation", value)}
                            />
                            <Range
                                label="Intensidad"
                                value={lighting.intensity}
                                display={`${Math.round(lighting.intensity * 100)} %`}
                                {...LIGHTING_LIMITS.intensity}
                                onChange={(value) => set("intensity", value)}
                            />
                            <Range
                                label="Temperatura de color"
                                value={lighting.temperature}
                                display={`${formatNumber(lighting.temperature)} K`}
                                {...LIGHTING_LIMITS.temperature}
                                disabled={night}
                                onChange={(value) => set("temperature", value)}
                            />
                            {night && (
                                <p className="studio-note">
                                    De noche la luz es la de la luna y no cambia de temperatura.
                                </p>
                            )}
                        </section>

                        <section>
                            <h3>Cielo y clima</h3>
                            <div className="segmented" role="group" aria-label="Cielo">
                                {SKIES.map((item) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        className="button-secondary"
                                        aria-pressed={lighting.sky === item.id}
                                        onClick={() => set("sky", item.id)}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                            <Range
                                label="Nubosidad"
                                value={lighting.clouds}
                                display={`${lighting.clouds} %`}
                                {...LIGHTING_LIMITS.clouds}
                                onChange={(value) => set("clouds", value)}
                            />
                        </section>

                        <section>
                            <h3>Imagen</h3>
                            <Range
                                label="Exposición"
                                value={lighting.exposure}
                                display={`${lighting.exposure.toFixed(2)}×`}
                                {...LIGHTING_LIMITS.exposure}
                                onChange={(value) => set("exposure", value)}
                            />
                            <label className="checkbox">
                                <input
                                    type="checkbox"
                                    checked={lighting.shadows}
                                    onChange={(event) => set("shadows", event.target.checked)}
                                />
                                Sombras proyectadas
                            </label>
                        </section>

                        <p className="studio-note">
                            El recorrido del sol es un arco de 6:00 a 18:00. No es un cálculo solar:
                            el proyecto no guarda latitud ni fecha.
                        </p>
                    </aside>
                </div>
            )}
        </>
    );
}
