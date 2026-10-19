import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AsyncStatus } from "../components/AsyncStatus";
import { Icon } from "../components/Icon";
import { PlanThumb } from "../components/PlanThumb";
import { ProjectPicker } from "../components/ProjectPicker";
import { useAsync } from "../hooks/useAsync";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { useProjectChoice } from "../hooks/useProjectChoice";
import { structureApi, walkthroughApi } from "../services/api";
import { useReduceMotion } from "../state/motion";
import type { StructureViewer as Engine } from "../three/BuildingSceneManager";
import type { Structure, StructureRoom } from "../types/api";
import { formatNumber } from "../utils/format";
import { elementKey } from "../utils/openings";
import {
    ISOLATION_CUT_PERCENT,
    TOUR_START_AZIMUTH,
    TOUR_TURN,
    buildStops,
    tourRooms,
    type TourStop,
} from "../utils/tour";

const StructureViewer = lazy(() =>
    import("../components/StructureViewer").then((module) => ({
        default: module.StructureViewer,
    })),
);
const InteriorViewer = lazy(() =>
    import("../components/InteriorViewer").then((module) => ({ default: module.InteriorViewer })),
);

type Mode = "model" | "light" | "sample";
type CameraMode = "orbit" | "inside";

const MODES: { id: Mode; label: string }[] = [
    { id: "model", label: "Modelo 3D" },
    { id: "light", label: "Versión ligera" },
    { id: "sample", label: "Escena de muestra" },
];

const SPEEDS = [0.5, 1, 1.5, 2];

/** Where the walkthrough is: the whole model, one of its stops, or a room picked by name. */
type Place = { kind: "start" } | { kind: "stop"; index: number } | { kind: "room"; roomId: number };

function canDraw3d(): boolean {
    try {
        const probe = document.createElement("canvas");
        const context = probe.getContext("webgl2") ?? probe.getContext("webgl");

        context?.getExtension("WEBGL_lose_context")?.loseContext();

        return context !== null;
    } catch {
        return false;
    }
}

/** A guess, not a measure: few cores or little memory make a 3D scene stutter. */
function looksSlow(): boolean {
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;

    return navigator.hardwareConcurrency <= 2 || (memory !== undefined && memory <= 2);
}

function seconds(ms: number): string {
    return `${formatNumber(Math.round(ms / 100) / 10)} s`;
}

interface TourPageProps {
    onOpenProject: (projectId: number) => void;
}

/**
 * A walkthrough of the chosen project: its saved stops (or its rooms, when it has none) visited
 * one after another in the 3D model, by hand or on their own. A light version without 3D lists
 * the stops on a small plan, and the loft stays as a sample scene.
 */
