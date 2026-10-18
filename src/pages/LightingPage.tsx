import { Suspense, lazy } from "react";

import { AsyncStatus } from "../components/AsyncStatus";
import { ProjectPicker } from "../components/ProjectPicker";
import { Range } from "../components/ui/Range";
import { useProjectChoice } from "../hooks/useProjectChoice";
import { useSolarSite } from "../hooks/useSolarSite";
import { useLighting } from "../state/lighting";
import { readSiteSettings } from "../state/siteSettings";
import { formatNumber } from "../utils/format";
import {
    LIGHTING_LIMITS,
    PRESENTATION_LIGHTING,
    WORK_LIGHTING,
    compassPoint,
    formatHour,
    skyOf,
    sunPosition,
    utcOffsetOf,
    type LightingSettings,
    type SkyChoice,
    type SolarSite,
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

/** Whether two settings light the scene the same; the date is not part of a preset. */
function sameLighting(first: LightingSettings, second: LightingSettings): boolean {
    return (Object.keys(first) as (keyof LightingSettings)[]).every(
        (key) => key === "date" || first[key] === second[key],
    );
}

function formatCoordinates(site: SolarSite): string {
    const latitude = `${formatNumber(Math.abs(site.latitude))}° ${site.latitude < 0 ? "S" : "N"}`;
    const longitude = `${formatNumber(Math.abs(site.longitude))}° ${site.longitude < 0 ? "O" : "E"}`;

    return `${latitude} · ${longitude}`;
}

function formatOffset(hours: number): string {
    return hours === 0 ? "UTC" : `UTC${hours > 0 ? "+" : "−"}${Math.abs(hours)}`;
}

function formatDay(date: string): string {
    const [year, month, day] = date.split("-").map(Number);

    return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("es", {
        day: "numeric",
        month: "short",
        timeZone: "UTC",
    });
}

interface LightingPageProps {
    onRender: () => void;
}

/**
 * The presentation light of a project, over its model. With the latitude and longitude of the
 * lot the sun is the real one of the date and hour; without them, a plain arc, and the date is
 * off because it would change nothing.
 */
export function LightingPage({ onRender }: LightingPageProps) {
    const choice = useProjectChoice();
    const projectId = choice.project?.id ?? null;
    const [lighting, setLighting] = useLighting(projectId);
    const { site, terrain, loading: siteLoading } = useSolarSite(projectId);
    const sky = skyOf(lighting, site);
    const sun = sunPosition(lighting, site);
    const night = sky === "night";
    const siteNorth =
        projectId === null || terrain === null
            ? undefined
            : readSiteSettings(projectId).terrains[terrain.id]?.north;

    function set<Key extends keyof LightingSettings>(key: Key, value: LightingSettings[Key]) {
        setLighting({ ...lighting, [key]: value });
    }

    return (
        <section className="workspace-page" aria-label="Iluminación y clima">
            <div className="workspace-head">
                <AsyncStatus
                    loading={choice.loading}
                    error={choice.error}
                    onRetry={choice.reload}
                    isEmpty={choice.projects.length === 0}
                    emptyTitle="Sin proyectos"
                    emptyText="Todavía no tienes proyectos. Crea el primero desde Proyectos."
                />
                {choice.project !== null && (
                    <>
                        <ProjectPicker
                            projects={choice.projects}
                            value={choice.project.id}
                            onChange={choice.choose}
                        />
                        <button
                            type="button"
                            className="button-secondary"
                            onClick={() => setLighting(PRESENTATION_LIGHTING)}
                        >
                            Restablecer
                        </button>
                        <button type="button" className="button-lime" onClick={onRender}>
                            Renderizar con esta luz
                        </button>
                    </>
                )}
            </div>

            {projectId !== null && (
                <div className="studio studio-workspace">
                    <section className="studio-stage" aria-label="Previsualización de la luz">
                        <Suspense fallback={<p className="message">Cargando el visor…</p>}>
                            <LitModel
                                key={projectId}
                                projectId={projectId}
                                lighting={lighting}
                                site={site}
                            />
                        </Suspense>
                        <p className="studio-caption" role="status">
                            <strong>{formatHour(lighting.hour)}</strong>
                            {site !== null && <span>{formatDay(lighting.date)}</span>}
                            <span>{SKY_NAMES[sky]}</span>
                            {sun.solar === null ? (
                                <span>
                                    {night ? "Luna" : "Sol"} a{" "}
                                    {formatNumber(Math.round(sun.elevation))}° sobre el horizonte
                                </span>
                            ) : (
                                <span>
                                    Sol a {formatNumber(Math.round(sun.solar.elevation))}° · azimut{" "}
                                    {formatNumber(Math.round(sun.solar.azimuth))}° (
                                    {compassPoint(sun.solar.azimuth)})
                                </span>
                            )}
                            <span>{lighting.shadows ? "Con sombras" : "Sin sombras"}</span>
                        </p>
                    </section>

                    <aside className="studio-panel" aria-label="Controles de iluminación">
                        <section>
                            <h3>Lugar</h3>
                            {siteLoading && <p className="studio-note">Buscando el terreno…</p>}
                            {!siteLoading && site !== null && terrain !== null && (
                                <dl className="studio-facts">
                                    <dt>Terreno</dt>
                                    <dd>{terrain.name}</dd>
                                    <dt>Coordenadas</dt>
                                    <dd className="numeric">{formatCoordinates(site)}</dd>
                                    <dt>Hora</dt>
                                    <dd className="numeric">
                                        Local, {formatOffset(utcOffsetOf(site))}
                                    </dd>
                                </dl>
                            )}
                            {!siteLoading && site === null && (
                                <p className="studio-note">
                                    {terrain === null
                                        ? "El proyecto no tiene terreno."
                                        : `${terrain.name} no tiene latitud ni longitud.`}{" "}
                                    El sol sigue un arco simple de 6:00 a 18:00 y la fecha no cambia
                                    nada. Escribe las coordenadas en Terrenos para ver el sol real.
                                </p>
                            )}
                        </section>

                        <section>
                            <h3>Sol</h3>
                            <label className="studio-date">
                                Fecha
                                <input
                                    type="date"
                                    value={lighting.date}
                                    disabled={site === null}
                                    aria-describedby={site === null ? undefined : "date-why"}
                                    onChange={(event) => {
                                        if (event.target.value !== "") {
                                            set("date", event.target.value);
                                        }
                                    }}
                                />
                            </label>
                            {site !== null && (
                                <p className="studio-note" id="date-why">
                                    Cambia la altura del sol y por dónde sale y se pone.
                                </p>
                            )}
                            <Range
                                label="Hora del día"
                                value={lighting.hour}
                                display={formatHour(lighting.hour)}
                                {...LIGHTING_LIMITS.hour}
                                onChange={(value) => set("hour", value)}
                            />
                            <Range
                                label={site === null ? "Orientación solar" : "Norte del terreno"}
                                value={lighting.orientation}
                                display={`${lighting.orientation}°`}
                                {...LIGHTING_LIMITS.orientation}
                                onChange={(value) => set("orientation", value)}
                            />
                            {site !== null && (
                                <p className="studio-note">
                                    Grados en el sentido del reloj desde el fondo del lote.
                                    {siteNorth !== undefined &&
                                        siteNorth !== lighting.orientation && (
                                            <>
                                                {" "}
                                                En la implantación está a {siteNorth}°.{" "}
                                                <button
                                                    type="button"
                                                    className="studio-link"
                                                    onClick={() => set("orientation", siteNorth)}
                                                >
                                                    Usar ese norte
                                                </button>
                                            </>
                                        )}
                                </p>
                            )}
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
                                        onClick={() =>
                                            setLighting({ ...preset.settings, date: lighting.date })
                                        }
                                    >
                                        {preset.label}
                                    </button>
                                ))}
                            </div>
                            <p className="studio-note">
                                Es la luz con la que se presenta y se renderiza el proyecto; el
                                editor 3D conserva su luz de trabajo. Se guarda en este navegador.
                            </p>
                        </section>
                    </aside>
                </div>
            )}
        </section>
    );
}
