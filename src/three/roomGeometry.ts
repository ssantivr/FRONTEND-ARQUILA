import { BoxGeometry, BufferGeometry, EdgesGeometry, ExtrudeGeometry, Float32BufferAttribute, Path, Shape } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import type { StructureElement } from "../types/api";
import type { Opening, Side } from "../utils/openings";

const MAX_WALL_M = 0.2;
const SLAB_M = 0.15;
const FRAME_M = 0.06;
const FRAME_REVEAL_M = 0.04;
const PANE_M = 0.02;
const DOOR_LEAF_M = 0.05;
const THRESHOLD_M = 0.02;

const SIDE_ROTATION: Record<Side, number> = {
    front: 0,
    right: Math.PI / 2,
    back: Math.PI,
    left: -Math.PI / 2,
};

const SIDES = Object.keys(SIDE_ROTATION) as Side[];

export interface RoomShell {
    /** Walls with their openings cut out, plus the floor and ceiling slabs. */
    walls: BufferGeometry;
    /** Line segments of the outer corners and of each opening. */
    lines: BufferGeometry;
    glass: BufferGeometry | null;
    frames: BufferGeometry | null;
    door: BufferGeometry | null;
}

interface Hole {
    opening: Opening;
    x: number;
    bottom: number;
    top: number;
}

/** Moves a geometry built facing +Z onto the given side of the room. */
function onSide(geometry: BufferGeometry, side: Side, x: number, y: number, z: number): BufferGeometry {
    geometry.translate(x, y, z);
    geometry.rotateY(SIDE_ROTATION[side]);

    return geometry;
}

function box(width: number, height: number, depth: number): BufferGeometry {
    return new BoxGeometry(width, height, depth).toNonIndexed();
}

function merged(parts: BufferGeometry[]): BufferGeometry | null {
    if (parts.length === 0) {
        return null;
    }

    const geometry = mergeGeometries(parts, false);

    for (const part of parts) {
        part.dispose();
    }

    return geometry;
}

function rectangle(x: number, bottom: number, top: number, width: number): number[] {
    const left = x - width / 2;
    const right = x + width / 2;

    return [
        left, bottom, 0, right, bottom, 0,
        right, bottom, 0, right, top, 0,
        right, top, 0, left, top, 0,
        left, top, 0, left, bottom, 0,
    ];
}

/** Rewrites the UVs in metres, so a texture keeps its scale on faces of any size. */
export function useMetricUVs(geometry: BufferGeometry): BufferGeometry {
    const position = geometry.getAttribute("position");
    const normal = geometry.getAttribute("normal");
    const uv: number[] = [];

    for (let index = 0; index < position.count; index += 1) {
        const x = position.getX(index);
        const y = position.getY(index);
        const z = position.getZ(index);
        const nx = Math.abs(normal.getX(index));
        const ny = Math.abs(normal.getY(index));
        const nz = Math.abs(normal.getZ(index));

        if (ny >= nx && ny >= nz) {
            uv.push(x, z);
        } else if (nx >= nz) {
            uv.push(z, y);
        } else {
            uv.push(x, y);
        }
    }

    geometry.setAttribute("uv", new Float32BufferAttribute(uv, 2));

    return geometry;
}

export function buildRoomShell(element: StructureElement, openings: Opening[]): RoomShell {
    const { width_m: width, depth_m: depth, height_m: height } = element;
    const wall = Math.min(MAX_WALL_M, Math.min(width, depth) / 4);
    const floor = -height / 2;
    const walls: BufferGeometry[] = [];
    const glass: BufferGeometry[] = [];
    const frames: BufferGeometry[] = [];
    const doors: BufferGeometry[] = [];
    const outline = new EdgesGeometry(new BoxGeometry(width, height, depth));
    const lines: number[] = [...outline.getAttribute("position").array];

    outline.dispose();

    for (const side of SIDES) {
        const across = side === "front" || side === "back";
        const mirrored = side === "back" || side === "left";
        const sideLength = across ? width : depth;
        const wallLength = across ? width : depth - 2 * wall;
        const face = (across ? depth : width) / 2;
        const middle = face - wall / 2;
        const holes: Hole[] = openings
            .filter((opening) => opening.side === side)
            .map((opening) => {
                const along = opening.center - sideLength / 2;

                return {
                    opening,
                    x: mirrored ? -along : along,
                    bottom: floor + Math.max(opening.sill, THRESHOLD_M),
                    top: floor + opening.sill + opening.height,
                };
            });

        const shape = new Shape();
        shape.moveTo(-wallLength / 2, floor);
        shape.lineTo(wallLength / 2, floor);
        shape.lineTo(wallLength / 2, -floor);
        shape.lineTo(-wallLength / 2, -floor);
        shape.closePath();

        for (const hole of holes) {
            const { x, bottom, top, opening } = hole;
            const path = new Path();

            path.moveTo(x - opening.width / 2, bottom);
            path.lineTo(x + opening.width / 2, bottom);
            path.lineTo(x + opening.width / 2, top);
            path.lineTo(x - opening.width / 2, top);
            path.closePath();
            shape.holes.push(path);

            const center = (bottom + top) / 2;
            const tall = top - bottom;
            const frameDepth = wall + FRAME_REVEAL_M;
            const jamb = opening.width / 2 - FRAME_M / 2;
            const isDoor = opening.kind === "door";

            frames.push(
                onSide(box(FRAME_M, tall, frameDepth), side, x - jamb, center, middle),
                onSide(box(FRAME_M, tall, frameDepth), side, x + jamb, center, middle),
                onSide(box(opening.width, FRAME_M, frameDepth), side, x, top - FRAME_M / 2, middle),
            );

            if (isDoor) {
                doors.push(
                    onSide(
                        box(opening.width - 2 * FRAME_M, tall - FRAME_M, DOOR_LEAF_M),
                        side,
                        x,
                        center - FRAME_M / 2,
                        middle,
                    ),
                );
            } else {
                frames.push(
                    onSide(box(opening.width, FRAME_M, frameDepth), side, x, bottom + FRAME_M / 2, middle),
                );
                glass.push(
                    onSide(
                        box(opening.width - 2 * FRAME_M, tall - 2 * FRAME_M, PANE_M),
                        side,
                        x,
                        center,
                        middle,
                    ),
                );
            }

            const segments = new BufferGeometry();
            segments.setAttribute(
                "position",
                new Float32BufferAttribute(rectangle(x, bottom, top, opening.width), 3),
            );
            onSide(segments, side, 0, 0, face);
            lines.push(...segments.getAttribute("position").array);
            segments.dispose();
        }

        walls.push(
            onSide(
                new ExtrudeGeometry(shape, { depth: wall, bevelEnabled: false }),
                side,
                0,
                0,
                face - wall,
            ),
        );
    }

    const slabWidth = width - 2 * wall;
    const slabDepth = depth - 2 * wall;

    walls.push(
        box(slabWidth, SLAB_M, slabDepth).translate(0, floor + SLAB_M / 2, 0),
        box(slabWidth, SLAB_M, slabDepth).translate(0, -floor - SLAB_M / 2, 0),
    );

    const lineGeometry = new BufferGeometry();
    lineGeometry.setAttribute("position", new Float32BufferAttribute(lines, 3));

    return {
        walls: merged(walls) as BufferGeometry,
        lines: lineGeometry,
        glass: merged(glass),
        frames: merged(frames),
        door: merged(doors),
    };
}
