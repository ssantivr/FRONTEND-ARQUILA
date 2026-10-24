import {
    Suspense,
    lazy,
    useCallback,
    useEffect,
    useRef,
    useState,
    type CSSProperties,
} from "react";

import { AsyncStatus } from "../components/AsyncStatus";
import { Icon } from "../components/Icon";
import type { Engine } from "../components/LitModel";
import { ProjectPicker } from "../components/ProjectPicker";
import { ProgressBar } from "../components/ui/ProgressBar";
import { Range } from "../components/ui/Range";
import { useProjectChoice } from "../hooks/useProjectChoice";
import { useSolarSite } from "../hooks/useSolarSite";
import { useLighting } from "../state/lighting";
import { formatNumber } from "../utils/format";
import {
    LIGHTING_LIMITS,
    formatHour,
    skyOf,
    sunPosition,
    type LightingSettings,
} from "../utils/lighting";

const LitModel = lazy(() =>
    import("../components/LitModel").then((module) => ({ default: module.LitModel })),
);

type ViewId = "isometric" | "front" | "side" | "top";
type ProjectionId = "perspective" | "orthographic";
type QualityId = "draft" | "standard" | "high";
type FormatId = "png" | "jpeg" | "webp";

const VIEWS: { id: ViewId; label: string }[] = [
    { id: "isometric", label: "Isométrica" },
    { id: "front", label: "Frontal" },
    { id: "side", label: "Lateral" },
    { id: "top", label: "Superior" },
];

const ASPECTS = [
    { id: "16:9", ratio: 16 / 9 },
    { id: "4:3", ratio: 4 / 3 },
    { id: "1:1", ratio: 1 },
    { id: "9:16", ratio: 9 / 16 },
] as const;

type AspectId = (typeof ASPECTS)[number]["id"];

const LONG_EDGES = [1280, 1920, 2560, 3840];

const QUALITIES: Record<
    QualityId,
    { label: string; note: string; samples: number; shadowMapSize: number }
> = {
    draft: {
        label: "Borrador",
        note: "1 pasada. Inmediato, con bordes y sombras más duros.",
        samples: 1,
        shadowMapSize: 2048,
    },
    standard: {
        label: "Estándar",
        note: "8 pasadas promediadas: bordes suaves y sombras con penumbra.",
        samples: 8,
        shadowMapSize: 2048,
    },
    high: {
        label: "Alta",
        note: "16 pasadas y sombras al doble de resolución.",
        samples: 16,
        shadowMapSize: 4096,
    },
};

const FORMATS: Record<FormatId, { label: string; mime: string; lossy: boolean }> = {
    png: { label: "PNG", mime: "image/png", lossy: false },
    jpeg: { label: "JPEG", mime: "image/jpeg", lossy: true },
    webp: { label: "WebP", mime: "image/webp", lossy: true },
};

const LOSSY_QUALITY = 0.92;
const SKY_NAMES = { day: "Día", sunset: "Atardecer", night: "Noche" };

type Job =
    | { state: "idle" }
    | { state: "rendering"; done: number; total: number }
    | { state: "done" }
    | { state: "cancelled" }
    | { state: "error" };

interface Result {
    url: string;
    fileName: string;
    width: number;
    height: number;
    bytes: number;
    seconds: number;
    format: FormatId;
}

function sizeOf(aspect: AspectId, longEdge: number): { width: number; height: number } {
    const ratio = ASPECTS.find((item) => item.id === aspect)?.ratio ?? 1;
    const even = (value: number) => Math.round(value / 2) * 2;

    return ratio >= 1
        ? { width: longEdge, height: even(longEdge / ratio) }
        : { width: even(longEdge * ratio), height: longEdge };
}

function formatBytes(bytes: number): string {
    return bytes >= 1_000_000
        ? `${formatNumber(Math.round(bytes / 100_000) / 10)} MB`
        : `${formatNumber(Math.round(bytes / 1000))} kB`;
}

function toBlob(canvas: HTMLCanvasElement, format: FormatId): Promise<Blob | null> {
    return new Promise((resolve) =>
        canvas.toBlob(
            resolve,
            FORMATS[format].mime,
            FORMATS[format].lossy ? LOSSY_QUALITY : undefined,
        ),
    );
}

