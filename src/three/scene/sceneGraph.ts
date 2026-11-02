import {
    Box3,
    CircleGeometry,
    DoubleSide,
    FrontSide,
    GridHelper,
    Group,
    MathUtils,
    Mesh,
    Vector3,
} from "three";

import { prefersReducedMotion } from "../../state/motion";
import type { RoofKind, SpatialElement, Structure, StructureRoom } from "../../types/api";
import { elementKey, placeOpenings } from "../../utils/openings";
import { disposeObject } from "../dispose";
import type { ExperienceEngine } from "../engine/ExperienceEngine";
import { buildSky } from "../materials/environment";
import { standard, type SceneKit } from "../materials/pbr";
import {
    SLAB_THICKNESS_M,
    buildLotEdges,
    buildPlinth,
    buildTerrain,
    lowestGround,
    slopePivot,
} from "../terrain/terrainBuilder";
import type { SceneContents } from "./contents";
import {
    buildElement,
    buildEnvironment,
    buildOverlay,
    buildRoof,
    clip,
    type ElementMesh,
} from "./elements";
import type { LayerManager } from "./layers";

const SKY_RADIUS_FACTOR = 20;
const GROUND_RADIUS_FACTOR = 8;
const LEVEL_TOLERANCE_M = 0.05;
const EXPLODE_GAP_M = 3.5;
const EXPLODE_RATE = 8;
const EXPLODE_REST = 0.002;
// The first time a model is shown its levels start a quarter apart and settle into place. With
// the damping above that takes about 600 ms, the longest a presentation may last.
const ENTRANCE_EXPLODE = 0.25;
const EYE_HEIGHT_M = 1.6;
const GAZE_HEIGHT_M = 1.2;
const INTERIOR_INSET_M = 0.6;

export type PlanPoint = [number, number, number];

export interface CameraPose {
    position: PlanPoint;
    target: PlanPoint;
}

/** Builds the model and keeps it up to date; `contents` is what it leaves on stage. */
export interface SceneGraph {
    build: (structure: Structure) => void;
    clear: () => void;
    /** Sky, ground and grid, which depend on the size of the model and on the palette. */
    buildBackdrop: () => void;
    setRoof: (roof: RoofKind) => void;
    setOverlays: (items: SpatialElement[]) => void;
    rebuildOverlays: () => void;
    setExplode: (fraction: number) => void;
    /** Moves the levels towards the exploded position; true while they are moving. */
    stepExplode: (elapsedSeconds: number) => boolean;
    enterRoom: (key: string | null, pose?: CameraPose) => void;
    setAsset: (url: string | null, onState: (state: "ready" | "error") => void) => void;
}

