import { useEffect, useState, type RefObject } from "react";

import type {
    RenderMode,
    SectionAxis,
    StructureViewer as Viewer,
} from "../../three/BuildingSceneManager";
import type { Measurement } from "../../utils/measure";

interface ToolContext {
    /** The interior view and the exploded levels change distances, so measuring waits. */
    inside: boolean;
    explode: number;
    /** The key of the selected room, or null when the selection is not a room. */
    roomKey: string | null;
    moving: boolean;
    snap: number;
}

/**
 * The tools that change how the model is drawn or what a click on it does: the move and resize
 * gizmo, the measure tool, the render mode and the axis of the section cut. Each one is kept in
 * the engine as it changes.
 */
export function useViewerTools(viewer: RefObject<Viewer | null>, context: ToolContext) {
    const { inside, explode, roomKey, moving, snap } = context;
    const [scaling, setScaling] = useState(false);
    const [measuring, setMeasuring] = useState(false);
    const [measurement, setMeasurement] = useState<Measurement | null>(null);
    const [renderMode, setRenderMode] = useState<RenderMode>("solid");
    const [sectionAxis, setSectionAxis] = useState<SectionAxis>("y");

    const measureUnavailable = inside
        ? "Sal de la vista interior para medir"
        : explode > 0
          ? "Quita el despiece para medir: separa los niveles y cambiaría las distancias"
          : undefined;
    const gizmoKey = (moving || scaling) && !measuring ? roomKey : null;

    useEffect(() => {
        viewer.current?.setRenderMode(renderMode);
    }, [viewer, renderMode]);

    useEffect(() => {
        viewer.current?.setSectionAxis(sectionAxis);
    }, [viewer, sectionAxis]);

    useEffect(() => {
        viewer.current?.setMeasuring(measuring && measureUnavailable === undefined);
    }, [viewer, measuring, measureUnavailable]);

    useEffect(() => {
        viewer.current?.setGizmo(gizmoKey, scaling ? "scale" : "translate", snap);
    }, [viewer, gizmoKey, scaling, snap]);

    return {
        scaling,
        setScaling,
        measuring,
        setMeasuring,
        measurement,
        setMeasurement,
        measureUnavailable,
        renderMode,
        setRenderMode,
        sectionAxis,
        setSectionAxis,
    };
}