/** Whether this browser can encode a format; PNG it always can. */
function canEncode(format: FormatId): boolean {
    if (format === "png") {
        return true;
    }

    try {
        const probe = document.createElement("canvas");

        probe.width = 1;
        probe.height = 1;

        return probe.toDataURL(FORMATS[format].mime).startsWith(`data:${FORMATS[format].mime}`);
    } catch {
        return false;
    }
}

function formatDay(date: string): string {
    const [year, month, day] = date.split("-").map(Number);

    return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("es", {
        day: "numeric",
        month: "short",
        timeZone: "UTC",
    });
}

interface RenderPageProps {
    onLighting: () => void;
}

/**
 * A capture of the 3D view at the size and quality chosen: the same engine as the viewer,
 * averaged over several frames. It is not a photorealistic render, and says so. The steps go
 * down the panel: camera, light, image, quality, then generate; the result covers the preview
 * until the user goes back to the framing.
 */
export function RenderPage({ onLighting }: RenderPageProps) {
    const choice = useProjectChoice();
    const projectId = choice.project?.id ?? null;
    const [lighting, setLighting] = useLighting(projectId);
    const { site } = useSolarSite(projectId);
    const engine = useRef<Engine | null>(null);
    const abort = useRef<AbortController | null>(null);
    const stage = useRef<HTMLElement>(null);
    const [ready, setReady] = useState(false);
    const [maxSize, setMaxSize] = useState<number | null>(null);
    const [panelOpen, setPanelOpen] = useState(true);
    const [view, setView] = useState<ViewId>("isometric");
    const [projection, setProjection] = useState<ProjectionId>("perspective");
    const [aspect, setAspect] = useState<AspectId>("16:9");
    const [longEdge, setLongEdge] = useState(1920);
    const [quality, setQuality] = useState<QualityId>("standard");
    const [format, setFormat] = useState<FormatId>("png");
    const [encodable] = useState(
        () => new Set((Object.keys(FORMATS) as FormatId[]).filter(canEncode)),
    );
    const [job, setJob] = useState<Job>({ state: "idle" });
    const [result, setResult] = useState<Result | null>(null);
    const [showingResult, setShowingResult] = useState(false);
    const size = sizeOf(aspect, longEdge);
    const rendering = job.state === "rendering";
    const sky = skyOf(lighting, site);
    const sun = sunPosition(lighting, site);
    const fits = (edge: number) => maxSize === null || edge <= maxSize;
    const qualityFits = (id: QualityId) =>
        maxSize === null || QUALITIES[id].shadowMapSize <= maxSize;

    const handleEngine = useCallback((next: Engine | null) => {
        engine.current = next;
        setReady(next !== null);
        setMaxSize(next?.maxImageSize ?? null);
    }, []);

    useEffect(() => {
        if (ready) {
            engine.current?.setProjection(projection);
        }
    }, [ready, projection]);

    // Leaving the screen, or changing project, stops the capture in progress and frees its image.
    useEffect(
        () => () => {
            abort.current?.abort();
        },
        [projectId],
    );

    useEffect(() => {
        setResult(null);
        setShowingResult(false);
        setJob({ state: "idle" });
    }, [projectId]);

    const url = result?.url;

    useEffect(() => {
        if (url !== undefined) {
            return () => URL.revokeObjectURL(url);
        }
    }, [url]);

    function chooseView(next: ViewId) {
        setView(next);
        setShowingResult(false);
        engine.current?.setView(next);
    }

    function setLight<Key extends keyof LightingSettings>(key: Key, value: LightingSettings[Key]) {
        setLighting({ ...lighting, [key]: value });
    }

    async function start() {
        const current = engine.current;

        if (current === null || rendering || projectId === null) {
            return;
        }

        const controller = new AbortController();
        const { samples, shadowMapSize } = QUALITIES[quality];
        const started = performance.now();

        abort.current = controller;
        setShowingResult(false);
        setJob({ state: "rendering", done: 0, total: samples });

        try {
            const canvas = await current.renderStill({
                ...size,
                samples,
                shadowMapSize,
                signal: controller.signal,
                onProgress: (done, total) => setJob({ state: "rendering", done, total }),
            });

            if (canvas === null) {
                setJob({ state: "cancelled" });
                return;
            }

            const blob = await toBlob(canvas, format);

            if (controller.signal.aborted) {
                setJob({ state: "cancelled" });
                return;
            }

            // A browser that cannot encode a format hands back a PNG instead: that is not the
            // file that was asked for.
            if (blob === null || blob.type !== FORMATS[format].mime) {
                setJob({ state: "error" });
                return;
            }

            setResult({
                url: URL.createObjectURL(blob),
                fileName: `arquila-${choice.project?.name.trim().replace(/[^\p{L}\p{N}]+/gu, "-") ?? projectId}-${size.width}x${size.height}.${format === "jpeg" ? "jpg" : format}`,
                ...size,
                bytes: blob.size,
                seconds: (performance.now() - started) / 1000,
                format,
            });
            setShowingResult(true);
            setJob({ state: "done" });
            // On a phone the panel is under the preview: bring the image into view.
            stage.current?.scrollIntoView?.({ block: "nearest" });
        } catch {
            setJob({ state: "error" });
        }
    }

    return (
        <section className="workspace-page" aria-label="Renderizado">
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
                        <button type="button" className="button-secondary" onClick={onLighting}>
                            Ajustar la luz
                        </button>
                        <button
                            type="button"
                            className="button-secondary icon-button workspace-head-end"
                            aria-pressed={panelOpen}
                            aria-controls={panelOpen ? "render-panel" : undefined}
                            onClick={() => setPanelOpen(!panelOpen)}
                        >
                            <Icon name="panels" />
                            Parámetros
                        </button>
                    </>
                )}
            </div>

            {projectId !== null && (
                <div
                    className={
                        panelOpen
                            ? "studio studio-workspace"
                            : "studio studio-workspace studio-wide"
                    }
                >
                    <section
                        ref={stage}
                        className="studio-stage studio-stage-framed"
                        aria-label="Vista previa"
                        style={{ "--ratio": size.width / size.height } as CSSProperties}
                    >
                        <div
                            className="render-frame"
                            style={{ "--ratio": size.width / size.height } as CSSProperties}
                        >
                            <Suspense fallback={<p className="message">Cargando el visor…</p>}>
                                <LitModel
                                    key={projectId}
                                    projectId={projectId}
                                    lighting={lighting}
                                    site={site}
                                    onEngine={handleEngine}
                                />
                            </Suspense>
                        </div>
                        <p className="studio-caption">
                            <strong>Encuadre</strong>
                            <span>
                                {size.width} × {size.height} px
                            </span>
                            <span>Arrastra para girar, rueda para acercar</span>
                        </p>

                        {result !== null && showingResult && (
                            <figure className="render-result" aria-label="Captura de la vista">
                                <img
                                    src={result.url}
                                    alt={`Captura de la vista del proyecto, ${result.width} por ${result.height} píxeles`}
                                />
                                <figcaption className="render-result-foot">
                                    <p>
                                        <strong>Captura de la vista</strong>
                                        <span>
                                            {result.width} × {result.height} px ·{" "}
                                            {FORMATS[result.format].label} ·{" "}
                                            {formatBytes(result.bytes)} · en{" "}
                                            {formatNumber(Math.round(result.seconds * 10) / 10)} s
                                        </span>
                                    </p>
                                    <span className="render-result-actions">
                                        <button
                                            type="button"
                                            className="button-secondary"
                                            onClick={() => setShowingResult(false)}
                                        >
                                            Volver al encuadre
                                        </button>
                                        <a
                                            className="button button-lime"
                                            href={result.url}
                                            download={result.fileName}
                                        >
                                            Descargar
                                        </a>
                                    </span>
                                </figcaption>
                            </figure>
                        )}
                    </section>

                    {panelOpen && (
                        <aside
                            id="render-panel"
                            className="studio-panel"
                            aria-label="Parámetros de la captura"
                        >
                            <section>
                                <h3>1 · Cámara</h3>
                                <div className="segmented" role="group" aria-label="Vista">
                                    {VIEWS.map((item) => (
                                        <button
                                            key={item.id}
                                            type="button"
                                            className="button-secondary"
                                            aria-pressed={view === item.id}
                                            disabled={!ready || rendering}
                                            onClick={() => chooseView(item.id)}
                                        >
                                            {item.label}
                                        </button>
                                    ))}
                                </div>
                                <div className="segmented" role="group" aria-label="Proyección">
                                    <button
                                        type="button"
                                        className="button-secondary"
                                        aria-pressed={projection === "perspective"}
                                        disabled={rendering}
                                        onClick={() => setProjection("perspective")}
                                    >
                                        Perspectiva
                                    </button>
                                    <button
                                        type="button"
                                        className="button-secondary"
                                        aria-pressed={projection === "orthographic"}
                                        disabled={rendering}
                                        onClick={() => setProjection("orthographic")}
                                    >
                                        Ortográfica
                                    </button>
                                </div>
                                <p className="studio-note">
                                    Encuadre: arrastra la vista previa para girar y usa la rueda
                                    para acercar. El marco tiene la proporción de la imagen.
                                </p>
                            </section>

                            <section>
                                <h3>2 · Iluminación</h3>
                                <dl className="studio-facts">
                                    <dt>Hora</dt>
                                    <dd className="numeric">
                                        {formatHour(lighting.hour)}
                                        {site !== null && `, ${formatDay(lighting.date)}`}
                                    </dd>
                                    <dt>Cielo</dt>
                                    <dd>{SKY_NAMES[sky]}</dd>
                                    <dt>Sol</dt>
                                    <dd className="numeric">
                                        {formatNumber(
                                            Math.round(sun.solar?.elevation ?? sun.elevation),
                                        )}
                                        ° sobre el horizonte
                                    </dd>
                                </dl>
                                <Range
                                    label="Exposición"
                                    value={lighting.exposure}
                                    display={`${lighting.exposure.toFixed(2)}×`}
                                    {...LIGHTING_LIMITS.exposure}
                                    disabled={rendering}
                                    onChange={(value) => setLight("exposure", value)}
                                />
                                <label className="checkbox">
                                    <input
                                        type="checkbox"
                                        checked={lighting.shadows}
                                        disabled={rendering}
                                        onChange={(event) =>
                                            setLight("shadows", event.target.checked)
                                        }
                                    />
                                    Sombras proyectadas
                                </label>
                                <p className="studio-note">
                                    Es la luz del proyecto: la exposición y las sombras cambian
                                    también en Iluminación y clima, donde están la hora, la fecha y
                                    el cielo.
                                </p>
                            </section>

                            <section>
                                <h3>3 · Imagen</h3>
                                <div
                                    className="segmented"
                                    role="group"
                                    aria-label="Relación de aspecto"
                                >
                                    {ASPECTS.map((item) => (
                                        <button
                                            key={item.id}
                                            type="button"
                                            className="button-secondary"
                                            aria-pressed={aspect === item.id}
                                            disabled={rendering}
                                            onClick={() => setAspect(item.id)}
                                        >
                                            {item.id}
                                        </button>
                                    ))}
                                </div>
                                <label>
                                    Resolución
                                    <select
                                        value={longEdge}
                                        disabled={rendering}
                                        aria-describedby={
                                            LONG_EDGES.every(fits) ? undefined : "resolution-why"
                                        }
                                        onChange={(event) =>
                                            setLongEdge(Number(event.target.value))
                                        }
                                    >
                                        {LONG_EDGES.map((edge) => {
                                            const option = sizeOf(aspect, edge);

                                            return (
                                                <option
                                                    key={edge}
                                                    value={edge}
                                                    disabled={!fits(edge)}
                                                >
                                                    {option.width} × {option.height} px
                                                    {!fits(edge) && " (no disponible)"}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </label>
                                {!LONG_EDGES.every(fits) && (
                                    <p className="studio-note" id="resolution-why">
                                        Este equipo dibuja imágenes de hasta {maxSize} px de lado.
                                    </p>
                                )}
                                <label>
                                    Formato de salida
                                    <select
                                        value={format}
                                        disabled={rendering}
                                        onChange={(event) =>
                                            setFormat(event.target.value as FormatId)
                                        }
                                    >
                                        {(Object.keys(FORMATS) as FormatId[]).map((id) => (
                                            <option
                                                key={id}
                                                value={id}
                                                disabled={!encodable.has(id)}
                                            >
                                                {FORMATS[id].label}
                                                {!encodable.has(id) &&
                                                    " (este navegador no lo genera)"}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            </section>

                            <section>
                                <h3>4 · Calidad</h3>
                                <div className="segmented" role="group" aria-label="Calidad">
                                    {(Object.keys(QUALITIES) as QualityId[]).map((id) => (
                                        <button
                                            key={id}
                                            type="button"
                                            className="button-secondary"
                                            aria-pressed={quality === id}
                                            disabled={rendering || !qualityFits(id)}
                                            title={
                                                qualityFits(id)
                                                    ? undefined
                                                    : `Pide sombras de ${QUALITIES[id].shadowMapSize} px; este equipo llega a ${maxSize}`
                                            }
                                            onClick={() => setQuality(id)}
                                        >
                                            {QUALITIES[id].label}
                                        </button>
                                    ))}
                                </div>
                                <p className="studio-note">{QUALITIES[quality].note}</p>
                            </section>

                            <section>
                                <h3>Qué se genera</h3>
                                <p className="studio-note">
                                    Captura de la vista, no un render fotorrealista: la dibuja el
                                    motor del visor en tiempo real, con sus materiales, la oclusión
                                    ambiental y la luz del proyecto. No hay trazado de rayos,
                                    reflejos trazados ni profundidad de campo.
                                </p>
                            </section>

                            <section className="render-run">
                                <h3>5 · Generar</h3>
                                <RunState
                                    job={job}
                                    result={result}
                                    size={size}
                                    format={format}
                                    onShowResult={() => setShowingResult(true)}
                                />
                                {rendering ? (
                                    <button
                                        type="button"
                                        className="button-secondary"
                                        onClick={() => abort.current?.abort()}
                                    >
                                        Cancelar
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        className="button-lime"
                                        disabled={!ready}
                                        onClick={start}
                                    >
                                        {result === null
                                            ? "Generar captura"
                                            : "Generar otra captura"}
                                    </button>
                                )}
                            </section>
                        </aside>
                    )}
                </div>
            )}
        </section>
    );
}

interface RunStateProps {
    job: Job;
    result: Result | null;
    size: { width: number; height: number };
    format: FormatId;
    onShowResult: () => void;
}

/** What the capture is doing, in words: waiting, working, done, failed or cancelled. */
function RunState({ job, result, size, format, onShowResult }: RunStateProps) {
    if (job.state === "rendering") {
        return (
            <div className="render-state render-state-busy" role="status">
                <ProgressBar label="Progreso de la captura" value={job.done / job.total} />
                <p>
                    <strong>Procesando</strong> · pasada {job.done} de {job.total} (
                    {Math.round((job.done / job.total) * 100)} %)
                </p>
            </div>
        );
    }

    if (job.state === "error") {
        return (
            <div className="render-state render-state-error" role="alert">
                <Icon name="alert" />
                <p>
                    <strong>No se pudo generar la imagen.</strong> Prueba con una resolución o una
                    calidad menor, u otro formato.
                </p>
            </div>
        );
    }

    if (job.state === "cancelled") {
        return (
            <div className="render-state" role="status">
                <Icon name="info" />
                <p>
                    <strong>Cancelada.</strong> No se generó ninguna imagen.
                </p>
            </div>
        );
    }

    if (job.state === "done" && result !== null) {
        return (
            <div className="render-state render-state-done" role="status">
                <Icon name="check" />
                <p>
                    <strong>Captura lista</strong> · {result.width} × {result.height} px,{" "}
                    {FORMATS[result.format].label}, {formatBytes(result.bytes)}.{" "}
                    <button type="button" className="studio-link" onClick={onShowResult}>
                        Verla
                    </button>
                </p>
            </div>
        );
    }

    return (
        <div className="render-state" role="status">
            <p>
                <strong>En espera</strong> · {size.width} × {size.height} px en{" "}
                {FORMATS[format].label}.
            </p>
        </div>
    );
}
