/** The keys of the 3D viewer, in the order the help dialog lists them. */
export const VIEWER_SHORTCUTS: { keys: string[]; action: string }[] = [
    { keys: ["1"], action: "Vista isométrica" },
    { keys: ["2"], action: "Vista frontal" },
    { keys: ["3"], action: "Vista lateral" },
    { keys: ["4"], action: "Vista superior" },
    { keys: ["F"], action: "Enfocar lo seleccionado" },
    { keys: ["I"], action: "Aislar el cuarto seleccionado, o volver a mostrar todo" },
    { keys: ["Esc"], action: "Salir de la vista interior, del cuarto aislado o de la selección" },
    { keys: ["?"], action: "Abrir esta ayuda" },
];

/** The keys that work on every screen. */
export const GLOBAL_SHORTCUTS: { keys: string[]; action: string }[] = [
    { keys: ["Ctrl", "K"], action: "Abrir la paleta de comandos" },
    { keys: ["/"], action: "Buscar proyectos" },
];

/**
 * True while the user is writing or a dialog is open: a letter typed in a field, or a key pressed
 * inside a window, must never trigger a shortcut of the screen behind it.
 */
export function shortcutsBlocked(event: KeyboardEvent): boolean {
    if (event.ctrlKey || event.metaKey || event.altKey) {
        return true;
    }

    const target = event.target;

    return (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
            ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) ||
            target.closest("[role='dialog']") !== null)
    );
}
