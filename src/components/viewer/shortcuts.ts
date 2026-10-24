/** «⌘K» on a Mac and «Ctrl K» everywhere else. */
export const COMMANDS_KEY = /Mac|iPhone|iPad/.test(globalThis.navigator?.platform ?? "")
    ? "⌘K"
    : "Ctrl K";

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
    { keys: COMMANDS_KEY.split(" "), action: "Abrir la paleta de comandos" },
    { keys: ["/"], action: "Buscar proyectos" },
];

const TEXT_INPUTS = ["text", "search", "email", "password", "number", "url", "tel", "date"];

/**
 * True when a key must not act as a shortcut: with Ctrl, Alt or Cmd held, while a key repeats,
 * while the user is writing in a field, or inside a window. A checkbox or a slider does not
 * block them: after ticking a layer the keys of the viewer keep working.
 */
export function shortcutsBlocked(event: KeyboardEvent): boolean {
    if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) {
        return true;
    }

    const target = event.target;

    if (!(target instanceof HTMLElement)) {
        return false;
    }

    const writing =
        target.isContentEditable ||
        ["TEXTAREA", "SELECT"].includes(target.tagName) ||
        (target instanceof HTMLInputElement && TEXT_INPUTS.includes(target.type));

    return writing || target.closest("[role='dialog']") !== null;
}

/**
 * True when the focus is in the viewer or nowhere in particular. One-key shortcuts only answer
 * then, so they never fire while the user works in another part of the page (WCAG 2.1.4).
 */
export function focusAllowsShortcuts(stage: HTMLElement | null): boolean {
    const focused = document.activeElement;

    return focused === null || focused === document.body || stage?.contains(focused) === true;
}
