import {
    ACESFilmicToneMapping,
    AmbientLight,
    Box3,
    BackSide,
    BoxGeometry,
    BufferAttribute,
    BufferGeometry,
    CircleGeometry,
    Color,
    DataTexture,
    DirectionalLight,
    DoubleSide,
    EdgesGeometry,
    ExtrudeGeometry,
    Fog,
    FrontSide,
    GridHelper,
    Group,
    HemisphereLight,
    InstancedMesh,
    LineBasicMaterial,
    LinearFilter,
    LinearMipmapLinearFilter,
    LineSegments,
    Material,
    MathUtils,
    Matrix4,
    Mesh,
    MeshBasicMaterial,
    MeshPhysicalMaterial,
    MeshStandardMaterial,
    OrthographicCamera,
    Object3D,
    PCFShadowMap,
    PMREMGenerator,
    PerspectiveCamera,
    Plane,
    PointLight,
    Points,
    PointsMaterial,
    Raycaster,
    RepeatWrapping,
    Scene,
    Shape,
    Sphere,
    SphereGeometry,
    Vector2,
    Vector3,
    WebGLRenderer,
} from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";

import { prefersReducedMotion } from "../state/motion";
import type {
    RoofKind,
    SpatialElement,
    SpatialLayer,
    Structure,
    StructureElement,
    StructureRoom,
    StructureTerrain,
    WorkStatus,
} from "../types/api";
import type { ElementColors } from "../utils/elementColors";
import {
    elementKey,
    placeOpenings,
    rectOf,
    roofShape,
    unionOf,
    type Opening,
} from "../utils/openings";
import {
    DEFAULT_SURFACE,
    SURFACE_MATERIALS,
    surfaceOf,
    type ElementSurfaces,
} from "../utils/surfaceMaterials";
import { createCameraRig, type ViewName } from "./cameraRig";
import { disposeObject } from "./dispose";
import { createPostprocessing } from "./postprocessing";
import { buildPatterns, disposePatterns, type Pattern } from "./patterns";
import { buildFlatRoof, buildRoomShell, applyMetricUVs } from "./roomGeometry";
import { buildTrees, type TreeSpot } from "./vegetation";

const HOVER_COLOR = 0x3f8f5f;
const SELECTION_COLOR = 0xb8f36b;
const OUTLINE_WIDTH_PX = 3;
const TERRAIN_COLOR = 0x5d8a4e;
const ROOF_COLOR = 0x8a4f43;
const SLAB_COLOR = 0xb9c0c8;
const GLASS_COLOR = 0x7fb4dc;
const FRAME_COLOR = 0x1c1f24;
const DOOR_COLOR = 0x4a3526;
const CYAN_ACCENT = 0x00f0ff;
const MAGENTA_ACCENT = 0xff007f;
const SHADOW_RADIUS = 4;
const PATTERN_BUMP = 1.4;
const GRAIN_SIZE_PX = 128;
const GRAIN_TILE_M = 1.5;
const GRAIN_BUMP = 2;
const NEON_BOOST = 3;
const LOT_EDGE_BOOST = 1.5;
const LOT_EDGE_WIDTH_PX = 2;
const BLOOM_STRENGTH = 0.55;
const AMBIENT_SHARE = 0.28;
const SKY_FALLOFF = 0.55;
const SKY_GLOW_HEIGHT = 0.035;
const STAR_COUNT = 700;
const STAR_SIZE_PX = 1.6;
const WINDOW_LIGHT = 0xffc27a;
const SKY_RADIUS_FACTOR = 20;
const GROUND_RADIUS_FACTOR = 8;
const FOG_DEPTH_FACTOR = 5;
const EDGE_COLOR = 0x1b1410;
const MUTED_COLOR = 0x39414d;
const GHOST_OPACITY = 0.3;
const HIGHLIGHT_GLOW = 0.45;
const COMPANION_REACH_M = 0.05;
const CUT_DISABLED_M = 1e6;
const DEMOLITION_COLOR = 0xff5c7a;
const OVERLAY_COLORS: Record<SpatialLayer, number> = {
    structure: CYAN_ACCENT,
    installations: MAGENTA_ACCENT,
    finishes: 0xffc857,
};
const OVERLAY_OPACITY: Record<WorkStatus, number> = {
    existing: 0.85,
    planned: 0.4,
    demolition: 0.3,
};
const OVERLAY_GLOW = 0.7;
const OVERLAY_RENDER_ORDER = 2;
// A plinth thinner than this would only flicker against the floor slab.
const PLINTH_MIN_M = 0.05;
const EXPLODE_GAP_M = 3.5;
const EXPLODE_RATE = 8;
const EXPLODE_REST = 0.002;
// The first time a model is shown its levels start a quarter apart and settle into place. With
// the damping above that takes about 600 ms, the longest a presentation may last.
const ENTRANCE_EXPLODE = 0.25;
const MAX_FRAME_S = 0.1;
const LEVEL_TOLERANCE_M = 0.05;
const INSPECT_POLAR = 0.75;
const EYE_HEIGHT_M = 1.6;
const GAZE_HEIGHT_M = 1.2;
const INTERIOR_INSET_M = 0.6;
const SLAB_THICKNESS_M = 0.3;
const FIELD_OF_VIEW = 45;

const MAX_PIXEL_RATIO = 2;
const SHADOW_MAP_SIZE = 2048;
const CLICK_TOLERANCE_PX = 4;
const SURFACE_GAP_M = 0.02;
const TREE_SPACING_M = 4.5;
const LIGHT_DIRECTION = new Vector3(-0.5, 1, 0.6).normalize();
const UP_AXIS = new Vector3(0, 1, 0);
const STILL_SUN_SPREAD = 0.024;

/** Low-discrepancy sequence: spreads the samples of a still evenly inside the pixel. */
function halton(index: number, base: number): number {
    let result = 0;
    let fraction = 1 / base;

    for (let rest = index; rest > 0; rest = Math.floor(rest / base)) {
        result += fraction * (rest % base);
        fraction /= base;
    }

    return result;
}

export type { ViewName };
export type Projection = "perspective" | "orthographic";
export type LayerName = "rooms" | "roof" | "environment" | "grid";
export type Layers = Record<LayerName, boolean>;
export type OverlayLayers = Record<SpatialLayer, boolean>;
export type PlanPoint = [number, number, number];

export interface CameraPose {
    position: PlanPoint;
    target: PlanPoint;
}

