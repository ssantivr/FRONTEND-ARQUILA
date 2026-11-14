import {
    BoxGeometry,
    EdgesGeometry,
    ExtrudeGeometry,
    Group,
    InstancedMesh,
    LineBasicMaterial,
    LineSegments,
    Matrix4,
    Mesh,
    MeshStandardMaterial,
    Shape,
    type BufferGeometry,
    type Material,
    type Object3D,
    type Plane,
} from "three";

import type {
    RoofKind,
    SpatialElement,
    SpatialLayer,
    Structure,
    StructureElement,
    StructureRoom,
    WorkStatus,
} from "../../types/api";
import { elementKey, rectOf, roofShape, unionOf, type Opening } from "../../utils/openings";
import {
    DOOR_COLOR,
    EDGE_COLOR,
    CYBER_ACCENT,
    SLAB_COLOR,
    VIOLET_ACCENT,
    buildMaterial,
    patterned,
    standard,
    type SceneKit,
} from "../materials/pbr";
import type { Pattern } from "../patterns";
import { applyMetricUVs, buildFlatRoof, buildRoomShell } from "../roomGeometry";
import { SURFACE_GAP_M, groundHeight, insidePolygon } from "../terrain/terrainBuilder";
import { buildTrees, type TreeSpot } from "../vegetation";

const DEMOLITION_COLOR = 0xff5c7a;
const OVERLAY_COLORS: Record<SpatialLayer, number> = {
    structure: CYBER_ACCENT,
    installations: VIOLET_ACCENT,
    finishes: 0xffc857,
};
const OVERLAY_OPACITY: Record<WorkStatus, number> = {
    existing: 0.85,
    planned: 0.4,
    demolition: 0.3,
};
const OVERLAY_GLOW = 0.7;
const OVERLAY_RENDER_ORDER = 2;
const TREE_SPACING_M = 4.5;

export type ElementMesh = Mesh<BufferGeometry, MeshStandardMaterial>;
export type OverlayMesh = Mesh<BoxGeometry, MeshStandardMaterial>;

export function overlayKey(id: number): string {
    return `spatial-${id}`;
}

export function isSpace(element: StructureElement): boolean {
    return element.kind === "room" || element.kind === "volume";
}

function buildSlab(geometry: BufferGeometry): Mesh {
    const slab = new Mesh(geometry, standard(SLAB_COLOR, 0.85));

    slab.castShadow = true;
    slab.receiveShadow = true;
    slab.add(
        new LineSegments(
            new EdgesGeometry(geometry),
            new LineBasicMaterial({ color: EDGE_COLOR, transparent: true, opacity: 0.6 }),
        ),
    );

    return slab;
}

export function buildElement(
    element: StructureElement,
    openings: Opening[],
    kit: Pick<SceneKit, "glass" | "frame">,
): ElementMesh {
    const solid = new BoxGeometry(element.width_m, element.height_m, element.depth_m);
    const shell = element.kind === "room" ? buildRoomShell(element, openings) : null;
    const geometry = applyMetricUVs(shell === null ? solid : shell.walls);
    const lines = shell === null ? new EdgesGeometry(solid) : shell.lines;
    const mesh: ElementMesh = new Mesh(geometry, buildMaterial(element));

    if (shell !== null) {
        solid.dispose();

        mesh.add(buildSlab(shell.band));

        if (shell.frames !== null) {
            const frames = new Mesh(shell.frames, kit.frame);
            frames.castShadow = true;
            mesh.add(frames);
        }

        if (shell.door !== null) {
            const door = new Mesh(shell.door, standard(DOOR_COLOR, 0.7));
            door.castShadow = true;
            mesh.add(door);
        }

        if (shell.glass !== null) {
            mesh.add(new Mesh(shell.glass, kit.glass));
        }
    }

    mesh.position.set(element.x_m, element.base_m + element.height_m / 2, -element.y_m);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.key = elementKey(element);
    mesh.userData.space = isSpace(element);
    mesh.userData.kind = element.kind;

    const edges = new LineSegments(
        lines,
        new LineBasicMaterial({ color: EDGE_COLOR, transparent: true, opacity: 0.6 }),
    );
    mesh.add(edges);
    mesh.userData.edges = edges.material;
    mesh.userData.lines = lines;

    return mesh;
}

