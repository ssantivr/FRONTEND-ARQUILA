import {
    Suspense,
    lazy,
    useCallback,
    useEffect,
    useRef,
    useState,
    type CSSProperties,
} from "react";

import type { Engine } from "../components/LitModel";
import { ToolHead } from "../components/ToolHead";
import { Button } from "../components/ui/Button";
import { ProgressBar } from "../components/ui/ProgressBar";
import { useProjectChoice } from "../hooks/useProjectChoice";
import { useLighting } from "../state/lighting";
import { formatNumber } from "../utils/format";
import { formatHour, skyOf } from "../utils/lighting";

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
const SKY_NAMES = { day: "día", sunset: "atardecer", night: "noche" };

type Job =
    | { state: "idle" }
    | { state: "rendering"; done: number; total: number }
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

interface RenderPageProps {
    onLighting: () => void;
}

export function RenderPage({ onLighting }: RenderPageProps) {
    const choice = useProjectChoice();
    const projectId = choice.project?.id ?? null;
    const [lighting] = useLighting(projectId);
    const engine = useRef<Engine | null>(null);
    const abort = useRef<AbortController | null>(null);
    const [ready, setReady] = useState(false);
    const [view, setView] = useState<ViewId>("isometric");
    const [projection, setProjection] = useState<ProjectionId>("perspective");
    const [aspect, setAspect] = useState<AspectId>("16:9");
    const [longEdge, setLongEdge] = useState(1920);
    const [quality, setQuality] = useState<QualityId>("standard");
    const [format, setFormat] = useState<FormatId>("png");
    const [job, setJob] = useState<Job>({ state: "idle" });
    const [result, setResult] = useState<Result | null>(null);
    const size = sizeOf(aspect, longEdge);
    const rendering = job.state === "rendering";

    const handleEngine = useCallback((next: Engine | null) => {
        engine.current = next;
        setReady(next !== null);
    }, []);

    useEffect(() => {
        if (ready) {
            engine.current?.setProjection(projection);
        }
    }, [ready, projection]);

    // Leaving the screen, or changing project, stops the render in progress and frees its image.
    useEffect(
        () => () => {
            abort.current?.abort();
        },
        [projectId],
    );

    useEffect(() => {
        setResult(null);
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
        engine.current?.setView(next);
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

            if (blob === null || controller.signal.aborted) {
                setJob({ state: blob === null ? "error" : "cancelled" });
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
            setJob({ state: "idle" });
        } catch {
            setJob({ state: "error" });
        }
    }

    return (
        <>
            <ToolHead
                title="Renderizado"
                meta="Imagen del visor en tiempo real · no es trazado de rayos"
                choice={choice}
            >
                <Button variant="secondary" onClick={onLighting}>
                    Ajustar la luz
                </Button>
            </ToolHead>

            {projectId !== null && (
                <div className="studio">
                    <div className="studio-main">
                        <section className="studio-stage studio-stage-framed" aria-label="Encuadre">
                            <div
                                className="render-frame"
                                style={{ "--ratio": size.width / size.height } as CSSProperties}
                            >
                                <Suspense fallback={<p className="message">Cargando el visor…</p>}>
                                    <LitModel
                                        key={projectId}
                                        projectId={projectId}
                                        lighting={lighting}
                                        onEngine={handleEngine}
                                    />
                                </Suspense>
                            </div>
                            <p className="studio-caption">
                                <strong>Encuadre</strong>
                                <span>Arrastra para girar, rueda para acercar</span>
                                <span>
                                    Luz de las {formatHour(lighting.hour)},{" "}
                                    {SKY_NAMES[skyOf(lighting)]}
                                </span>
                            </p>
                        </section>

                        {result !== null && (
                            <section className="render-result" aria-label="Resultado">
                                <img
                                    src={result.url}
                                    alt={`Render del proyecto a ${result.width} por ${result.height} píxeles`}
                                />
                                <div className="render-result-foot">
                                    <p>
                                        <strong>
                                            {result.width} × {result.height} px
                                        </strong>
                                        <span>
                                            {FORMATS[result.format].label} ·{" "}
                                            {formatBytes(result.bytes)} · generado en{" "}
                                            {formatNumber(Math.round(result.seconds * 10) / 10)} s
                                        </span>
                                    </p>
                                    <a
                                        className="button button-lime"
                                        href={result.url}
                                        download={result.fileName}
                                    >
                                        Descargar
                                    </a>
                                </div>
                            </section>
                        )}
                    </div>

                    <aside className="studio-panel" aria-label="Parámetros del render">
                        <section>
                            <h3>Cámara</h3>
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
                        </section>

                        <section>
                            <h3>Imagen</h3>
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
                                    onChange={(event) => setLongEdge(Number(event.target.value))}
                                >
                                    {LONG_EDGES.map((edge) => {
                                        const option = sizeOf(aspect, edge);

                                        return (
                                            <option key={edge} value={edge}>
                                                {option.width} × {option.height} px
                                            </option>
                                        );
                                    })}
                                </select>
                            </label>
                            <label>
                                Formato de salida
                                <select
                                    value={format}
                                    disabled={rendering}
                                    onChange={(event) => setFormat(event.target.value as FormatId)}
                                >
                                    {(Object.keys(FORMATS) as FormatId[]).map((id) => (
                                        <option key={id} value={id}>
                                            {FORMATS[id].label}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </section>

                        <section>
                            <h3>Calidad</h3>
                            <div className="segmented" role="group" aria-label="Calidad">
                                {(Object.keys(QUALITIES) as QualityId[]).map((id) => (
                                    <button
                                        key={id}
                                        type="button"
                                        className="button-secondary"
                                        aria-pressed={quality === id}
                                        disabled={rendering}
                                        onClick={() => setQuality(id)}
                                    >
                                        {QUALITIES[id].label}
                                    </button>
                                ))}
                            </div>
                            <p className="studio-note">{QUALITIES[quality].note}</p>
                        </section>

                        <section className="render-run" aria-live="polite">
                            {rendering ? (
                                <>
                                    <ProgressBar
                                        label="Progreso del render"
                                        value={job.done / job.total}
                                    />
                                    <p className="studio-note">
                                        Pasada {job.done} de {job.total} ·{" "}
                                        {Math.round((job.done / job.total) * 100)} %
                                    </p>
                                    <Button
                                        variant="secondary"
                                        onClick={() => abort.current?.abort()}
                                    >
                                        Cancelar
                                    </Button>
                                </>
                            ) : (
                                <Button className="button-lime" disabled={!ready} onClick={start}>
                                    {result === null ? "Iniciar render" : "Renderizar de nuevo"}
                                </Button>
                            )}
                            {job.state === "cancelled" && (
                                <p className="studio-note" role="status">
                                    Render cancelado. No se generó ninguna imagen.
                                </p>
                            )}
                            {job.state === "error" && (
                                <p className="message message-error" role="alert">
                                    No se pudo generar la imagen. Prueba con una resolución o una
                                    calidad menor: este dispositivo no pudo dibujar ese tamaño.
                                </p>
                            )}
                        </section>

                        <p className="studio-note">
                            La imagen la dibuja el mismo motor del visor, con sus materiales, la
                            oclusión ambiental y la luz elegida en Iluminación y clima. No hay
                            profundidad de campo ni reflejos trazados.
                        </p>
                    </aside>
                </div>
            )}
        </>
    );
}