export function createSceneGraph(
    contents: SceneContents,
    engine: ExperienceEngine,
    kit: SceneKit,
    layers: LayerManager,
): SceneGraph {
    const { bounds, cutPlanes, rig, scene } = engine;
    let ground: Mesh | null = null;
    let sky: Mesh | null = null;
    let overlayData: SpatialElement[] = [];
    let overlayGroup: Group | null = null;
    let roofKind: RoofKind = "gable";
    let roofRooms: StructureRoom[] = [];
    let explodeTarget = 0;
    let explodeCurrent = 0;
    let entered = false;
    // How far the lowest corner of the lots is under level 0: the ground plane goes below it.
    let groundDrop = 0;
    let assetRequest = 0;

    function buildBackdrop(): void {
        const parent = contents.model;

        if (parent === null) {
            return;
        }

        if (contents.grid !== null) {
            parent.remove(contents.grid);
            disposeObject(contents.grid);
        }

        if (ground !== null) {
            parent.remove(ground);
            disposeObject(ground);
        }

        if (sky !== null) {
            parent.remove(sky);
            disposeObject(sky);
        }

        const { palette } = contents;

        sky = buildSky(palette, bounds.radius * SKY_RADIUS_FACTOR);
        sky.position.set(bounds.center.x, -SLAB_THICKNESS_M, bounds.center.z);

        ground = new Mesh(
            new CircleGeometry(bounds.radius * GROUND_RADIUS_FACTOR, 64),
            standard(palette.ground, 1),
        );
        ground.rotation.x = -Math.PI / 2;
        ground.position.set(
            bounds.center.x,
            -SLAB_THICKNESS_M - 0.08 - groundDrop,
            bounds.center.z,
        );
        ground.receiveShadow = true;

        const grid = new GridHelper(bounds.radius * 6, 60, palette.axis, palette.grid);

        grid.position.set(bounds.center.x, -SLAB_THICKNESS_M - 0.05 - groundDrop, bounds.center.z);
        grid.material.transparent = true;
        grid.material.opacity = palette.gridOpacity;
        grid.material.depthWrite = false;
        contents.grid = grid;
        parent.add(sky, ground, grid);
    }

    function levelAt(height: number): number {
        let level = 0;

        for (const [index, base] of contents.levelBases.entries()) {
            if (height >= base - LEVEL_TOLERANCE_M) {
                level = index;
            }
        }

        return level;
    }

    function applyExplode(): void {
        const lift = EXPLODE_GAP_M * explodeCurrent;
        const { elements, levelBases, overlays, roof } = contents;

        for (const mesh of [...elements, ...overlays]) {
            mesh.position.y =
                (mesh.userData.baseY as number) + (mesh.userData.level as number) * lift;
        }

        if (roof !== null) {
            roof.position.y = (roof.userData.baseY as number) + levelBases.length * lift;
        }

        layers.updateIsolation();
    }

    function placeRoof(): void {
        const { model, roof } = contents;

        if (roof !== null && model !== null) {
            roof.userData.baseY = roof.position.y;
            clip(roof, cutPlanes);
            model.add(roof);
        }
    }

    function rebuildOverlays(): void {
        const { model } = contents;

        if (model === null) {
            return;
        }

        if (overlayGroup !== null) {
            model.remove(overlayGroup);
            disposeObject(overlayGroup);
        }

        contents.overlays = overlayData.map(buildOverlay);
        overlayGroup = new Group();

        for (const [index, mesh] of contents.overlays.entries()) {
            mesh.userData.baseY = mesh.position.y;
            mesh.userData.level = levelAt(overlayData[index].min_z_m);
            overlayGroup.add(mesh);
        }

        model.add(overlayGroup);
        applyExplode();
        layers.apply();
    }

    function buildElements(structure: Structure): ElementMesh[] {
        const openings = placeOpenings(structure.rooms);
        const items = [...structure.rooms, ...structure.components];
        const bases = new Map<number, number>();

        for (const item of items) {
            bases.set(item.plan_id, Math.min(bases.get(item.plan_id) ?? Infinity, item.base_m));
        }

        const plans = [...bases.keys()].sort((a, b) => (bases.get(a) ?? 0) - (bases.get(b) ?? 0));

        contents.levelBases = plans.map((plan) => bases.get(plan) ?? 0);

        return items.map((element) => {
            const mesh = buildElement(element, openings.get(elementKey(element)) ?? [], kit);

            mesh.userData.baseY = mesh.position.y;
            mesh.userData.level = plans.indexOf(element.plan_id);

            return mesh;
        });
    }

    function clear(): void {
        if (contents.asset !== null) {
            contents.asset.removeFromParent();
            disposeObject(contents.asset, { textures: true });
        }

        if (contents.model !== null) {
            scene.remove(contents.model);
            disposeObject(contents.model);
            contents.model = null;
            contents.elements = [];
            contents.overlays = [];
            overlayGroup = null;
            contents.asset = null;
            contents.roof = null;
            contents.environment = null;
            contents.lotEdges = null;
            contents.grid = null;
            ground = null;
            sky = null;
        }
    }

    function build(structure: Structure): void {
        // The entrance plays once per viewer, not each time a room is added and the model rebuilt.
        if (!entered) {
            entered = true;

            if (!prefersReducedMotion()) {
                explodeCurrent = Math.max(explodeCurrent, ENTRANCE_EXPLODE);
            }
        }

        contents.elements = buildElements(structure);
        roofRooms = structure.rooms;
        contents.roof = buildRoof(roofRooms, roofKind, kit.patterns.roof);
        // Every terrain slopes about the same line, so the ground is continuous between lots.
        const pivot = slopePivot(structure);
        const plinth = buildPlinth(structure, pivot);
        const model = new Group();

        groundDrop = lowestGround(structure, pivot);
        contents.environment = buildEnvironment(structure, pivot);
        contents.lotEdges = buildLotEdges(structure.terrains, kit.lotEdge, pivot);
        contents.model = model;
        model.add(
            ...structure.terrains.map((terrain) =>
                buildTerrain(terrain, kit.patterns.grass, pivot),
            ),
            ...contents.elements,
            contents.environment,
        );

        if (plinth !== null) {
            model.add(plinth);
        }

        for (const mesh of contents.elements) {
            clip(mesh, cutPlanes);
        }

        placeRoof();

        new Box3().setFromObject(model).getBoundingSphere(bounds);
        bounds.radius = Math.max(bounds.radius, 1);

        buildBackdrop();
        model.add(contents.lotEdges);
        scene.add(model);
    }

    function setRoof(next: RoofKind): void {
        if (next === roofKind) {
            return;
        }

        roofKind = next;

        if (contents.model === null) {
            return;
        }

        if (contents.roof !== null) {
            contents.model.remove(contents.roof);
            disposeObject(contents.roof);
        }

        contents.roof = buildRoof(roofRooms, roofKind, kit.patterns.roof);
        placeRoof();
        applyExplode();
        layers.apply();
    }

    function stepExplode(elapsed: number): boolean {
        if (explodeCurrent === explodeTarget) {
            return false;
        }

        const settled =
            prefersReducedMotion() || Math.abs(explodeTarget - explodeCurrent) < EXPLODE_REST;

        explodeCurrent = settled
            ? explodeTarget
            : MathUtils.damp(explodeCurrent, explodeTarget, EXPLODE_RATE, elapsed);
        applyExplode();

        return true;
    }

    function enterRoom(key: string | null, pose?: CameraPose): void {
        const room = contents.elements.find(
            (item) => item.userData.key === key && item.userData.space === true,
        );

        // Walls are drawn from outside only; seen from inside they need both faces.
        for (const mesh of contents.elements) {
            const side = mesh === room ? DoubleSide : FrontSide;

            if (mesh.material.side !== side) {
                mesh.material.side = side;
                mesh.material.needsUpdate = true;
            }
        }

        if (room === undefined) {
            return;
        }

        const box = new Box3().setFromObject(room);
        const lift = room.position.y - (room.userData.baseY as number);
        const inset = Math.min(
            INTERIOR_INSET_M,
            (box.max.x - box.min.x) / 4,
            (box.max.z - box.min.z) / 4,
        );
        const place = ([x, y, z]: PlanPoint) => new Vector3(x, z + lift, -y);

        rig.lookFrom(
            pose === undefined
                ? new Vector3(box.min.x + inset, box.min.y + EYE_HEIGHT_M, box.max.z - inset)
                : place(pose.position),
            pose === undefined
                ? new Vector3(box.max.x - inset, box.min.y + GAZE_HEIGHT_M, box.min.z + inset)
                : place(pose.target),
        );
    }

    function setAsset(url: string | null, onState: (state: "ready" | "error") => void): void {
        const request = ++assetRequest;

        if (contents.asset !== null) {
            contents.asset.removeFromParent();
            disposeObject(contents.asset, { textures: true });
            contents.asset = null;
        }

        if (url === null) {
            return;
        }

        // The loader is only downloaded when a room actually has a model to show.
        import("three/examples/jsm/loaders/GLTFLoader.js")
            .then(({ GLTFLoader }) => new GLTFLoader().setWithCredentials(true).loadAsync(url))
            .then((gltf) => {
                if (request !== assetRequest || contents.model === null) {
                    disposeObject(gltf.scene, { textures: true });
                    return;
                }

                contents.asset = gltf.scene;
                clip(gltf.scene, cutPlanes);
                contents.model.add(gltf.scene);
                engine.invalidate();
                onState("ready");
            })
            .catch(() => {
                if (request === assetRequest) {
                    onState("error");
                }
            });
    }

    return {
        build,
        clear,
        buildBackdrop,
        setRoof,
        setOverlays: (items) => {
            overlayData = items;
            rebuildOverlays();
        },
        rebuildOverlays,
        setExplode: (fraction) => {
            explodeTarget = MathUtils.clamp(fraction, 0, 1);
        },
        stepExplode,
        enterRoom,
        setAsset,
    };
}
