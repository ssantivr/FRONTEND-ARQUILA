import { BoxGeometry, ExtrudeGeometry, Group, Mesh, Shape } from "three";
import type { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";

import type { Structure, StructureTerrain } from "../../types/api";
import { rectOf, unionOf } from "../../utils/openings";
import { SLAB_COLOR, patterned, standard } from "../materials/pbr";
import type { Pattern } from "../patterns";
import { applyMetricUVs } from "../roomGeometry";

export const SLAB_THICKNESS_M = 0.3;
export const SURFACE_GAP_M = 0.02;

// A plinth thinner than this would only flicker against the floor slab.
const PLINTH_MIN_M = 0.05;

export function insidePolygon(x: number, y: number, outline: StructureTerrain["outline"]): boolean {
    let inside = false;

    outline.forEach((point, index) => {
        const previous = outline[(index + outline.length - 1) % outline.length];
        const crosses =
            point.y_m > y !== previous.y_m > y &&
            x <
                ((previous.x_m - point.x_m) * (y - point.y_m)) / (previous.y_m - point.y_m) +
                    point.x_m;

        if (crosses) {
            inside = !inside;
        }
    });

    return inside;
}

/**
 * Height of the ground of a terrain at a depth of the plan (`y`, in metres from the front of the
 * lot). The terrain is a plane that slopes along its depth, as in the terrain diagrams, and it
 * meets level 0 at `pivot`.
 */
export function groundHeight(terrain: StructureTerrain, pivot: number, y: number): number {
    return ((y - pivot) * (terrain.slope_percent ?? 0)) / 100;
}

/**
 * The depth at which the ground meets level 0. With a building it is its back wall: the floor
 * is level, the ground falls away under it towards the front (where a plinth fills the gap) and
 * rises behind it, so the building is never buried. Without one it is the front of the lots.
 */
export function slopePivot(structure: Structure): number {
    const built = structure.rooms.map(rectOf);

    if (built.length > 0) {
        return unionOf(built).maxY;
    }

    const depths = structure.terrains.flatMap((terrain) =>
        terrain.outline.map((point) => point.y_m),
    );

    return depths.length === 0 ? 0 : Math.min(...depths);
}

/** How far below level 0 the lowest corner of the lots is; 0 on flat ground. */
export function lowestGround(structure: Structure, pivot: number): number {
    const heights = structure.terrains.flatMap((terrain) =>
        terrain.outline.map((point) => groundHeight(terrain, pivot, point.y_m)),
    );

    return Math.max(0, -Math.min(0, ...heights));
}

/**
 * The plinth that holds the ground floor level where the ground falls away under it: under each
 * room of the lowest level, a block from the floor down to the ground at the front of that room.
 * One block per room, so a floor plan that is not a rectangle gets no plinth where it has no
 * room. `null` on flat ground.
 */
export function buildPlinth(structure: Structure, pivot: number): Group | null {
    const terrain = structure.terrains[0];
    const lowest = Math.min(...structure.rooms.map((room) => room.base_m));
    const plinth = new Group();

    if (terrain === undefined) {
        return null;
    }

    for (const area of structure.rooms.filter((room) => room.base_m === lowest).map(rectOf)) {
        const depth = -groundHeight(terrain, pivot, area.minY);

        if (depth >= PLINTH_MIN_M) {
            const block = new Mesh(
                new BoxGeometry(area.maxX - area.minX, depth, area.maxY - area.minY),
                standard(SLAB_COLOR, 0.9),
            );

            block.position.set(
                (area.minX + area.maxX) / 2,
                -depth / 2,
                -(area.minY + area.maxY) / 2,
            );
            block.castShadow = true;
            block.receiveShadow = true;
            plinth.add(block);
        }
    }

    return plinth.children.length === 0 ? null : plinth;
}

export function buildTerrain(terrain: StructureTerrain, grass: Pattern, pivot: number): Mesh {
    const shape = new Shape();

    terrain.outline.forEach((point, index) => {
        if (index === 0) {
            shape.moveTo(point.x_m, point.y_m);
        } else {
            shape.lineTo(point.x_m, point.y_m);
        }
    });

    const geometry = new ExtrudeGeometry(shape, { depth: SLAB_THICKNESS_M, bevelEnabled: false });
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(0, -SLAB_THICKNESS_M, 0);

    // The slab is sheared, not rotated: every vertex keeps its place on the plan and only its
    // height changes with its depth, so the outline still matches the plans.
    if ((terrain.slope_percent ?? 0) !== 0) {
        const position = geometry.getAttribute("position");

        for (let index = 0; index < position.count; index += 1) {
            position.setY(
                index,
                position.getY(index) + groundHeight(terrain, pivot, -position.getZ(index)),
            );
        }

        position.needsUpdate = true;
        geometry.computeVertexNormals();
    }

    applyMetricUVs(geometry);

    const mesh = new Mesh(geometry, patterned(grass, 0.95));
    mesh.receiveShadow = true;

    return mesh;
}

export function buildLotEdges(
    terrains: StructureTerrain[],
    material: LineMaterial,
    pivot: number,
): Group {
    const edges = new Group();

    for (const terrain of terrains) {
        const { outline } = terrain;
        const positions = outline.flatMap((point, index) => {
            const next = outline[(index + 1) % outline.length];

            return [
                point.x_m,
                SURFACE_GAP_M + groundHeight(terrain, pivot, point.y_m),
                -point.y_m,
                next.x_m,
                SURFACE_GAP_M + groundHeight(terrain, pivot, next.y_m),
                -next.y_m,
            ];
        });

        edges.add(new LineSegments2(new LineSegmentsGeometry().setPositions(positions), material));
    }

    return edges;
}
