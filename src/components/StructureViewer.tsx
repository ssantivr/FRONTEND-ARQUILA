import { useEffect, useRef, useState } from "react";

import {
    createStructureViewer,
    elementKey,
    isSpace,
    type LayerName,
    type Layers,
    type StructureViewer as Viewer,
    type ViewName,
} from "../three/structureViewer";
import type { Structure, StructureElement } from "../types/api";
import { formatNumber } from "../utils/format";

interface Level {
    planId: number;
    title: string;
    base: number;
    elements: StructureElement[];
}

const KIND_LABELS: Record<StructureElement["kind"], string> = {
    room: "Cuarto",
    volume: "Volumen sin cuartos",
    column: "Columna",
    beam: "Viga",
    wall: "Muro",
};

const VIEWS: { id: ViewName; label: string }[] = [
    { id: "isometric", label: "Isométrica" },
    { id: "front", label: "Frontal" },
    { id: "side", label: "Lateral" },
    { id: "top", label: "Superior" },
];

const LAYERS: { id: LayerName; label: string }[] = [
    { id: "rooms", label: "Cuartos" },
    { id: "roof", label: "Techo" },
    { id: "environment", label: "Árboles" },
    { id: "grid", label: "Cuadrícula" },
];

const ALL_LAYERS: Layers = { rooms: true, roof: true, environment: true, grid: true };
const ZOOM_STEP = 1.25;

function groupByLevel(elements: StructureElement[]): Level[] {
    const levels = new Map<number, Level>();

    for (const element of elements) {
        const level = levels.get(element.plan_id);

        if (level === undefined) {
            levels.set(element.plan_id, {
                planId: element.plan_id,
                title: element.plan_title,
                base: element.base_m,
                elements: [element],
            });
        } else {
            level.base = Math.min(level.base, element.base_m);
            level.elements.push(element);
        }
    }

    return [...levels.values()].sort((a, b) => a.base - b.base);
}

function itemLabel(element: StructureElement): string {
    if (element.kind === "volume") {
        return "Volumen del nivel";
    }

    return isSpace(element) ? element.name : `${KIND_LABELS[element.kind]} · ${element.name}`;
}

