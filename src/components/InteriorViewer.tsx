import { useEffect, useRef, useState } from "react";

import {
    createInteriorViewer,
    type InteriorViewer as Viewer,
    type ViewpointId,
} from "../three/interior/interiorViewer";

const VIEWPOINTS: { id: ViewpointId; label: string; room: string; level: string }[] = [
    { id: "living", label: "Sala", room: "Sala de Estar", level: "Nivel 2" },
    { id: "mezzanine", label: "Entrepiso", room: "Entrepiso", level: "Nivel 3" },
    { id: "stairs", label: "Escalera", room: "Escalera", level: "Nivel 2" },
    { id: "window", label: "Ventanal", room: "Ventanal", level: "Nivel 2" },
];

export function InteriorViewer() {
    const stage = useRef<HTMLDivElement>(null);
    const container = useRef<HTMLDivElement>(null);
    const viewer = useRef<Viewer | null>(null);
    const [unsupported, setUnsupported] = useState(false);
    const [viewpoint, setViewpoint] = useState<ViewpointId>("living");
    const [neon, setNeon] = useState(true);
    const current = VIEWPOINTS.find((item) => item.id === viewpoint) ?? VIEWPOINTS[0];

    useEffect(() => {
        if (container.current === null) {
            return;
        }

        try {
            viewer.current = createInteriorViewer(container.current);
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
        viewer.current?.setNeon(neon);
    }, [neon]);

    function chooseViewpoint(next: ViewpointId) {
        setViewpoint(next);
        viewer.current?.setViewpoint(next);
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
        <div className="interior-stage" ref={stage}>
            <div
                ref={container}
                className="interior-viewer"
                role="img"
                aria-label={`Interior del loft de doble altura visto desde ${current.room}, con la ciudad al atardecer tras el ventanal`}
            />
            <header className="interior-bar interior-top">
                <div className="interior-title">
                    <span className="interior-room">{current.room}</span>
                    <span className="interior-level">{current.level}</span>
                </div>
                <span className="interior-badge">Vista 3D Interactiva</span>
            </header>
            <div
                className="interior-bar interior-bottom"
                role="toolbar"
                aria-label="Controles del recorrido"
            >
                <div className="interior-group" role="group" aria-label="Punto de vista">
                    {VIEWPOINTS.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            className="interior-button"
                            aria-pressed={item.id === viewpoint}
                            title={`Ir a ${item.room}`}
                            onClick={() => chooseViewpoint(item.id)}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
                <div className="interior-group">
                    <button
                        type="button"
                        className="interior-button"
                        aria-pressed={neon}
                        title="Enciende o apaga las líneas de luz neón"
                        onClick={() => setNeon((visible) => !visible)}
                    >
                        Luces neón
                    </button>
                    <button
                        type="button"
                        className="interior-button"
                        title="Vuelve al punto de vista elegido"
                        onClick={() => chooseViewpoint(viewpoint)}
                    >
                        Restablecer vista
                    </button>
                    <button type="button" className="interior-button" onClick={toggleFullscreen}>
                        Pantalla completa
                    </button>
                </div>
            </div>
            <p className="interior-hint">Arrastra para mirar · rueda para acercarte</p>
        </div>
    );
}
