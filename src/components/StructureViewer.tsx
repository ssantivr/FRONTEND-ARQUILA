import { useEffect, useRef, useState } from "react";

import {
    createStructureViewer,
    elementKey,
    isSpace,
    type StructureViewer as Viewer,
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
    const container = useRef<HTMLDivElement>(null);
    const viewer = useRef<Viewer | null>(null);
    const [unsupported, setUnsupported] = useState(false);
    const [selectedKey, setSelectedKey] = useState<string | null>(null);
    const [roomsVisible, setRoomsVisible] = useState(true);
    const elements: StructureElement[] = [...structure.rooms, ...structure.components];
    const selected = elements.find((element) => elementKey(element) === selectedKey) ?? null;

    useEffect(() => {
        if (container.current === null) {
            return;
        }

        try {
            viewer.current = createStructureViewer(container.current, setSelectedKey);
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
        viewer.current?.setRoomsVisible(roomsVisible);
    }, [roomsVisible]);

    if (unsupported) {
        return (
            <p className="message message-error" role="alert">
                Este navegador no puede mostrar gráficos 3D (WebGL no está disponible).
            </p>
        );
    }

    return (
        <div className="structure-stage">
            <div
                ref={container}
                className="structure-viewer"
                role="img"
                aria-label={`Modelo 3D con ${structure.terrains.length} terrenos, ${structure.rooms.length} espacios y ${structure.components.length} componentes estructurales`}
            />
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
                <button type="button" className="hud-item" onClick={() => viewer.current?.resetView()}>
                    Restablecer vista
                </button>
                <label className="checkbox">
                    <input
                        type="checkbox"
                        checked={roomsVisible}
                        onChange={(event) => setRoomsVisible(event.target.checked)}
                    />
                    Mostrar cuartos
                </label>
                <span>Arrastra para girar · rueda para acercar · botón derecho para desplazar</span>
            </div>
        </div>
    );
}
