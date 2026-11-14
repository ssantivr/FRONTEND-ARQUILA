import { Vector3, type Box3, type Plane } from "three";

import { CUT_DISABLED_M } from "../engine/ExperienceEngine";

/** The axis a section cuts across: x and z are vertical cuts (elevations), y a floor plan. */
export type SectionAxis = "x" | "y" | "z";

export const SECTION_AXES: readonly SectionAxis[] = ["y", "x", "z"];

// A clipping plane keeps the points where normal · p + constant >= 0. With the normal pointing
// back along the axis, it keeps everything below `constant` on that axis and cuts the rest away.
const NORMALS: Record<SectionAxis, Vector3> = {
    x: new Vector3(-1, 0, 0),
    y: new Vector3(0, -1, 0),
    z: new Vector3(0, 0, -1),
};

/**
 * Where the section plane sits: `fraction` of the way through `range` along `axis`, in metres.
 * A fraction of 1 or more, or nothing to cut, puts the plane out of reach so nothing is cut.
 */
export function sectionConstant(axis: SectionAxis, fraction: number, range: Box3): number {
    if (fraction >= 1 || range.isEmpty()) {
        return CUT_DISABLED_M;
    }

    const low = range.min[axis];
    const high = range.max[axis];

    return low + (high - low) * Math.max(0, fraction);
}

/** Points the plane across `axis` and moves it to `fraction` of `range`. */
export function placeSection(plane: Plane, axis: SectionAxis, fraction: number, range: Box3): void {
    plane.normal.copy(NORMALS[axis]);
    plane.constant = sectionConstant(axis, fraction, range);
}
