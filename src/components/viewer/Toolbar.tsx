interface ToolbarProps {
    onReset: () => void;
    onFullscreen: () => void;
    /** The interior run is offered only when the model has rooms to visit. */
    hasStops: boolean;
    touring: boolean;
    onToggleTour: () => void;
    onStep: (delta: number) => void;
    /** What the isolated room is called, or null while the whole model is shown. */
    roomLabel: string | null;
    onShowAll: () => void;
}

/** Actions on the whole view, and the room-by-room run of the interior. The tools that act on the selection live in the vertical `ToolRail`. */
export function Toolbar({
    onReset,
    onFullscreen,
    hasStops,
    touring,
    onToggleTour,
    onStep,
    roomLabel,
    onShowAll,
}: ToolbarProps) {
    return (
        <div className="hud hud-toolbar" role="toolbar" aria-label="Herramientas del modelo">
            <div className="hud-group">
                <button
                    type="button"
                    className="hud-item"
                    data-tip="Vuelve a encuadrar todo el modelo"
                    onClick={onReset}
                >
                    Restablecer vista
                </button>
                <button type="button" className="hud-item" onClick={onFullscreen}>
                    Pantalla completa
                </button>
            </div>
            {hasStops && (
                <div className="hud-group hud-tour" role="group" aria-label="Corrida de interior">
                    <button
                        type="button"
                        className="hud-item"
                        aria-pressed={touring}
                        data-tip="Recorre los cuartos uno por uno, aislando cada uno y mostrando lo que se va a hacer"
                        onClick={onToggleTour}
                    >
                        Corrida de interior
                    </button>
                    <button
                        type="button"
                        className="hud-item"
                        aria-label="Cuarto anterior"
                        onClick={() => onStep(-1)}
                    >
                        ‹
                    </button>
                    <button
                        type="button"
                        className="hud-item"
                        aria-label="Cuarto siguiente"
                        onClick={() => onStep(1)}
                    >
                        ›
                    </button>
                    {roomLabel !== null && (
                        <>
                            <span className="hud-readout">{roomLabel}</span>
                            <button
                                type="button"
                                className="hud-item"
                                data-tip="Vuelve a mostrar todo el modelo"
                                onClick={onShowAll}
                            >
                                Ver todo
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
