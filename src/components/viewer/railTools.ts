import type { RailTool } from "./ToolRail";

interface RailState {
    moving: boolean;
    scaling: boolean;
    measuring: boolean;
    /** Why measuring cannot be used now, if it cannot. */
    measureUnavailable: string | undefined;
    roomSelected: boolean;
    somethingSelected: boolean;
    /** The tool stays pressed while what it isolated is what the user is looking at. */
    isolationPressed: boolean;
    roomIsolated: boolean;
    cutActive: boolean;
    inside: boolean;
    onMove: () => void;
    onScale: () => void;
    onMeasure: () => void;
    onFocus: () => void;
    onIsolate: () => void;
    onCut: () => void;
    onInside: () => void;
    onCapture: () => void;
    onHelp: () => void;
}

/** The tools of the vertical bar; each one says why it can't be used, not just that it can't. */
export function railTools(state: RailState): RailTool[] {
    const { roomSelected, somethingSelected, roomIsolated, inside } = state;

    return [
        {
            id: "move",
            label: "Mover cuarto",
            icon: "move",
            shortcut: "M",
            pressed: state.moving && roomSelected,
            unavailable: !roomSelected
                ? "Selecciona un cuarto para moverlo; columnas, vigas y muros se editan en su tabla"
                : undefined,
            onUse: state.onMove,
        },
        {
            id: "scale",
            label: "Cambiar tamaño",
            icon: "scale",
            pressed: state.scaling && roomSelected,
            unavailable: !roomSelected
                ? "Selecciona un cuarto para cambiar su ancho y su fondo con las asas"
                : undefined,
            onUse: state.onScale,
        },
        {
            id: "measure",
            label: "Medir distancia",
            icon: "measure",
            pressed: state.measuring && state.measureUnavailable === undefined,
            unavailable: state.measureUnavailable,
            onUse: state.onMeasure,
        },
        {
            id: "focus",
            label: "Enfocar",
            icon: "focus",
            shortcut: "F",
            unavailable: somethingSelected ? undefined : "Selecciona un elemento para enfocarlo",
            onUse: state.onFocus,
        },
        {
            id: "isolate",
            label: "Aislar cuarto",
            icon: "isolate",
            shortcut: "I",
            pressed: state.isolationPressed,
            unavailable:
                roomSelected || roomIsolated ? undefined : "Selecciona un cuarto para aislarlo",
            onUse: state.onIsolate,
        },
        {
            id: "cut",
            label: "Corte",
            icon: "cut",
            pressed: state.cutActive,
            unavailable: inside ? "Sal de la vista interior para usar el corte" : undefined,
            onUse: state.onCut,
        },
        {
            id: "inside",
            label: "Vista interior",
            icon: "interior",
            pressed: inside,
            unavailable: roomIsolated
                ? undefined
                : "Aísla un cuarto para entrar a la vista interior",
            onUse: state.onInside,
        },
        {
            id: "capture",
            label: "Guardar imagen",
            icon: "download",
            onUse: state.onCapture,
        },
        {
            id: "help",
            label: "Atajos de teclado",
            icon: "keyboard",
            shortcut: "?",
            onUse: state.onHelp,
        },
    ];
}
