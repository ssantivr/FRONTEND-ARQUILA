import type { Projection, ViewName } from "../../three/BuildingSceneManager";
import { Icon } from "../Icon";
import { VIEWS } from "./labels";

const ZOOM_STEP = 1.25;

interface ViewBarProps {
    view: ViewName;
    onView: (view: ViewName) => void;
    zoom: number;
    /** Multiplies the zoom: above 1 moves the camera closer, below 1 moves it away. */
    onZoom: (factor: number) => void;
    projection: Projection;
    onProjection: (projection: Projection) => void;
}

/** The camera controls of the bottom bar: the four views, the zoom and the projection. */
export function ViewBar({ view, onView, zoom, onZoom, projection, onProjection }: ViewBarProps) {
    return (
        <div className="hud hud-views" role="group" aria-label="Vista de la cámara">
            {VIEWS.map((item) => (
                <button
                    key={item.id}
                    type="button"
                    className="hud-item"
                    aria-pressed={item.id === view}
                    title={`Vista ${item.label.toLowerCase()}`}
                    onClick={() => onView(item.id)}
                >
                    <Icon name={item.icon} />
                    <span className="hud-label">{item.label}</span>
                </button>
            ))}
            <span className="hud-divider" aria-hidden="true" />
            <button
                type="button"
                className="hud-item"
                aria-label="Alejar"
                title="Alejar"
                onClick={() => onZoom(1 / ZOOM_STEP)}
            >
                <Icon name="minus" />
            </button>
            <span className="hud-readout">{zoom} %</span>
            <button
                type="button"
                className="hud-item"
                aria-label="Acercar"
                title="Acercar"
                onClick={() => onZoom(ZOOM_STEP)}
            >
                <Icon name="plus" />
            </button>
            <span className="hud-divider" aria-hidden="true" />
            <button
                type="button"
                className="hud-item"
                aria-pressed={projection === "orthographic"}
                title="Cambia entre la cámara en perspectiva y la ortográfica, sin fuga"
                onClick={() =>
                    onProjection(projection === "orthographic" ? "perspective" : "orthographic")
                }
            >
                <Icon name="parallel" />
                <span className="hud-label">Ortográfica</span>
            </button>
        </div>
    );
}
