import { useEffect, useRef, useState } from "react";

import {
    createStructureViewer,
    roomKey,
    type StructureViewer as Viewer,
} from "../three/structureViewer";
import type { Structure, StructureRoom } from "../types/api";
import { formatNumber } from "../utils/format";

interface Level {
    planId: number;
    title: string;
    rooms: StructureRoom[];
}

function groupByLevel(rooms: StructureRoom[]): Level[] {
    const levels: Level[] = [];

    for (const room of rooms) {
        const last = levels[levels.length - 1];

        if (last !== undefined && last.planId === room.plan_id) {
            last.rooms.push(room);
        } else {
            levels.push({ planId: room.plan_id, title: room.plan_title, rooms: [room] });
        }
    }

    return levels;
}

export function StructureViewer({ structure }: { structure: Structure }) {
    const container = useRef<HTMLDivElement>(null);
    const viewer = useRef<Viewer | null>(null);
    const [unsupported, setUnsupported] = useState(false);
    const [selectedKey, setSelectedKey] = useState<string | null>(null);
    const selected = structure.rooms.find((room) => roomKey(room) === selectedKey) ?? null;

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
                aria-label={`Modelo 3D con ${structure.terrains.length} terrenos y ${structure.rooms.length} espacios`}
            />
            <aside className="hud hud-levels" aria-label="Niveles del modelo">
                <h3>Niveles</h3>
                {structure.rooms.length === 0 && <p>Registra un plano para ver niveles.</p>}
                {groupByLevel(structure.rooms).map((level) => (
                    <section key={level.planId}>
                        <h4>{level.title}</h4>
                        {level.rooms.map((room) => {
                            const key = roomKey(room);

                            return (
                                <button
                                    key={key}
                                    type="button"
                                    className="hud-item"
                                    aria-pressed={key === selectedKey}
                                    onClick={() => setSelectedKey(key === selectedKey ? null : key)}
                                >
                                    {room.kind === "room" ? room.name : "Volumen del nivel"}
                                </button>
                            );
                        })}
                    </section>
                ))}
            </aside>
            <aside className="hud hud-inspector" aria-live="polite" aria-label="Inspector">
                <h3>Inspector</h3>
                {selected === null ? (
                    <p>Haz clic en un cuarto para inspeccionarlo.</p>
                ) : (
                    <dl>
                        <dt>Nombre</dt>
                        <dd>{selected.name}</dd>
                        <dt>Tipo</dt>
                        <dd>{selected.kind === "room" ? "Cuarto" : "Volumen sin cuartos"}</dd>
                        <dt>Plano</dt>
                        <dd>{selected.plan_title}</dd>
                        <dt>Nivel</dt>
                        <dd>{selected.level ?? "—"}</dd>
                        <dt>Medidas</dt>
                        <dd>
                            {formatNumber(selected.width_m)} × {formatNumber(selected.depth_m)} ×{" "}
                            {formatNumber(selected.height_m)} m
                        </dd>
                        <dt>Área</dt>
                        <dd>{formatNumber(selected.width_m * selected.depth_m)} m²</dd>
                        <dt>Volumen</dt>
                        <dd>
                            {formatNumber(selected.width_m * selected.depth_m * selected.height_m)}{" "}
                            m³
                        </dd>
                        <dt>Altura del piso</dt>
                        <dd>+{formatNumber(selected.base_m)} m</dd>
                    </dl>
                )}
            </aside>
            <div className="hud hud-toolbar">
                <button type="button" className="hud-item" onClick={() => viewer.current?.resetView()}>
                    Restablecer vista
                </button>
                <span>Arrastra para girar · rueda para acercar · botón derecho para desplazar</span>
            </div>
        </div>
    );
}