export interface ScenePalette {
    sky: number;
    fog: number;
    ground: number;
    grid: number;
    axis: number;
    accent: number;
    glow: number;
    horizon: number;
    sun: number;
    sunPower: number;
    skyLight: number;
    skyPower: number;
    reflections: number;
    windowGlow: number;
    glassOpacity: number;
    gridOpacity: number;
    stars: boolean;
}

export const SCENE_PALETTES: Record<"light" | "dark", ScenePalette> = {
    light: {
        sky: 0x5f9fde,
        fog: 0xe8ede6,
        ground: 0xe1e6dd,
        grid: 0xb4bbb2,
        axis: 0x9aa39a,
        accent: 0,
        glow: 0,
        horizon: 0xf7eedf,
        sun: 0xffeccf,
        sunPower: 3.4,
        skyLight: 0xcfe2ff,
        skyPower: 0.62,
        reflections: 0.5,
        windowGlow: 0,
        glassOpacity: 0.5,
        gridOpacity: 0.45,
        stars: false,
    },
    // Night: moonlight, lit windows and a dusk glow on the horizon.
    dark: {
        sky: 0x030a08,
        fog: 0x07140f,
        ground: 0x0a1a13,
        grid: 0x183a2b,
        axis: 0x2f6b4a,
        accent: 0,
        glow: 1,
        horizon: 0x14463a,
        sun: 0x9fb6ff,
        sunPower: 1.15,
        skyLight: 0x3a4a80,
        skyPower: 0.4,
        reflections: 0.14,
        windowGlow: 2.6,
        glassOpacity: 0.92,
        gridOpacity: 0.7,
        stars: true,
    },
};

export interface StructureViewer {
    show: (structure: Structure) => void;
    select: (key: string | null) => void;
    setColors: (colors: ElementColors | null) => void;
    setSurfaces: (surfaces: ElementSurfaces) => void;
    setRoof: (roof: RoofKind) => void;
    setLayers: (layers: Layers) => void;
    setHidden: (keys: ReadonlySet<string>) => void;
    setPalette: (palette: ScenePalette) => void;
    setView: (view: ViewName) => void;
    /** Width covered by panels over each side of the scene, so framing leaves the model clear. */
    setFrameInsets: (left: number, right: number) => void;
    isolate: (key: string | null) => void;
    setCutaway: (fraction: number) => void;
    setHighlight: (keys: ReadonlySet<string> | null) => void;
    setOverlays: (items: SpatialElement[]) => void;
    setOverlayLayers: (layers: OverlayLayers) => void;
    setExplode: (fraction: number) => void;
    enterRoom: (key: string | null, pose?: CameraPose) => void;
    setAsset: (url: string | null) => void;
    focus: (key: string | null, azimuth?: number) => void;
    zoomBy: (factor: number) => void;
    /**
     * Turns the sun around the model; 0 is its default bearing. With an elevation, in degrees
     * above the horizon, it also raises or lowers it.
     */
    setSun: (degrees: number, elevation?: number) => void;
    /** Tone mapping exposure; 1 is the default. */
    setExposure: (exposure: number) => void;
    setShadows: (enabled: boolean) => void;
    /** Draws the current view and returns it as a PNG data URL. */
    capture: () => string;
    /**
     * Draws the current view at another size, as the average of several frames, and returns it
     * on a canvas; `null` if it was cancelled.
     */
    renderStill: (job: StillJob) => Promise<HTMLCanvasElement | null>;
    /** Longest side, in pixels, of an image or shadow map this device can draw. */
    maxImageSize: number;
    /** Switches between the perspective camera and a real orthographic one, keeping the framing. */
    setProjection: (projection: Projection) => void;
    dispose: () => void;
}

export interface StillJob {
    width: number;
    height: number;
    /**
     * Frames averaged into the image: each one shifts the camera a fraction of a pixel and the
     * sun a fraction of a degree, which smooths the edges and softens the shadows.
     */
    samples: number;
    shadowMapSize: number;
    onProgress: (done: number, total: number) => void;
    signal?: AbortSignal;
}

export interface ViewerEvents {
    onSelect: (key: string | null) => void;
    onZoom: (percent: number) => void;
    /** Where the camera looks, in whole degrees: around the vertical axis, and above the horizon. */
    onOrbit: (azimuth: number, elevation: number) => void;
    onAsset: (state: "ready" | "error") => void;
    /** The browser took the graphics context away (driver reset, too many contexts, sleep). */
    onContextLost?: () => void;
}

export { elementKey };

export function overlayKey(id: number): string {
    return `spatial-${id}`;
}

export function isSpace(element: StructureElement): boolean {
    return element.kind === "room" || element.kind === "volume";
}

function insidePolygon(x: number, y: number, outline: StructureTerrain["outline"]): boolean {
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

function buildGrain(): DataTexture {
    const size = GRAIN_SIZE_PX;
    const coarse = size / 8;
    const data = new Uint8Array(size * size * 4);
    let seed = 7;
    const random = () => {
        seed = (seed * 16807) % 2147483647;

        return seed / 2147483647;
    };
    const blotches = Array.from({ length: coarse * coarse }, random);

    for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
            const blotch = blotches[Math.floor(y / 8) * coarse + Math.floor(x / 8)];
            const value = 255 * (0.7 + 0.12 * blotch + 0.18 * random());

            data.fill(value, (y * size + x) * 4, (y * size + x) * 4 + 3);
            data[(y * size + x) * 4 + 3] = 255;
        }
    }

    const texture = new DataTexture(data, size, size);
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    texture.repeat.setScalar(1 / GRAIN_TILE_M);
    texture.magFilter = LinearFilter;
    texture.minFilter = LinearMipmapLinearFilter;
    texture.generateMipmaps = true;
    texture.needsUpdate = true;

    return texture;
}

function buildStars(radius: number): Points {
    const positions = new Float32Array(STAR_COUNT * 3);
    const point = new Vector3();
    let seed = 11;
    const random = () => {
        seed = (seed * 16807) % 2147483647;

        return seed / 2147483647;
    };

    for (let index = 0; index < STAR_COUNT; index += 1) {
        point
            .setFromSphericalCoords(
                radius,
                Math.acos(0.12 + 0.88 * random()),
                random() * Math.PI * 2,
            )
            .toArray(positions, index * 3);
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(positions, 3));

    return new Points(
        geometry,
        new PointsMaterial({
            color: 0xdfe8ff,
            size: STAR_SIZE_PX,
            sizeAttenuation: false,
            transparent: true,
            opacity: 0.75,
            fog: false,
            depthWrite: false,
        }),
    );
}

