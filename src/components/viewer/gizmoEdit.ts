import { elementKey, type GizmoChange } from "../../three/BuildingSceneManager";
import type { StructureRoom } from "../../types/api";
import { snapSize, snapTo, snapToNeighbours } from "../../utils/snap";
import { geometryOf, type RoomGeometry } from "./TransformPanel";

/** What a drag of the gizmo saves: the room, its new geometry and the label of the history. */
export interface GizmoEdit {
    room: StructureRoom;
    next: RoomGeometry;
    label: string;
}

/**
 * Turns a drag of the gizmo into the edit to save. A move lands on the grid, then on the walls of
 * the rooms of the same plan when one is within reach; a resize lands on the grid. `null` when the
 * dragged element is not a room of the model.
 */
export function gizmoEdit(
    change: GizmoChange,
    rooms: readonly StructureRoom[],
    snap: number,
): GizmoEdit | null {
    const room = rooms.find((item) => elementKey(item) === change.key);

    if (room === undefined) {
        return null;
    }

    const now = geometryOf(room);

    if (change.mode === "scale") {
        return {
            room,
            next: {
                ...now,
                width_m: snapSize(now.width_m * change.scaleX, snap),
                depth_m: snapSize(now.depth_m * change.scaleY, snap),
            },
            label: `cambiar el tamaño de ${room.name}`,
        };
    }

    const onGrid = {
        ...now,
        x_m: snapTo(now.x_m + change.dxM, snap),
        y_m: snapTo(now.y_m + change.dyM, snap),
    };
    const neighbours = rooms.filter((item) => item.id !== room.id && item.plan_id === room.plan_id);

    return {
        room,
        next: { ...onGrid, ...snapToNeighbours(onGrid, neighbours) },
        label: `mover ${room.name}`,
    };
}