export function buildOverlay(item: SpatialElement): OverlayMesh {
    const color = item.work_status === "demolition" ? DEMOLITION_COLOR : OVERLAY_COLORS[item.layer];
    const geometry = new BoxGeometry(
        item.max_x_m - item.min_x_m,
        item.max_z_m - item.min_z_m,
        item.max_y_m - item.min_y_m,
    );
    const mesh: OverlayMesh = new Mesh(
        geometry,
        new MeshStandardMaterial({
            color,
            emissive: color,
            emissiveIntensity: OVERLAY_GLOW,
            roughness: 0.5,
            transparent: true,
            opacity: OVERLAY_OPACITY[item.work_status],
            depthTest: false,
            depthWrite: false,
        }),
    );
    const edges = new LineSegments(
        new EdgesGeometry(geometry),
        new LineBasicMaterial({ color, transparent: true, depthTest: false }),
    );

    mesh.position.set(
        (item.min_x_m + item.max_x_m) / 2,
        (item.min_z_m + item.max_z_m) / 2,
        -(item.min_y_m + item.max_y_m) / 2,
    );
    mesh.renderOrder = OVERLAY_RENDER_ORDER;
    edges.renderOrder = OVERLAY_RENDER_ORDER;
    mesh.add(edges);
    mesh.userData.key = overlayKey(item.id);
    mesh.userData.layer = item.layer;
    mesh.userData.room = item.room_id === null ? null : `room-${item.room_id}`;

    return mesh;
}

export function buildRoof(rooms: StructureRoom[], kind: RoofKind, tiles: Pattern): Mesh | null {
    const shape = roofShape(rooms, kind);

    if (shape === null) {
        return null;
    }

    const center = [
        (shape.area.minX + shape.area.maxX) / 2,
        shape.eaves + SURFACE_GAP_M,
        -(shape.area.minY + shape.area.maxY) / 2,
    ] as const;

    if (shape.flat) {
        const slab = buildSlab(buildFlatRoof(shape));

        slab.position.set(...center);

        return slab;
    }

    const profile = new Shape();
    profile.moveTo(-shape.span / 2, 0);
    profile.lineTo(shape.span / 2, 0);
    profile.lineTo(0, shape.rise);
    profile.closePath();

    const geometry = new ExtrudeGeometry(profile, { depth: shape.length, bevelEnabled: false });
    geometry.translate(0, 0, -shape.length / 2);

    if (shape.alongX) {
        geometry.rotateY(Math.PI / 2);
    }

    applyMetricUVs(geometry);

    // The courses of tiles must run along the ridge. With the ridge along z they would run down
    // the slope instead, so the two texture coordinates swap places.
    if (!shape.alongX) {
        const uv = geometry.getAttribute("uv");

        for (let index = 0; index < uv.count; index += 1) {
            uv.setXY(index, uv.getY(index), uv.getX(index));
        }
    }

    const mesh = new Mesh(geometry, patterned(tiles, 0.82));
    mesh.position.set(...center);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.add(
        new LineSegments(
            new EdgesGeometry(geometry),
            new LineBasicMaterial({ color: EDGE_COLOR, transparent: true, opacity: 0.45 }),
        ),
    );

    return mesh;
}

export function buildEnvironment(structure: Structure, pivot: number): Group {
    const planted: TreeSpot[] = [];
    const heights: number[] = [];
    const blocked = [...structure.rooms, ...structure.components].map(rectOf);

    for (const terrain of structure.terrains) {
        const lot = unionOf(
            terrain.outline.map((point) => ({
                minX: point.x_m,
                maxX: point.x_m,
                minY: point.y_m,
                maxY: point.y_m,
            })),
        );
        const spots: [number, number][] = [];

        for (let x = lot.minX + 1.5; x <= lot.maxX - 1.5; x += TREE_SPACING_M) {
            spots.push([x, lot.maxY - 1.5]);
        }

        for (let y = lot.minY + 1.5; y < lot.maxY - 4; y += TREE_SPACING_M) {
            spots.push([lot.maxX - 1.5, y]);
        }

        for (const [x, y] of spots) {
            const clear = blocked.every(
                (rect) =>
                    x < rect.minX - 1.5 ||
                    x > rect.maxX + 1.5 ||
                    y < rect.minY - 1.5 ||
                    y > rect.maxY + 1.5,
            );

            if (clear && insidePolygon(x, y, terrain.outline)) {
                planted.push({ x, y });
                heights.push(groundHeight(terrain, pivot, y));
            }
        }
    }

    const trees = buildTrees(planted);

    // The trees are planted on level ground by their builder; each one is then moved to the
    // height of the slope where it stands.
    if (heights.some((height) => height !== 0)) {
        const placement = new Matrix4();

        trees.traverse((child) => {
            if (child instanceof InstancedMesh) {
                heights.forEach((height, index) => {
                    child.getMatrixAt(index, placement);
                    placement.elements[13] += height;
                    child.setMatrixAt(index, placement);
                });
                child.instanceMatrix.needsUpdate = true;
            }
        });
    }

    return trees;
}

export function clip(root: Object3D, planes: Plane[]): void {
    root.traverse((child) => {
        if (child instanceof Mesh || child instanceof LineSegments) {
            const materials: Material[] = Array.isArray(child.material)
                ? child.material
                : [child.material];

            for (const material of materials) {
                material.clippingPlanes = planes;
            }
        }
    });
}