/** Sky dome: the fog colour at the horizon line, a band of glow just above it, then the zenith. */
function buildSky(palette: ScenePalette, radius: number): Mesh {
    const geometry = new SphereGeometry(radius, 48, 96);
    const positions = geometry.getAttribute("position");
    const colors = new Float32Array(positions.count * 3);
    const ground = new Color(palette.fog);
    const horizon = new Color(palette.horizon);
    const sky = new Color(palette.sky);
    const mixed = new Color();

    for (let index = 0; index < positions.count; index += 1) {
        const height = Math.max(positions.getY(index) / radius, 0);

        if (height < SKY_GLOW_HEIGHT) {
            mixed.copy(ground).lerp(horizon, height / SKY_GLOW_HEIGHT);
        } else {
            mixed
                .copy(horizon)
                .lerp(
                    sky,
                    Math.pow((height - SKY_GLOW_HEIGHT) / (1 - SKY_GLOW_HEIGHT), SKY_FALLOFF),
                );
        }

        mixed.toArray(colors, index * 3);
    }

    geometry.setAttribute("color", new BufferAttribute(colors, 3));

    const dome = new Mesh(
        geometry,
        new MeshBasicMaterial({
            vertexColors: true,
            side: BackSide,
            fog: false,
            toneMapped: false,
            depthWrite: false,
        }),
    );

    if (palette.stars) {
        dome.add(buildStars(radius * 0.98));
    }

    return dome;
}

function standard(color: number, roughness: number, metalness = 0): MeshStandardMaterial {
    return new MeshStandardMaterial({
        color,
        roughness,
        metalness,
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1,
    });
}

/** A white material that shows a generated pattern: its colours come from the map. */
function patterned(pattern: Pattern, roughness: number): MeshStandardMaterial {
    const material = standard(0xffffff, roughness);

    material.map = pattern.map;
    material.bumpMap = pattern.bump;
    material.bumpScale = PATTERN_BUMP;

    return material;
}

function buildMaterial(element: StructureElement): MeshStandardMaterial {
    const surface = SURFACE_MATERIALS[DEFAULT_SURFACE[element.kind]];

    if (element.kind === "room") {
        return new MeshPhysicalMaterial({
            color: surface.color,
            roughness: surface.roughness,
            metalness: surface.metalness,
            clearcoat: 0.15,
            clearcoatRoughness: 0.6,
            polygonOffset: true,
            polygonOffsetFactor: 1,
            polygonOffsetUnits: 1,
        });
    }

    return standard(surface.color, surface.roughness, surface.metalness);
}

/**
 * Height of the ground of a terrain at a depth of the plan (`y`, in metres from the front of the
 * lot). The terrain is a plane that slopes along its depth, as in the terrain diagrams, and it
 * meets level 0 at `pivot`.
 */
function groundHeight(terrain: StructureTerrain, pivot: number, y: number): number {
    return ((y - pivot) * (terrain.slope_percent ?? 0)) / 100;
}

/**
 * The depth at which the ground meets level 0. With a building it is its back wall: the floor
 * is level, the ground falls away under it towards the front (where a plinth fills the gap) and
 * rises behind it, so the building is never buried. Without one it is the front of the lots.
 */
