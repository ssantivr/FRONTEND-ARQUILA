import { useRef, type KeyboardEvent } from "react";

import type { IconName } from "../Icon";
import { IconButton } from "./IconButton";

import styles from "./CameraControls.module.css";

export type CameraView = "front" | "side" | "top" | "iso";
export type CameraProjection = "perspective" | "orthographic";

const VIEWS: { view: CameraView; label: string; icon: IconName }[] = [
    { view: "iso", label: "Vista isométrica", icon: "parallel" },
    { view: "front", label: "Vista frontal", icon: "viewFront" },
    { view: "side", label: "Vista lateral", icon: "viewSide" },
    { view: "top", label: "Vista superior", icon: "viewTop" },
];

export type CameraAction = CameraView | "projection" | "zoomIn" | "zoomOut" | "frame";

interface CameraControlsProps {
    /** The view the camera is in, if it is one of the four; `null` after orbiting freely. */
    view?: CameraView | null;
    onView?: (view: CameraView) => void;
    projection?: CameraProjection;
    onProjection?: (projection: CameraProjection) => void;
    /** Frames the selection, or the whole model when nothing is selected. */
    onFrame?: () => void;
    onZoomIn?: () => void;
    onZoomOut?: () => void;
    fullscreen?: boolean;
    onFullscreen?: () => void;
    /** `scene` floats over the 3D view (dark in both themes); `surface` sits in a panel. */
    tone?: "scene" | "surface";
    orientation?: "horizontal" | "vertical";
    /** The keys the screen really answers to; only those are shown in the tooltips. */
    shortcuts?: Partial<Record<CameraAction, string>>;
}

/**
 * The camera toolbar of a 3D view. A control is only drawn when the view gives it something to
 * do: there are no buttons that do nothing. It is one tab stop; the arrows move inside it.
 */
export function CameraControls({
    view = null,
    onView,
    projection,
    onProjection,
    onFrame,
    onZoomIn,
    onZoomOut,
    fullscreen = false,
    onFullscreen,
    tone = "scene",
    orientation = "horizontal",
    shortcuts = {},
}: CameraControlsProps) {
    const bar = useRef<HTMLDivElement>(null);
    const buttonTone = tone === "scene" ? "scene" : "ghost";
    const side = orientation === "vertical" ? "right" : "top";

    function onKey(event: KeyboardEvent<HTMLDivElement>) {
        const forward = orientation === "vertical" ? "ArrowDown" : "ArrowRight";
        const back = orientation === "vertical" ? "ArrowUp" : "ArrowLeft";

        if (event.key !== forward && event.key !== back) {
            return;
        }

        const buttons = [...(bar.current?.querySelectorAll<HTMLButtonElement>("button") ?? [])];
        const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
        const next =
            buttons[(index + (event.key === forward ? 1 : -1) + buttons.length) % buttons.length];

        event.preventDefault();
        next?.focus();
    }

    return (
        <div
            ref={bar}
            role="toolbar"
            aria-label="Cámara"
            aria-orientation={orientation}
            className={`${styles.bar} ${styles[tone]} ${styles[orientation]}`}
            onKeyDown={onKey}
        >
            {onView !== undefined &&
                VIEWS.map((item) => (
                    <IconButton
                        key={item.view}
                        label={item.label}
                        icon={item.icon}
                        shortcut={shortcuts[item.view]}
                        tone={buttonTone}
                        size="sm"
                        tooltipSide={side}
                        aria-pressed={view === item.view}
                        onClick={() => onView(item.view)}
                    />
                ))}
            {onProjection !== undefined && projection !== undefined && (
                <>
                    <span className={styles.divider} aria-hidden="true" />
                    <IconButton
                        label={
                            projection === "orthographic"
                                ? "Proyección ortográfica (pulsa para perspectiva)"
                                : "Proyección en perspectiva (pulsa para ortográfica)"
                        }
                        icon={projection === "orthographic" ? "parallel" : "orbit"}
                        shortcut={shortcuts.projection}
                        tone={buttonTone}
                        size="sm"
                        tooltipSide={side}
                        onClick={() =>
                            onProjection(
                                projection === "orthographic" ? "perspective" : "orthographic",
                            )
                        }
                    />
                </>
            )}
            {(onZoomIn !== undefined || onZoomOut !== undefined || onFrame !== undefined) && (
                <span className={styles.divider} aria-hidden="true" />
            )}
            {onZoomIn !== undefined && (
                <IconButton
                    label="Acercar"
                    icon="zoomIn"
                    shortcut={shortcuts.zoomIn}
                    tone={buttonTone}
                    size="sm"
                    tooltipSide={side}
                    onClick={onZoomIn}
                />
            )}
            {onZoomOut !== undefined && (
                <IconButton
                    label="Alejar"
                    icon="zoomOut"
                    shortcut={shortcuts.zoomOut}
                    tone={buttonTone}
                    size="sm"
                    tooltipSide={side}
                    onClick={onZoomOut}
                />
            )}
            {onFrame !== undefined && (
                <IconButton
                    label="Encuadrar"
                    icon="focus"
                    shortcut={shortcuts.frame}
                    tone={buttonTone}
                    size="sm"
                    tooltipSide={side}
                    onClick={onFrame}
                />
            )}
            {onFullscreen !== undefined && (
                <IconButton
                    label={fullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
                    icon={fullscreen ? "exitFullscreen" : "fullscreen"}
                    tone={buttonTone}
                    size="sm"
                    tooltipSide={side}
                    onClick={onFullscreen}
                />
            )}
        </div>
    );
}
