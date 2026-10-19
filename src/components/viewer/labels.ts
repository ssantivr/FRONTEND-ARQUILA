import type { IconName } from "../Icon";
import { isSpace, type ViewName } from "../../three/BuildingSceneManager";
import type { StructureElement } from "../../types/api";

export const KIND_LABELS: Record<StructureElement["kind"], string> = {
    room: "Cuarto",
    volume: "Volumen sin cuartos",
    column: "Columna",
    beam: "Viga",
    wall: "Muro",
};

export const VIEWS: { id: ViewName; label: string; icon: IconName }[] = [
    { id: "isometric", label: "Isométrica", icon: "viewer" },
    { id: "front", label: "Frontal", icon: "viewFront" },
    { id: "side", label: "Lateral", icon: "viewSide" },
    { id: "top", label: "Superior", icon: "viewTop" },
];

export const SAVE_LABELS = {
    idle: "Sin cambios pendientes",
    saving: "Guardando…",
    saved: "Cambios guardados",
    error: "Error al guardar",
};

export type SaveState = keyof typeof SAVE_LABELS;

/** The name an element goes by in the tree, the inspector and the status bar. */
export function itemLabel(element: StructureElement): string {
    if (element.kind === "volume") {
        return "Volumen del nivel";
    }

    return isSpace(element) ? element.name : `${KIND_LABELS[element.kind]} · ${element.name}`;
}
