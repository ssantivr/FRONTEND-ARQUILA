import type { Projection } from "../../three/BuildingSceneManager";
import { SAVE_LABELS, type SaveState } from "./labels";

interface StatusBarProps {
    /** Name of the selected element, or the text that says nothing is selected. */
    selection: string;
    camera: string;
    projection: Projection;
    zoom: number;
    saving: SaveState;
    /** What can be done next with the keyboard or the mouse, given what is selected. */
    tip: string;
}

/** The strip along the bottom of the scene: selection, camera, projection, zoom, a tip and saving. */
export function StatusBar({ selection, camera, projection, zoom, saving, tip }: StatusBarProps) {
    return (
        <div className="hud hud-status">
            <div className="hud-status-live" role="status" aria-label="Estado del modelo">
                <span className="hud-readout hud-status-selection">{selection}</span>
                <span className="hud-readout">Cámara {camera.toLowerCase()}</span>
                <span className="hud-readout">
                    {projection === "orthographic" ? "Ortográfica" : "Perspectiva"}
                </span>
                <span className="hud-readout">Zoom {zoom} %</span>
                <span className={`hud-readout hud-save hud-save-${saving}`}>
                    {SAVE_LABELS[saving]}
                </span>
            </div>
            {/* Outside the live region: a screen reader would otherwise read it on every change. */}
            <span className="hud-readout hud-tip">{tip}</span>
        </div>
    );
}