export function StructureViewer({ structure }: { structure: Structure }) {
    const stage = useRef<HTMLDivElement>(null);
    const container = useRef<HTMLDivElement>(null);
    const viewer = useRef<Viewer | null>(null);
    const [unsupported, setUnsupported] = useState(false);
    const [selectedKey, setSelectedKey] = useState<string | null>(null);
    const [layers, setLayers] = useState(ALL_LAYERS);
    const [view, setView] = useState<ViewName>("isometric");
    const [zoom, setZoom] = useState(100);
    const elements: StructureElement[] = [...structure.rooms, ...structure.components];
    const selected = elements.find((element) => elementKey(element) === selectedKey) ?? null;

    useEffect(() => {
        if (container.current === null) {
            return;
        }

        try {
            viewer.current = createStructureViewer(container.current, {
                onSelect: setSelectedKey,
                onZoom: setZoom,
            });
        } catch {
            setUnsupported(true);
            return;
        }

        return () => {
            viewer.current?.dispose();
            viewer.current = null;
        };
    }, []);

    useEffect(() => {
        viewer.current?.show(structure);
    }, [structure]);

    useEffect(() => {
        viewer.current?.select(selectedKey);
    }, [selectedKey, structure]);

    useEffect(() => {
        viewer.current?.setLayers(layers);
    }, [layers]);

    function chooseView(next: ViewName) {
        setView(next);
        viewer.current?.setView(next);
    }

    function toggleFullscreen() {
        if (document.fullscreenElement === null) {
            stage.current?.requestFullscreen().catch(() => undefined);
        } else {
            document.exitFullscreen().catch(() => undefined);
        }
    }

    if (unsupported) {
        return (
            <p className="message message-error" role="alert">
                Este navegador no puede mostrar gráficos 3D (WebGL no está disponible).
            </p>
        );
    }

    return (
        <div className="structure-stage" ref={stage}>
            <div
                ref={container}
                className="structure-viewer"
                role="img"
                aria-label={`Modelo 3D con ${structure.terrains.length} terrenos, ${structure.rooms.length} espacios y ${structure.components.length} componentes estructurales`}
            />
            <div className="hud hud-views" role="group" aria-label="Vista de la cámara">
                {VIEWS.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        className="hud-item"
                        aria-pressed={item.id === view}
                        onClick={() => chooseView(item.id)}
                    >
                        {item.label}
                    </button>
                ))}
                <button
                    type="button"
                    className="hud-item"
                    aria-label="Acercar"
                    onClick={() => viewer.current?.zoomBy(ZOOM_STEP)}
                >
                    +
                </button>
                <button
                    type="button"
                    className="hud-item"
                    aria-label="Alejar"
                    onClick={() => viewer.current?.zoomBy(1 / ZOOM_STEP)}
                >
                    −
                </button>
                <span className="hud-readout">Zoom {zoom} %</span>
            </div>
            <aside className="hud hud-levels" aria-label="Niveles del modelo">
                <h3>Niveles</h3>
                {elements.length === 0 && (
                    <p>Agrega cuartos a un plano, o ponle un nivel numérico, para verlo aquí.</p>
                )}
                {groupByLevel(elements).map((level) => (
                    <section key={level.planId}>
                        <h4>{level.title}</h4>
                        {level.elements.map((element) => {
                            const key = elementKey(element);

                            return (
                                <button
                                    key={key}
                                    type="button"
                                    className="hud-item"
                                    aria-pressed={key === selectedKey}
                                    onClick={() => setSelectedKey(key === selectedKey ? null : key)}
                                >
                                    {itemLabel(element)}
                                </button>
                            );
                        })}
                    </section>
                ))}
            </aside>
            <aside className="hud hud-inspector" aria-live="polite" aria-label="Inspector">
                <h3>Inspector</h3>
                {selected === null ? (
                    <p>Haz clic en un cuarto o en un componente para inspeccionarlo.</p>
                ) : (
                    <dl>
                        <dt>Nombre</dt>
                        <dd>{selected.name}</dd>
                        <dt>Tipo</dt>
                        <dd>{KIND_LABELS[selected.kind]}</dd>
                        <dt>Plano</dt>
                        <dd>{selected.plan_title}</dd>
                        <dt>Nivel</dt>
                        <dd>{selected.level ?? "—"}</dd>
                        <dt>Medidas</dt>
                        <dd>
                            {formatNumber(selected.width_m)} × {formatNumber(selected.depth_m)} ×{" "}
                            {formatNumber(selected.height_m)} m
                        </dd>
                        {isSpace(selected) && (
                            <>
                                <dt>Área</dt>
                                <dd>{formatNumber(selected.width_m * selected.depth_m)} m²</dd>
                            </>
                        )}
                        <dt>Volumen</dt>
                        <dd>
                            {formatNumber(selected.width_m * selected.depth_m * selected.height_m)}{" "}
                            m³
                        </dd>
                        <dt>Altura de la base</dt>
                        <dd>+{formatNumber(selected.base_m)} m</dd>
                    </dl>
                )}
            </aside>
            <div className="hud hud-toolbar">
                <button type="button" className="hud-item" onClick={() => chooseView(view)}>
                    Restablecer vista
                </button>
                <button type="button" className="hud-item" onClick={toggleFullscreen}>
                    Pantalla completa
                </button>
                {LAYERS.map((layer) => (
                    <label key={layer.id} className="checkbox">
                        <input
                            type="checkbox"
                            checked={layers[layer.id]}
                            onChange={(event) =>
                                setLayers({ ...layers, [layer.id]: event.target.checked })
                            }
                        />
                        {layer.label}
                    </label>
                ))}
            </div>
        </div>
    );
}
