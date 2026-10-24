import type { Projection } from "../../three/BuildingSceneManager";

interface StatusBarProps {
    /** Name of the selected element, or the text that says nothing is selected. */
    selection: string;
    camera: string;
    projection: Projection;
    zoom: number;
    /** What can be done next with the keyboard or the mouse, given what is selected. */
    tip: string;
}

/**
 * The strip along the bottom of the workspace: selection, camera, projection, zoom and a tip.
 * Whether a change was saved is said once, in the workspace bar, for every kind of change.
 */
export function StatusBar({ selection, camera, projection, zoom, tip }: StatusBarProps) {
    return (
        <div className="hud hud-status">
            <div className="hud-status-live" role="status" aria-label="Estado del modelo">
                <span className="hud-readout hud-status-selection">{selection}</span>
                <span className="hud-readout">Cámara {camera.toLowerCase()}</span>
                <span className="hud-readout">
                    {projection === "orthographic" ? "Ortográfica" : "Perspectiva"}
                </span>
                <span className="hud-readout">Zoom {zoom} %</span>
            </div>
            {/* Outside the live region: a screen reader would otherwise read it on every change. */}
            <span className="hud-readout hud-tip">{tip}</span>
        </div>
    );
}