export function TourPage({ onOpenProject }: TourPageProps) {
    const choice = useProjectChoice();
    const project = choice.project;
    const [webgl] = useState(canDraw3d);
    const [mode, setMode] = useState<Mode>(() => (webgl ? "model" : "light"));

    return (
        <section className="workspace-page" aria-label="Recorridos virtuales">
            <div className="workspace-head">
                <AsyncStatus
                    loading={choice.loading}
                    error={choice.error}
                    onRetry={choice.reload}
                    isEmpty={choice.projects.length === 0}
                    emptyTitle="Sin proyectos"
                    emptyText="Todavía no tienes proyectos. Crea el primero desde Proyectos."
                />
                {project !== null && mode !== "sample" && (
                    <>
                        <ProjectPicker
                            projects={choice.projects}
                            value={project.id}
                            onChange={choice.choose}
                        />
                        <button
                            type="button"
                            className="button-secondary"
                            onClick={() => onOpenProject(project.id)}
                        >
                            Editar en el proyecto
                        </button>
                    </>
                )}
                <div
                    className="segmented workspace-head-end"
                    role="group"
                    aria-label="Qué recorrer"
                >
                    {MODES.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            className="button-secondary"
                            aria-pressed={mode === item.id}
                            disabled={item.id === "model" && !webgl}
                            title={
                                item.id === "model" && !webgl
                                    ? "Este navegador no puede dibujar 3D (WebGL no está disponible)"
                                    : undefined
                            }
                            onClick={() => setMode(item.id)}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            </div>

            {!webgl && mode === "light" && (
                <p className="message" role="status">
                    Este navegador no puede dibujar 3D, así que el recorrido se muestra como una
                    lista de paradas sobre la planta.
                </p>
            )}
            {webgl && mode === "model" && looksSlow() && (
                <p className="message" role="status">
                    Este equipo tiene pocos recursos y la escena 3D puede ir a saltos.{" "}
                    <button type="button" className="studio-link" onClick={() => setMode("light")}>
                        Usar la versión ligera
                    </button>
                </p>
            )}

            {mode === "sample" && (
                <Suspense fallback={<p className="message">Cargando la escena…</p>}>
                    <InteriorViewer />
                </Suspense>
            )}
            {mode !== "sample" && project !== null && (
                <Tour key={project.id} projectId={project.id} light={mode === "light"} />
            )}
        </section>
    );
}

function Tour({ projectId, light }: { projectId: number; light: boolean }) {
    const structure = useAsync(() => structureApi.get(projectId), [projectId]);
    const walkthrough = useAsync(() => walkthroughApi.get(projectId), [projectId]);
    const rooms = useMemo(() => tourRooms(structure.data?.rooms ?? []), [structure.data]);
    const { stops, saved } = useMemo(
        () => buildStops(rooms, walkthrough.data?.steps),
        [rooms, walkthrough.data],
    );
    const loading = structure.loading || walkthrough.loading;

    if (loading || structure.error !== null || structure.data === null || rooms.length === 0) {
        return (
            <AsyncStatus
                loading={loading}
                error={structure.error}
                onRetry={structure.reload}
                isEmpty={rooms.length === 0}
                emptyTitle="Nada que recorrer"
                emptyText="El proyecto todavía no tiene cuartos. Agrégalos en la pestaña Modelo 3D del proyecto."
            />
        );
    }

    return light ? (
        <LightTour rooms={rooms} stops={stops} saved={saved} />
    ) : (
        <ModelTour
            structure={structure.data}
            rooms={rooms}
            stops={stops}
            saved={saved}
            stepsError={walkthrough.error}
        />
    );
}

function StopsNote({ saved, error }: { saved: boolean; error?: string | null }) {
    if (error !== null && error !== undefined) {
        return (
            <p className="studio-note">
                No se pudieron leer las paradas guardadas ({error}). Se recorren los cuartos en
                orden.
            </p>
        );
    }

    return (
        <p className="studio-note">
            {saved
                ? "Paradas guardadas en el proyecto, con su texto y su duración."
                : "El proyecto no tiene paradas guardadas: se recorren sus cuartos, de la planta baja hacia arriba."}
        </p>
    );
}

interface ModelTourProps {
    structure: Structure;
    rooms: StructureRoom[];
    stops: TourStop[];
    saved: boolean;
    stepsError: string | null;
}

function ModelTour({ structure, rooms, stops, saved, stepsError }: ModelTourProps) {
    const engine = useRef<Engine | null>(null);
    const stage = useRef<HTMLDivElement>(null);
    const [ready, setReady] = useState(false);
    const [place, setPlace] = useState<Place>({ kind: "start" });
    const [playing, setPlaying] = useState(false);
    const [speed, setSpeed] = useState(1);
    const [camera, setCamera] = useState<CameraMode>("orbit");
    const [panelOpen, setPanelOpen] = useState(true);
    const systemReduced = useMediaQuery("(prefers-reduced-motion: reduce)");
    const appReduced = useReduceMotion();
    const reduced = systemReduced || appReduced;
    const index = place.kind === "stop" ? place.index : -1;
    const stop = index === -1 ? null : stops[index];
    const roomId = place.kind === "room" ? place.roomId : (stop?.roomId ?? null);
    const room = rooms.find((item) => item.id === roomId) ?? null;

    const handleEngine = useCallback((next: Engine | null) => {
        engine.current = next;
        setReady(next !== null);
    }, []);

    /** Points the camera at a room: around it from outside, or from inside at eye height. */
    function show(target: StructureRoom, at: number, cut: number, pose: TourStop["camera"]) {
        const current = engine.current;
        const key = elementKey(target);

        if (current === null) {
            return;
        }

        current.isolate(key);
        current.setCutaway(cut / 100);

        if (camera === "inside") {
            current.enterRoom(key, pose ?? undefined);
        } else {
            current.enterRoom(null);
            current.focus(key, TOUR_START_AZIMUTH + Math.max(at, 0) * TOUR_TURN);
        }
    }

    function goTo(next: number) {
        const target = stops[next];
        const targetRoom = rooms.find((item) => item.id === target.roomId);

        if (targetRoom !== undefined) {
            setPlace({ kind: "stop", index: next });
            show(targetRoom, next, target.cut, target.camera);
        }
    }

    function goToRoom(id: number) {
        const at = stops.findIndex((item) => item.roomId === id);

        if (at !== -1) {
            goTo(at);
            return;
        }

        const target = rooms.find((item) => item.id === id);

        if (target !== undefined) {
            setPlaying(false);
            setPlace({ kind: "room", roomId: id });
            show(target, rooms.indexOf(target), ISOLATION_CUT_PERCENT, null);
        }
    }

    function goHome() {
        setPlaying(false);
        setPlace({ kind: "start" });
        engine.current?.isolate(null);
        engine.current?.setCutaway(1);
        engine.current?.enterRoom(null);
        engine.current?.setView("isometric");
    }

    function step(delta: number) {
        goTo(index === -1 ? 0 : (index + delta + stops.length) % stops.length);
    }

    function togglePlay() {
        if (playing) {
            setPlaying(false);
            return;
        }

        setPlaying(true);

        if (index === -1 || index === stops.length - 1) {
            goTo(0);
        }
    }

    // The automatic walkthrough moves on when the stop's time is up and stops after the last.
    const advance = useRef(goTo);
    advance.current = goTo;

    useEffect(() => {
        if (!playing || index === -1) {
            return;
        }

        const timer = window.setTimeout(() => {
            if (index === stops.length - 1) {
                setPlaying(false);
            } else {
                advance.current(index + 1);
            }
        }, stops[index].durationMs / speed);

        return () => window.clearTimeout(timer);
    }, [playing, index, speed, stops]);

    // Asked for less movement, nothing moves the camera on its own.
    useEffect(() => {
        if (reduced) {
            setPlaying(false);
        }
    }, [reduced]);

    // A new camera mode applies to where the walkthrough already is.
    const reshow = useRef(() => undefined as void);
    reshow.current = () => {
        if (stop !== null && room !== null) {
            show(room, index, stop.cut, stop.camera);
        } else if (room !== null) {
            show(room, rooms.indexOf(room), ISOLATION_CUT_PERCENT, null);
        }
    };

    useEffect(() => {
        reshow.current();
    }, [camera]);

    function toggleFullscreen() {
        if (document.fullscreenElement === null) {
            stage.current?.requestFullscreen().catch(() => undefined);
        } else {
            document.exitFullscreen().catch(() => undefined);
        }
    }

    const levels = [...new Set(rooms.map((item) => item.plan_title))];

    return (
        <div
            className={
                panelOpen ? "studio studio-workspace" : "studio studio-workspace studio-wide"
            }
        >
            <div className="tour-stage" ref={stage}>
                <section className="studio-stage tour-scene" aria-label="Escena del recorrido">
                    <Suspense fallback={<p className="message">Cargando el visor…</p>}>
                        <StructureViewer structure={structure} preview onEngine={handleEngine} />
                    </Suspense>
                    <div className="tour-caption" role="status">
                        {place.kind === "start" && (
                            <p>
                                <strong>Vista inicial</strong>
                                <span>
                                    {stops.length} paradas · pulsa Reproducir o elige una parada
                                </span>
                            </p>
                        )}
                        {stop !== null && (
                            <p>
                                <strong>
                                    {index + 1} de {stops.length} · {stop.title}
                                </strong>
                                {stop.description !== null && <span>{stop.description}</span>}
                            </p>
                        )}
                        {place.kind === "room" && room !== null && (
                            <p>
                                <strong>{room.name}</strong>
                                <span>Estancia fuera de las paradas</span>
                            </p>
                        )}
                    </div>
                </section>

                <div className="tour-bar" role="toolbar" aria-label="Controles del recorrido">
                    <button
                        type="button"
                        className="button-secondary icon-button"
                        disabled={!ready}
                        onClick={goHome}
                    >
                        <Icon name="home" />
                        Vista inicial
                    </button>
                    <button
                        type="button"
                        className="button-secondary"
                        disabled={!ready}
                        aria-label="Parada anterior"
                        onClick={() => {
                            setPlaying(false);
                            step(-1);
                        }}
                    >
                        ‹ Anterior
                    </button>
                    <button
                        type="button"
                        className="button-lime tour-play"
                        disabled={!ready || reduced}
                        aria-pressed={playing}
                        aria-describedby={reduced ? "tour-reduced" : undefined}
                        onClick={togglePlay}
                    >
                        {playing ? "Pausa" : "Reproducir"}
                    </button>
                    <button
                        type="button"
                        className="button-secondary"
                        disabled={!ready}
                        aria-label="Parada siguiente"
                        onClick={() => {
                            setPlaying(false);
                            step(1);
                        }}
                    >
                        Siguiente ›
                    </button>
                    {playing && stop !== null && (
                        <span
                            key={`${index}-${speed}`}
                            className="tour-timer"
                            style={{ animationDuration: `${stop.durationMs / speed}ms` }}
                            aria-hidden="true"
                        />
                    )}
                    <span className="tour-bar-end">
                        <button
                            type="button"
                            className="button-secondary icon-button"
                            aria-pressed={panelOpen}
                            onClick={() => setPanelOpen(!panelOpen)}
                        >
                            <Icon name="panels" />
                            Paradas
                        </button>
                        <button
                            type="button"
                            className="button-secondary icon-button"
                            onClick={toggleFullscreen}
                        >
                            <Icon name="focus" />
                            Pantalla completa
                        </button>
                    </span>
                </div>
                {reduced && (
                    <p className="studio-note tour-reduced" id="tour-reduced">
                        Pediste reducir el movimiento: no hay recorrido automático. Usa Anterior y
                        Siguiente; la cámara salta sin animarse.
                    </p>
                )}
            </div>

            {panelOpen && (
                <aside className="studio-panel" aria-label="Paradas del recorrido">
                    <section>
                        <h3>Paradas</h3>
                        <StopsNote saved={saved} error={stepsError} />
                        <ol className="tour-stops">
                            {stops.map((item, at) => (
                                <li key={`${item.key}-${at}`}>
                                    <button
                                        type="button"
                                        className="tour-stop"
                                        aria-current={at === index ? "step" : undefined}
                                        disabled={!ready}
                                        onClick={() => {
                                            setPlaying(false);
                                            goTo(at);
                                        }}
                                    >
                                        <PlanThumb rooms={rooms} roomId={item.roomId} />
                                        <span>
                                            <strong>
                                                {at + 1}. {item.title}
                                            </strong>
                                            <span className="numeric">
                                                {seconds(item.durationMs)}
                                            </span>
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ol>
                    </section>

                    <section>
                        <h3>Estancias</h3>
                        <label>
                            Ir a
                            <select
                                value={roomId ?? ""}
                                disabled={!ready}
                                onChange={(event) => goToRoom(Number(event.target.value))}
                            >
                                <option value="" disabled>
                                    Elige una estancia
                                </option>
                                {levels.map((level) => (
                                    <optgroup key={level} label={level}>
                                        {rooms
                                            .filter((item) => item.plan_title === level)
                                            .map((item) => (
                                                <option key={item.id} value={item.id}>
                                                    {item.name}
                                                </option>
                                            ))}
                                    </optgroup>
                                ))}
                            </select>
                        </label>
                    </section>

                    <section>
                        <h3>Cámara</h3>
                        <div className="segmented" role="group" aria-label="Cámara">
                            <button
                                type="button"
                                className="button-secondary"
                                aria-pressed={camera === "orbit"}
                                onClick={() => setCamera("orbit")}
                            >
                                Órbita
                            </button>
                            <button
                                type="button"
                                className="button-secondary"
                                aria-pressed={camera === "inside"}
                                onClick={() => setCamera("inside")}
                            >
                                Dentro del cuarto
                            </button>
                        </div>
                        <p className="studio-note">
                            {camera === "orbit"
                                ? "Desde fuera, con los muros cortados: arrastra para girar alrededor del cuarto."
                                : "A la altura de los ojos, desde una esquina del cuarto: arrastra para mirar alrededor. No se camina con el teclado."}
                        </p>
                    </section>

                    <section>
                        <h3>Velocidad</h3>
                        <div className="segmented" role="group" aria-label="Velocidad">
                            {SPEEDS.map((value) => (
                                <button
                                    key={value}
                                    type="button"
                                    className="button-secondary"
                                    aria-pressed={speed === value}
                                    disabled={reduced}
                                    onClick={() => setSpeed(value)}
                                >
                                    {formatNumber(value)}×
                                </button>
                            ))}
                        </div>
                        <p className="studio-note">
                            Cada parada dura lo que dice su ficha, dividido por la velocidad.
                        </p>
                    </section>
                </aside>
            )}
        </div>
    );
}

/** The walkthrough without 3D: each stop on a small plan of its level, with its text. */
function LightTour({
    rooms,
    stops,
    saved,
}: {
    rooms: StructureRoom[];
    stops: TourStop[];
    saved: boolean;
}) {
    return (
        <section className="tour-light" aria-label="Recorrido en versión ligera">
            <StopsNote saved={saved} />
            <ol className="tour-light-list">
                {stops.map((item, at) => {
                    const room = rooms.find((candidate) => candidate.id === item.roomId);

                    return (
                        <li key={`${item.key}-${at}`} className="tour-light-item">
                            <PlanThumb rooms={rooms} roomId={item.roomId} />
                            <div>
                                <h3>
                                    {at + 1}. {item.title}
                                </h3>
                                <p className="tour-light-meta">
                                    {room?.name}
                                    {room !== undefined && ` · ${room.plan_title}`} ·{" "}
                                    <span className="numeric">{seconds(item.durationMs)}</span>
                                </p>
                                {item.description !== null && <p>{item.description}</p>}
                            </div>
                        </li>
                    );
                })}
            </ol>
        </section>
    );
}