function slopePivot(structure: Structure): number {
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
function lowestGround(structure: Structure, pivot: number): number {
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
function buildPlinth(structure: Structure, pivot: number): Group | null {
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
function buildTerrain(terrain: StructureTerrain, grass: Pattern, pivot: number): Mesh {
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

type ElementMesh = Mesh<BufferGeometry, MeshStandardMaterial>;

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

interface SharedMaterials {
    glass: MeshPhysicalMaterial;
    frame: MeshPhysicalMaterial;
}

function shared<Shared extends Material>(material: Shared): Shared {
    material.userData.shared = true;

    return material;
}

function buildSharedMaterials(): SharedMaterials {
    return {
        glass: shared(
            new MeshPhysicalMaterial({
                color: GLASS_COLOR,
                transparent: true,
                opacity: 0.4,
                roughness: 0.08,
                metalness: 0.25,
                clearcoat: 1,
                clearcoatRoughness: 0.05,
                emissive: WINDOW_LIGHT,
                emissiveIntensity: 0,
                depthWrite: false,
            }),
        ),
        frame: shared(
            new MeshPhysicalMaterial({
                color: FRAME_COLOR,
                roughness: 0.35,
                metalness: 0.9,
                clearcoat: 0.4,
                clearcoatRoughness: 0.3,
            }),
        ),
    };
}

function buildElement(
    element: StructureElement,
    openings: Opening[],
    materials: SharedMaterials,
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
            const frames = new Mesh(shell.frames, materials.frame);
            frames.castShadow = true;
            mesh.add(frames);
        }

        if (shell.door !== null) {
            const door = new Mesh(shell.door, standard(DOOR_COLOR, 0.7));
            door.castShadow = true;
            mesh.add(door);
        }

        if (shell.glass !== null) {
            mesh.add(new Mesh(shell.glass, materials.glass));
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

type OverlayMesh = Mesh<BoxGeometry, MeshStandardMaterial>;

function buildOverlay(item: SpatialElement): OverlayMesh {
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

function buildRoof(rooms: StructureRoom[], kind: RoofKind, tiles: Pattern): Mesh | null {
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

function buildEnvironment(structure: Structure, pivot: number): Group {
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

function buildLotEdges(terrains: StructureTerrain[], material: LineMaterial, pivot: number): Group {
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

function clip(root: Object3D, planes: Plane[]): void {
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

export function createStructureViewer(
    container: HTMLElement,
    events: ViewerEvents,
): StructureViewer {
    const renderer = new WebGLRenderer({ antialias: true });
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFShadowMap;
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = true;
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.localClippingEnabled = true;
    container.append(renderer.domElement);

    const canvas = renderer.domElement;
    const scene = new Scene();
    let palette = SCENE_PALETTES.dark;
    const fog = new Fog(palette.fog, 1, 2);
    scene.background = new Color(palette.fog);
    scene.fog = fog;

    const camera = new PerspectiveCamera(FIELD_OF_VIEW, 1, 0.1, 1000);
    // The orbit controls keep driving the perspective camera. The orthographic one follows it and
    // is the camera that draws and picks while that projection is on.
    const orthographic = new OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);
    let projection: Projection = "perspective";

    const gaze = new Vector3();
    let lastOrbit = "";
    const rig = createCameraRig(camera, canvas, handleCameraChange);
    const cutPlane = new Plane(new Vector3(0, -1, 0), CUT_DISABLED_M);
    const cutPlanes = [cutPlane];
    const post = createPostprocessing(renderer, scene, camera, {
        occlusion: true,
        clippingPlanes: cutPlanes,
    });

    const pmrem = new PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const environmentMap = pmrem.fromScene(room, 0.04);
    room.dispose();
    pmrem.dispose();
    scene.environment = environmentMap.texture;
    scene.environmentIntensity = palette.reflections;

    const sun = new DirectionalLight(palette.sun, palette.sunPower);
    sun.castShadow = true;
    sun.shadow.mapSize.set(SHADOW_MAP_SIZE, SHADOW_MAP_SIZE);
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.03;
    sun.shadow.radius = SHADOW_RADIUS;

    const cyanAccent = new PointLight(CYAN_ACCENT, palette.accent, 0, 0);
    const magentaAccent = new PointLight(MAGENTA_ACCENT, palette.accent, 0, 0);
    const ambient = new AmbientLight(0xffffff, 0.2);
    const skyLight = new HemisphereLight(palette.skyLight, 0x2a3326, palette.skyPower);
    scene.add(ambient, skyLight, sun, sun.target, cyanAccent, magentaAccent);

    const grain = buildGrain();
    const patterns = buildPatterns(ROOF_COLOR, TERRAIN_COLOR);
    const materials = buildSharedMaterials();
    const outlineMaterial = shared(new LineMaterial({ linewidth: OUTLINE_WIDTH_PX }));
    const lotEdgeMaterial = shared(new LineMaterial({ linewidth: LOT_EDGE_WIDTH_PX }));
    outlineMaterial.clippingPlanes = cutPlanes;
    const raycaster = new Raycaster();
    const pointer = new Vector2();
    let pendingHover: PointerEvent | null = null;
    const bounds = new Sphere(new Vector3(), 1);

    let model: Group | null = null;
    let elements: ElementMesh[] = [];
    let roof: Mesh | null = null;
    let environment: Group | null = null;
    let lotEdges: Group | null = null;
    let grid: GridHelper | null = null;
    let ground: Mesh | null = null;
    let sky: Mesh | null = null;
    let layers: Layers = { rooms: true, roof: true, environment: true, grid: true };
    let selectedKey: string | null = null;
    let hidden: ReadonlySet<string> = new Set();
    const lightDirection = LIGHT_DIRECTION.clone();
    let colors: ElementColors | null = null;
    let surfaces: ElementSurfaces = {};
    let roofKind: RoofKind = "gable";
    let roofRooms: StructureRoom[] = [];
    let outline: LineSegments2 | null = null;
    let hoveredKey: string | null = null;
    let isolatedKey: string | null = null;
    let companions: ReadonlySet<string> = new Set();
    let cutFraction = 1;
    let highlight: ReadonlySet<string> | null = null;
    let overlayData: SpatialElement[] = [];
    let overlays: OverlayMesh[] = [];
    let overlayGroup: Group | null = null;
    let overlayLayers: OverlayLayers = { structure: true, installations: true, finishes: true };
    let levelBases: number[] = [];
    let explodeTarget = 0;
    let explodeCurrent = 0;
    let entered = false;
    // How far the lowest corner of the lots is under level 0: the ground plane goes below it.
    let groundDrop = 0;
    let lastFrame = 0;
    let asset: Object3D | null = null;
    let assetRequest = 0;
    let framed = false;
    let insetLeft = 0;
    let insetRight = 0;
    let pressX = 0;
    let pressY = 0;
    let lastZoom = 0;
    let viewport = "";
    let dirty = true;
    let stillRunning = false;

    function invalidate(): void {
        renderer.shadowMap.needsUpdate = true;
        dirty = true;
    }

    function render(): void {
        const reach = rig.distance();

        dirty = false;
        syncOrthographic();
        fog.near = reach + bounds.radius;
        fog.far = reach + bounds.radius * FOG_DEPTH_FACTOR;
        post.render();
    }

    function applySize(width: number, height: number, pixelRatio: number): void {
        renderer.setPixelRatio(pixelRatio);
        renderer.setSize(width, height, false);
        post.setSize(width, height, pixelRatio);
        outlineMaterial.resolution.set(width, height);
        lotEdgeMaterial.resolution.set(width, height);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    }

    function resize(): void {
        const width = container.clientWidth;
        const height = container.clientHeight;
        const pixelRatio = Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO);
        const next = `${width}x${height}@${pixelRatio}`;

        // A still owns the drawing buffer until it ends; it calls this again when it does.
        if (stillRunning || width === 0 || height === 0 || next === viewport) {
            return;
        }

        viewport = next;
        applySize(width, height, pixelRatio);
        applyFill();

        if (model !== null) {
            fitLimits();
            reportZoom();
        }

        render();
    }

    function reportZoom(): void {
        const percent = rig.zoomPercent();

        if (percent !== lastZoom) {
            lastZoom = percent;
            events.onZoom(percent);
        }
    }

    function applyFill(): void {
        const width = container.clientWidth;

        if (width > 0) {
            rig.setFill((width - insetLeft - insetRight) / width);
        }
    }

    function setFrameInsets(left: number, right: number): void {
        insetLeft = Math.max(0, left);
        insetRight = Math.max(0, right);
        applyFill();

        if (model !== null) {
            fitLimits();
            reportZoom();
        }
    }

    function fitLimits(): void {
        rig.fit(bounds);

        placeSun();
        sun.target.position.copy(bounds.center);
        sun.shadow.camera.left = -bounds.radius;
        sun.shadow.camera.right = bounds.radius;
        sun.shadow.camera.top = bounds.radius;
        sun.shadow.camera.bottom = -bounds.radius;
        sun.shadow.camera.near = bounds.radius * 0.5;
        sun.shadow.camera.far = bounds.radius * 3.5;
        sun.shadow.camera.updateProjectionMatrix();

        cyanAccent.position
            .copy(bounds.center)
            .add(new Vector3(-1.2, 0.5, 1).multiplyScalar(bounds.radius));
        magentaAccent.position
            .copy(bounds.center)
            .add(new Vector3(1.2, 0.35, -1).multiplyScalar(bounds.radius));
    }

    function placeSun(): void {
        sun.position.copy(bounds.center).addScaledVector(lightDirection, bounds.radius * 2);
    }

    function setView(view: ViewName): void {
        rig.frame(view, framed);
        reportZoom();
    }

    function zoomBy(factor: number): void {
        rig.zoomBy(factor);
    }

    function focus(key: string | null, azimuth?: number): void {
        const mesh = [...elements, ...overlays].find((item) => item.userData.key === key);

        rig.focus(
            mesh === undefined
                ? null
                : new Box3().setFromObject(mesh).getBoundingSphere(new Sphere()),
            azimuth === undefined
                ? undefined
                : new Vector3().setFromSphericalCoords(1, INSPECT_POLAR, azimuth),
        );
    }

    function paint(): void {
        for (const mesh of elements) {
            const key = mesh.userData.key as string;

            const surfaceId = surfaceOf(
                surfaces,
                key,
                mesh.userData.kind as StructureElement["kind"],
            );
            const surface = SURFACE_MATERIALS[surfaceId];
            const dimmed = highlight !== null && !highlight.has(key);
            const opacity = dimmed ? GHOST_OPACITY : colors === null ? surface.opacity : 1;
            // Brick, wood and stone are drawn with their pattern; the map carries the colours,
            // so the material goes white under it. Data colours and dimming use flat colour.
            const pattern =
                colors === null && !dimmed ? (patterns.surfaces[surfaceId] ?? null) : null;

            mesh.material.color.setHex(
                dimmed
                    ? MUTED_COLOR
                    : colors !== null
                      ? (colors.get(key) ?? MUTED_COLOR)
                      : pattern !== null
                        ? 0xffffff
                        : surface.color,
            );
            mesh.material.roughness = surface.roughness;
            mesh.material.metalness = surface.metalness;
            mesh.material.opacity = opacity;

            const relief =
                pattern !== null
                    ? pattern.bump
                    : colors === null && surface.grain > 0
                      ? grain
                      : null;
            const map = pattern === null ? null : pattern.map;

            if (mesh.material.bumpMap !== relief || mesh.material.map !== map) {
                mesh.material.map = map;
                mesh.material.bumpMap = relief;
                mesh.material.roughnessMap = pattern === null ? relief : null;
                mesh.material.needsUpdate = true;
            }

            mesh.material.bumpScale = pattern === null ? surface.grain * GRAIN_BUMP : PATTERN_BUMP;

            if (mesh.material.transparent !== opacity < 1) {
                mesh.material.transparent = opacity < 1;
                mesh.material.needsUpdate = true;
            }

            const edges = mesh.userData.edges as LineBasicMaterial;
            const selected = key === selectedKey;

            edges.color.setHex(selected ? SELECTION_COLOR : EDGE_COLOR);
            edges.opacity = selected ? 1 : 0.6;
            const hovered = !selected && key === hoveredKey;
            const marked = highlight !== null && !dimmed;

            mesh.material.emissive.setHex(
                hovered ? HOVER_COLOR : marked ? SELECTION_COLOR : 0x000000,
            );
            mesh.material.emissiveIntensity = !hovered && marked ? HIGHLIGHT_GLOW : 0.2;
        }

        invalidate();
    }

    function removeOutline(): void {
        if (outline !== null) {
            outline.removeFromParent();
            outline.geometry.dispose();
            outline = null;
        }
    }

    function outlineSelection(): void {
        removeOutline();

        const mesh = elements.find((item) => item.userData.key === selectedKey);

        if (mesh !== undefined) {
            const lines = mesh.userData.lines as BufferGeometry;

            outline = new LineSegments2(
                new LineSegmentsGeometry().setPositions([...lines.getAttribute("position").array]),
                outlineMaterial,
            );
            mesh.add(outline);
        }
    }

    /**
     * The roof is one piece that sits on the rooms of the top floor. With one of them hidden it
     * would hang in the air, so it is hidden with them.
     */
    function topFloorHasHiddenRoom(): boolean {
        const top = levelBases.length - 1;

        return elements.some(
            (mesh) =>
                mesh.userData.space === true &&
                mesh.userData.level === top &&
                hidden.has(mesh.userData.key as string),
        );
    }

    function applyLayers(): void {
        for (const mesh of elements) {
            mesh.visible =
                !hidden.has(mesh.userData.key as string) &&
                (isolatedKey === null
                    ? layers.rooms || mesh.userData.space !== true
                    : companions.has(mesh.userData.key as string));
        }

        for (const mesh of overlays) {
            mesh.visible =
                overlayLayers[mesh.userData.layer as SpatialLayer] &&
                (isolatedKey === null || companions.has(mesh.userData.key as string));
        }

        if (roof !== null) {
            roof.visible =
                layers.roof && layers.rooms && isolatedKey === null && !topFloorHasHiddenRoom();
        }

        if (environment !== null) {
            environment.visible = layers.environment;
        }

        if (lotEdges !== null) {
            lotEdges.visible = palette.glow > 0;
        }

        if (grid !== null) {
            grid.visible = layers.grid;
        }
    }

    function setPalette(next: ScenePalette): void {
        if (next === palette) {
            return;
        }

        palette = next;
        applyPalette();

        if (model !== null) {
            buildGrid(model);
            applyLayers();
        }
    }

    function applyPalette(): void {
        scene.background = new Color(palette.fog);
        fog.color.setHex(palette.fog);
        cyanAccent.intensity = palette.accent;
        magentaAccent.intensity = palette.accent;
        post.setBloom(palette.glow * BLOOM_STRENGTH);
        outlineMaterial.color.setHex(SELECTION_COLOR).multiplyScalar(1 + NEON_BOOST * palette.glow);
        lotEdgeMaterial.color
            .setHex(SELECTION_COLOR)
            .multiplyScalar(1 + LOT_EDGE_BOOST * palette.glow);
        materials.glass.emissiveIntensity = palette.windowGlow;
        materials.glass.opacity = palette.glassOpacity;
        sun.color.setHex(palette.sun);
        sun.intensity = palette.sunPower;
        skyLight.color.setHex(palette.skyLight);
        skyLight.intensity = palette.skyPower;
        ambient.intensity = palette.skyPower * AMBIENT_SHARE;
        scene.environmentIntensity = palette.reflections;
    }

    function buildGrid(parent: Group): void {
        if (grid !== null) {
            parent.remove(grid);
            disposeObject(grid);
        }

        if (ground !== null) {
            parent.remove(ground);
            disposeObject(ground);
        }

        if (sky !== null) {
            parent.remove(sky);
            disposeObject(sky);
        }

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

        grid = new GridHelper(bounds.radius * 6, 60, palette.axis, palette.grid);
        grid.position.set(bounds.center.x, -SLAB_THICKNESS_M - 0.05 - groundDrop, bounds.center.z);
        grid.material.transparent = true;
        grid.material.opacity = palette.gridOpacity;
        grid.material.depthWrite = false;
        parent.add(sky, ground, grid);
    }

    function updateIsolation(): void {
        const target = elements.find((item) => item.userData.key === isolatedKey);
        const range = new Box3();
        const kept = new Set<string>();

        if (target === undefined) {
            isolatedKey = null;

            for (const mesh of elements) {
                range.expandByObject(mesh);
            }
        } else {
            range.setFromObject(target);

            const reach = range.clone().expandByScalar(COMPANION_REACH_M);
            const box = new Box3();

            for (const mesh of elements) {
                if (
                    mesh === target ||
                    (mesh.userData.space !== true && reach.intersectsBox(box.setFromObject(mesh)))
                ) {
                    kept.add(mesh.userData.key as string);
                }
            }

            for (const mesh of overlays) {
                if (
                    mesh.userData.room === isolatedKey ||
                    (mesh.userData.room === null && reach.intersectsBox(box.setFromObject(mesh)))
                ) {
                    kept.add(mesh.userData.key as string);
                }
            }
        }

        companions = kept;
        cutPlane.constant =
            cutFraction >= 1 || range.isEmpty()
                ? CUT_DISABLED_M
                : range.min.y + (range.max.y - range.min.y) * cutFraction;
    }

    function isolate(key: string | null): void {
        isolatedKey = key;
        updateIsolation();
        applyLayers();
    }

    function setCutaway(fraction: number): void {
        cutFraction = fraction;
        updateIsolation();
    }

    function setHighlight(keys: ReadonlySet<string> | null): void {
        highlight = keys;
        paint();
    }

    function levelAt(height: number): number {
        let level = 0;

        for (const [index, base] of levelBases.entries()) {
            if (height >= base - LEVEL_TOLERANCE_M) {
                level = index;
            }
        }

        return level;
    }

    function applyExplode(): void {
        const lift = EXPLODE_GAP_M * explodeCurrent;

        for (const mesh of [...elements, ...overlays]) {
            mesh.position.y =
                (mesh.userData.baseY as number) + (mesh.userData.level as number) * lift;
        }

        if (roof !== null) {
            roof.position.y = (roof.userData.baseY as number) + levelBases.length * lift;
        }

        updateIsolation();
    }

    function placeRoof(): void {
        if (roof !== null && model !== null) {
            roof.userData.baseY = roof.position.y;
            clip(roof, cutPlanes);
            model.add(roof);
        }
    }

    function rebuildOverlays(): void {
        if (model === null) {
            return;
        }

        if (overlayGroup !== null) {
            model.remove(overlayGroup);
            disposeObject(overlayGroup);
        }

        overlays = overlayData.map(buildOverlay);
        overlayGroup = new Group();

        for (const [index, mesh] of overlays.entries()) {
            mesh.userData.baseY = mesh.position.y;
            mesh.userData.level = levelAt(overlayData[index].min_z_m);
            overlayGroup.add(mesh);
        }

        model.add(overlayGroup);
        applyExplode();
        applyLayers();
    }

    function setOverlays(items: SpatialElement[]): void {
        overlayData = items;
        rebuildOverlays();
    }

    function setOverlayLayers(next: OverlayLayers): void {
        overlayLayers = next;
        applyLayers();
    }

    function setExplode(fraction: number): void {
        explodeTarget = MathUtils.clamp(fraction, 0, 1);
    }

    function enterRoom(key: string | null, pose?: CameraPose): void {
        const room = elements.find(
            (item) => item.userData.key === key && item.userData.space === true,
        );

        // Walls are drawn from outside only; seen from inside they need both faces.
        for (const mesh of elements) {
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

    function setAsset(url: string | null): void {
        const request = ++assetRequest;

        if (asset !== null) {
            asset.removeFromParent();
            disposeObject(asset, { textures: true });
            asset = null;
        }

        if (url === null) {
            return;
        }

        // The loader is only downloaded when a room actually has a model to show.
        import("three/examples/jsm/loaders/GLTFLoader.js")
            .then(({ GLTFLoader }) => new GLTFLoader().setWithCredentials(true).loadAsync(url))
            .then((gltf) => {
                if (request !== assetRequest || model === null) {
                    disposeObject(gltf.scene, { textures: true });
                    return;
                }

                asset = gltf.scene;
                clip(asset, cutPlanes);
                model.add(asset);
                invalidate();
                events.onAsset("ready");
            })
            .catch(() => {
                if (request === assetRequest) {
                    events.onAsset("error");
                }
            });
    }

    function setHidden(keys: ReadonlySet<string>): void {
        hidden = keys;
        applyLayers();
    }

    function setLayers(next: Layers): void {
        layers = next;
        applyLayers();
    }

    function clear(): void {
        removeOutline();

        if (asset !== null) {
            asset.removeFromParent();
            disposeObject(asset, { textures: true });
        }

        if (model !== null) {
            scene.remove(model);
            disposeObject(model);
            model = null;
            elements = [];
            overlays = [];
            overlayGroup = null;
            asset = null;
            roof = null;
            environment = null;
            lotEdges = null;
            grid = null;
            ground = null;
            sky = null;
        }
    }

    function buildElements(structure: Structure): ElementMesh[] {
        const openings = placeOpenings(structure.rooms);
        const items = [...structure.rooms, ...structure.components];
        const bases = new Map<number, number>();

        for (const item of items) {
            bases.set(item.plan_id, Math.min(bases.get(item.plan_id) ?? Infinity, item.base_m));
        }

        const plans = [...bases.keys()].sort((a, b) => (bases.get(a) ?? 0) - (bases.get(b) ?? 0));

        levelBases = plans.map((plan) => bases.get(plan) ?? 0);

        return items.map((element) => {
            const mesh = buildElement(element, openings.get(elementKey(element)) ?? [], materials);

            mesh.userData.baseY = mesh.position.y;
            mesh.userData.level = plans.indexOf(element.plan_id);

            return mesh;
        });
    }

    function show(structure: Structure): void {
        // The entrance plays once per viewer, not each time a room is added and the model rebuilt.
        if (!entered) {
            entered = true;

            if (!prefersReducedMotion()) {
                explodeCurrent = Math.max(explodeCurrent, ENTRANCE_EXPLODE);
            }
        }

        clear();

        elements = buildElements(structure);
        roofRooms = structure.rooms;
        roof = buildRoof(roofRooms, roofKind, patterns.roof);
        // Every terrain slopes about the same line, so the ground is continuous between lots.
        const pivot = slopePivot(structure);
        const plinth = buildPlinth(structure, pivot);

        groundDrop = lowestGround(structure, pivot);
        environment = buildEnvironment(structure, pivot);
        lotEdges = buildLotEdges(structure.terrains, lotEdgeMaterial, pivot);
        model = new Group();
        model.add(
            ...structure.terrains.map((terrain) => buildTerrain(terrain, patterns.grass, pivot)),
            ...elements,
            environment,
        );

        if (plinth !== null) {
            model.add(plinth);
        }

        for (const mesh of elements) {
            clip(mesh, cutPlanes);
        }

        placeRoof();

        new Box3().setFromObject(model).getBoundingSphere(bounds);
        bounds.radius = Math.max(bounds.radius, 1);

        buildGrid(model);
        model.add(lotEdges);
        scene.add(model);

        hoveredKey = null;
        resize();
        fitLimits();
        rebuildOverlays();
        outlineSelection();
        paint();

        if (!framed) {
            setView("isometric");
            framed = true;
        }

        reportZoom();
    }

    function select(key: string | null): void {
        selectedKey = key;
        outlineSelection();
        paint();
    }

    function setColors(next: ElementColors | null): void {
        colors = next;
        paint();
    }

    function setRoof(next: RoofKind): void {
        if (next === roofKind) {
            return;
        }

        roofKind = next;

        if (model === null) {
            return;
        }

        if (roof !== null) {
            model.remove(roof);
            disposeObject(roof);
        }

        roof = buildRoof(roofRooms, roofKind, patterns.roof);
        placeRoof();
        applyExplode();
        applyLayers();
    }

    function setSurfaces(next: ElementSurfaces): void {
        surfaces = next;
        paint();
    }

    function pick(event: MouseEvent): string | null {
        const box = canvas.getBoundingClientRect();

        pointer.set(
            ((event.clientX - box.left) / box.width) * 2 - 1,
            -((event.clientY - box.top) / box.height) * 2 + 1,
        );
        syncOrthographic();
        raycaster.setFromCamera(pointer, projection === "orthographic" ? orthographic : camera);

        // The work layers are drawn over the model, so they are also picked before it.
        const [hit] = [overlays, elements].flatMap((group) =>
            raycaster
                .intersectObjects(
                    group.filter((mesh) => mesh.visible),
                    false,
                )
                .slice(0, 1),
        );

        return hit === undefined ? null : (hit.object.userData.key as string);
    }

    function handlePointerDown(event: PointerEvent): void {
        pressX = event.clientX;
        pressY = event.clientY;
    }

    function handlePointerUp(event: PointerEvent): void {
        const moved = Math.hypot(event.clientX - pressX, event.clientY - pressY);

        if (event.button === 0 && moved <= CLICK_TOLERANCE_PX) {
            events.onSelect(pick(event));
        }
    }

    function handlePointerMove(event: PointerEvent): void {
        pendingHover = event;
    }

    function updateHover(event: PointerEvent): void {
        const key = event.buttons === 0 ? pick(event) : null;

        if (key !== hoveredKey) {
            hoveredKey = key;
            canvas.style.cursor = key === null ? "" : "pointer";
            paint();
        }
    }

    function handlePointerLeave(): void {
        pendingHover = null;

        if (hoveredKey !== null) {
            hoveredKey = null;
            canvas.style.cursor = "";
            paint();
        }
    }

    function handleDoubleClick(event: MouseEvent): void {
        const key = pick(event);

        if (key !== null) {
            events.onSelect(key);
        }

        focus(key);
        invalidate();
    }

    function reportOrbit(): void {
        camera.getWorldDirection(gaze);

        const azimuth = Math.round(MathUtils.radToDeg(Math.atan2(gaze.x, gaze.z)));
        const elevation = Math.round(MathUtils.radToDeg(Math.asin(MathUtils.clamp(gaze.y, -1, 1))));
        const orbit = `${azimuth}/${elevation}`;

        if (orbit !== lastOrbit) {
            lastOrbit = orbit;
            events.onOrbit(azimuth, elevation);
        }
    }

    function handleCameraChange(): void {
        dirty = true;
        reportZoom();
        reportOrbit();
    }

    // Without preventDefault the browser never offers the context back. The screen is told, so it
    // can explain what happened and rebuild the viewer; disposing removes this listener first,
    // because releasing the context on purpose fires the same event.
    function handleContextLost(event: Event): void {
        event.preventDefault();
        events.onContextLost?.();
    }

    const observer = new ResizeObserver(resize);
    observer.observe(container);
    window.addEventListener("resize", resize);
    canvas.addEventListener("webglcontextrestored", invalidate);
    canvas.addEventListener("webglcontextlost", handleContextLost);
    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerleave", handlePointerLeave);
    canvas.addEventListener("dblclick", handleDoubleClick);
    applyPalette();
    resize();

    renderer.setAnimationLoop((time) => {
        const elapsed = Math.min((time - lastFrame) / 1000, MAX_FRAME_S);

        lastFrame = time;

        if (stillRunning) {
            return;
        }

        rig.update(time);

        if (explodeCurrent !== explodeTarget) {
            const settled =
                prefersReducedMotion() || Math.abs(explodeTarget - explodeCurrent) < EXPLODE_REST;

            explodeCurrent = settled
                ? explodeTarget
                : MathUtils.damp(explodeCurrent, explodeTarget, EXPLODE_RATE, elapsed);
            applyExplode();
            invalidate();
        }

        if (pendingHover !== null) {
            updateHover(pendingHover);
            pendingHover = null;
        }

        if (dirty) {
            render();
        }
    });

    function dispose(): void {
        renderer.setAnimationLoop(null);
        observer.disconnect();
        window.removeEventListener("resize", resize);
        canvas.removeEventListener("webglcontextrestored", invalidate);
        canvas.removeEventListener("webglcontextlost", handleContextLost);
        canvas.removeEventListener("pointerdown", handlePointerDown);
        canvas.removeEventListener("pointerup", handlePointerUp);
        canvas.removeEventListener("pointermove", handlePointerMove);
        canvas.removeEventListener("pointerleave", handlePointerLeave);
        canvas.removeEventListener("dblclick", handleDoubleClick);
        rig.dispose();
        clear();
        post.dispose();
        materials.glass.dispose();
        materials.frame.dispose();
        lotEdgeMaterial.dispose();
        outlineMaterial.dispose();
        environmentMap.dispose();
        grain.dispose();
        disposePatterns(patterns);
        sun.shadow.map?.dispose();
        sun.dispose();
        renderer.dispose();
        renderer.forceContextLoss();
        canvas.remove();
    }

    function setSun(degrees: number, elevation?: number): void {
        lightDirection.copy(LIGHT_DIRECTION);

        if (elevation !== undefined) {
            const angle = MathUtils.degToRad(elevation);

            lightDirection
                .setY(0)
                .normalize()
                .multiplyScalar(Math.cos(angle))
                .setY(Math.sin(angle));
        }

        lightDirection.applyAxisAngle(UP_AXIS, MathUtils.degToRad(degrees));

        if (model !== null) {
            fitLimits();
        }
    }

    function setExposure(exposure: number): void {
        renderer.toneMappingExposure = exposure;
    }

    function setShadows(enabled: boolean): void {
        sun.castShadow = enabled;
    }

    function setShadowMapSize(size: number): void {
        if (sun.shadow.mapSize.x !== size) {
            sun.shadow.mapSize.set(size, size);
            sun.shadow.map?.dispose();
            sun.shadow.map = null;
        }
    }

    async function renderStill(job: StillJob): Promise<HTMLCanvasElement | null> {
        if (stillRunning) {
            throw new Error("A still is already being rendered");
        }

        const limit = renderer.capabilities.maxTextureSize;

        if (job.width > limit || job.height > limit) {
            throw new Error("Image larger than this device can draw");
        }

        const output = document.createElement("canvas");
        const context = output.getContext("2d");

        if (context === null) {
            throw new Error("Canvas 2D is not available");
        }

        output.width = job.width;
        output.height = job.height;

        const total = Math.max(1, Math.round(job.samples));
        const restingDirection = lightDirection.clone();
        const active = projection === "orthographic" ? orthographic : camera;
        const offset = new Vector3();
        let cancelled = false;

        stillRunning = true;

        try {
            applySize(job.width, job.height, 1);
            setShadowMapSize(job.shadowMapSize);

            for (let index = 0; index < total; index += 1) {
                if (job.signal?.aborted === true) {
                    cancelled = true;
                    break;
                }

                if (total > 1) {
                    active.setViewOffset(
                        job.width,
                        job.height,
                        halton(index + 1, 2) - 0.5,
                        halton(index + 1, 3) - 0.5,
                        job.width,
                        job.height,
                    );
                    offset
                        .set(halton(index + 1, 5) - 0.5, 0, halton(index + 1, 7) - 0.5)
                        .multiplyScalar(STILL_SUN_SPREAD);
                    lightDirection.copy(restingDirection).add(offset).normalize();
                    placeSun();
                }

                renderer.shadowMap.needsUpdate = true;
                render();

                if (renderer.getContext().isContextLost()) {
                    throw new Error("The graphics context was lost while rendering");
                }

                // Running average: the n-th frame weighs 1/n. The buffer is only readable now.
                context.globalAlpha = 1 / (index + 1);
                context.drawImage(canvas, 0, 0);
                job.onProgress(index + 1, total);

                await new Promise((resolve) => window.setTimeout(resolve, 0));
            }
        } finally {
            camera.clearViewOffset();
            orthographic.clearViewOffset();
            lightDirection.copy(restingDirection);
            placeSun();
            setShadowMapSize(SHADOW_MAP_SIZE);
            stillRunning = false;
            viewport = "";
            renderer.shadowMap.needsUpdate = true;
            resize();
        }

        return cancelled ? null : output;
    }

    /**
     * Places the orthographic camera where the perspective one is and sizes its frustum to show,
     * at the orbit target, exactly what the perspective camera shows there. Moving closer or
     * farther therefore zooms it, and switching projection keeps the model framed.
     */
    function syncOrthographic(): void {
        if (projection !== "orthographic") {
            return;
        }

        const half = rig.distance() * Math.tan(MathUtils.degToRad(camera.fov / 2));

        orthographic.position.copy(camera.position);
        orthographic.quaternion.copy(camera.quaternion);
        orthographic.left = -half * camera.aspect;
        orthographic.right = half * camera.aspect;
        orthographic.top = half;
        orthographic.bottom = -half;
        orthographic.near = camera.near;
        orthographic.far = camera.far;
        orthographic.updateProjectionMatrix();
        orthographic.updateMatrixWorld();
    }

    function setProjection(next: Projection): void {
        projection = next;
        post.setCamera(next === "orthographic" ? orthographic : camera);
    }
    function capture(): string {
        // The drawing buffer is only readable in the same task that rendered it.
        renderer.shadowMap.needsUpdate = true;
        render();

        return canvas.toDataURL("image/png");
    }

    function changing<Arguments extends unknown[]>(
        action: (...values: Arguments) => void,
    ): (...values: Arguments) => void {
        return (...values) => {
            action(...values);
            invalidate();
        };
    }

    return {
        show: changing(show),
        select: changing(select),
        setColors: changing(setColors),
        setSurfaces: changing(setSurfaces),
        setRoof: changing(setRoof),
        setLayers: changing(setLayers),
        setHidden: changing(setHidden),
        setPalette: changing(setPalette),
        setView: changing(setView),
        setFrameInsets: changing(setFrameInsets),
        isolate: changing(isolate),
        setCutaway: changing(setCutaway),
        setHighlight: changing(setHighlight),
        setOverlays: changing(setOverlays),
        setOverlayLayers: changing(setOverlayLayers),
        setExplode: changing(setExplode),
        enterRoom: changing(enterRoom),
        setAsset: changing(setAsset),
        focus: changing(focus),
        zoomBy: changing(zoomBy),
        setSun: changing(setSun),
        setExposure: changing(setExposure),
        setShadows: changing(setShadows),
        capture,
        renderStill,
        maxImageSize: renderer.capabilities.maxTextureSize,
        setProjection: changing(setProjection),
        dispose,
    };
}
