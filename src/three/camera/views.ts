import { Vector3 } from "three";

export type ViewName = "isometric" | "front" | "side" | "top";

export type Projection = "perspective" | "orthographic";

export const VIEW_DIRECTIONS: Record<ViewName, Vector3> = {
    isometric: new Vector3(0.7, 0.6, 1).normalize(),
    front: new Vector3(0, 0.22, 1).normalize(),
    side: new Vector3(1, 0.22, 0).normalize(),
    top: new Vector3(0, 1, 0.001).normalize(),
};
