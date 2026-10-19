import type { ReactNode } from "react";

import type { SaveState } from "../../state/projectSave";
import { Icon } from "../Icon";
import { SaveIndicator } from "../ui/SaveIndicator";

interface WorkspaceBarProps {
    /** The project being edited; the project tab already shows it in its head, so it may be left out. */
    projectName?: string;
    save: SaveState;
    undoLabel: string | null;
    redoLabel: string | null;
    /** True while a step is on its way: the buttons wait for it. */
    working: boolean;
    onUndo: () => void;
    onRedo: () => void;
    tree: boolean;
    onToggleTree: () => void;
    inspector: boolean;
    onToggleInspector: () => void;
    /** Anything the host adds at the end, such as the help on how the model is built. */
    extra?: ReactNode;
}

/**
 * The top of the 3D workspace: which project, whether the last change was saved, undo and redo of
 * the edits that have a real inverse, and the switches that fold the side panels to give the
 * scene the whole width.
 */
export function WorkspaceBar({
    projectName,
    save,
    undoLabel,
    redoLabel,
    working,
    onUndo,
    onRedo,
    tree,
    onToggleTree,
    inspector,
    onToggleInspector,
    extra,
}: WorkspaceBarProps) {
    return (
        <div className="hud hud-workbar" role="toolbar" aria-label="Espacio de trabajo 3D">
            {projectName !== undefined && (
                <span className="hud-workbar-project" title={projectName}>
                    {projectName}
                </span>
            )}
            <div className="hud-group" role="group" aria-label="Historial">
                <button
                    type="button"
                    className="hud-item"
                    disabled={undoLabel === null || working}
                    aria-keyshortcuts="Control+Z"
                    title={
                        undoLabel === null
                            ? "Nada que deshacer: solo se deshacen los cambios de esta sesión"
                            : `Deshacer: ${undoLabel} (Ctrl+Z)`
                    }
                    onClick={onUndo}
                >
                    <Icon name="undo" />
                    <span className="hud-label">Deshacer</span>
                </button>
                <button
                    type="button"
                    className="hud-item"
                    disabled={redoLabel === null || working}
                    aria-keyshortcuts="Control+Shift+Z Control+Y"
                    title={
                        redoLabel === null ? "Nada que rehacer" : `Rehacer: ${redoLabel} (Ctrl+Y)`
                    }
                    onClick={onRedo}
                >
                    <Icon name="redo" />
                    <span className="hud-label">Rehacer</span>
                </button>
            </div>
            <SaveIndicator state={save} />
            <div className="hud-workbar-end">
                {extra}
                <div className="hud-group" role="group" aria-label="Paneles">
                    <button
                        type="button"
                        className="hud-item"
                        aria-pressed={tree}
                        title="Muestra u oculta el árbol de objetos"
                        onClick={onToggleTree}
                    >
                        <Icon name="rows" />
                        <span className="hud-label">Objetos</span>
                    </button>
                    <button
                        type="button"
                        className="hud-item"
                        aria-pressed={inspector}
                        title="Muestra u oculta el inspector y la escena"
                        onClick={onToggleInspector}
                    >
                        <Icon name="panels" />
                        <span className="hud-label">Inspector</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
