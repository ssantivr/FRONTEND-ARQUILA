import type { RefObject } from "react";

import type { useEditHistory } from "../../hooks/useEditHistory";
import { roomsApi, structureApi } from "../../services/api";
import { appState } from "../../state/appState";
import { elementKey } from "../../three/BuildingSceneManager";
import type { RoofKind, StructureElement, StructureRoom } from "../../types/api";
import {
    surfaceOf,
    type ElementSurfaces,
    type SurfaceMaterialId,
} from "../../utils/surfaceMaterials";
import { itemLabel } from "./labels";
import { geometryOf, type RoomGeometry } from "./TransformPanel";

interface EditContext {
    projectId: number;
    history: ReturnType<typeof useEditHistory>;
    surfaces: ElementSurfaces;
    roof: RoofKind;
    /** Asks the host to load the model again after a room was moved or resized. */
    reload: RefObject<(() => void) | undefined>;
}

/**
 * The edits of the model that go through the history, so each one can be undone: the material of
 * an element, the roof, and the place and size of a room.
 */
export function modelEdits({ projectId, history, surfaces, roof, reload }: EditContext) {
    /** The model changes at once; if the server says no, it goes back and the error is shown. */
    function putSurface(
        element: StructureElement,
        surface: SurfaceMaterialId,
        back: SurfaceMaterialId,
    ) {
        return async () => {
            appState.setSurface(projectId, elementKey(element), surface);

            try {
                await structureApi.setSurface(projectId, element, surface);
            } catch (reason) {
                appState.setSurface(projectId, elementKey(element), back);
                throw reason;
            }
        };
    }

    function putRoof(kind: RoofKind, back: RoofKind) {
        return async () => {
            appState.setRoof(projectId, kind);

            try {
                await structureApi.setRoof(projectId, kind);
            } catch (reason) {
                appState.setRoof(projectId, back);
                throw reason;
            }
        };
    }

    /** Moves or resizes a room with PATCH /rooms/{id}; the model is then loaded again. */
    function putRoom(room: StructureRoom, geometry: RoomGeometry) {
        return async () => {
            await roomsApi.update(room.id, geometry);
            reload.current?.();
        };
    }

    return {
        changeSurface(element: StructureElement, surface: SurfaceMaterialId) {
            const previous = surfaceOf(surfaces, elementKey(element), element.kind);

            void history.run({
                label: `material de ${itemLabel(element)}`,
                apply: putSurface(element, surface, previous),
                revert: putSurface(element, previous, surface),
            });
        },
        changeRoof(next: RoofKind) {
            void history.run({
                label: "cubierta",
                apply: putRoof(next, roof),
                revert: putRoof(roof, next),
            });
        },
        changeRoom(room: StructureRoom, next: RoomGeometry, label: string) {
            const before = geometryOf(room);

            void history.run({ label, apply: putRoom(room, next), revert: putRoom(room, before) });
        },
    };
}
