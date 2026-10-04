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
    CylinderGeometry,
    DataTexture,
    DirectionalLight,
    EdgesGeometry,
    ExtrudeGeometry,
    Fog,
    GridHelper,
    Group,
    HemisphereLight,
    IcosahedronGeometry,
    LineBasicMaterial,
    LinearFilter,
    LinearMipmapLinearFilter,
    LineSegments,
    Material,
    Mesh,
    MeshBasicMaterial,
    MeshPhysicalMaterial,
    MeshStandardMaterial,
    Object3D,
    PCFShadowMap,
    PMREMGenerator,
    PerspectiveCamera,
    PointLight,
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
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";

import type {
    RoofKind,
    Structure,
    StructureElement,
    StructureRoom,
    StructureTerrain,
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
import { buildFlatRoof, buildRoomShell, applyMetricUVs } from "./roomGeometry";

const HOVER_COLOR = 0x4a90c2;
const SELECTION_COLOR = 0x00f0ff;
const OUTLINE_WIDTH_PX = 3;
const TERRAIN_COLOR = 0x4a7d55;
const ROOF_COLOR = 0xb0655a;
const SLAB_COLOR = 0xb9c0c8;
const GLASS_COLOR = 0x9fc4dc;
const FRAME_COLOR = 0x1c1f24;
const DOOR_COLOR = 0x4a3526;
const CYAN_ACCENT = 0x00f0ff;
const MAGENTA_ACCENT = 0xff007f;
const ENVIRONMENT_INTENSITY = 0.3;
const SHADOW_RADIUS = 3;
const GRAIN_SIZE_PX = 128;
const GRAIN_TILE_M = 1.5;
const GRAIN_BUMP = 2;
const TRUNK_COLOR = 0x5a4030;
const CANOPY_COLOR = 0x3f7a4f;
const CANOPY_LIGHT_COLOR = 0x5a9a5f;
const SKY_FALLOFF = 0.35;
const SKY_RADIUS_FACTOR = 20;
const GROUND_RADIUS_FACTOR = 8;
const FOG_DEPTH_FACTOR = 5;
const EDGE_COLOR = 0x1b1410;
const MUTED_COLOR = 0x39414d;
const SLAB_THICKNESS_M = 0.3;
const FIELD_OF_VIEW = 45;
const MAX_PIXEL_RATIO = 2;
const SHADOW_MAP_SIZE = 2048;
const CLICK_TOLERANCE_PX = 4;
const SURFACE_GAP_M = 0.02;
const TREE_SPACING_M = 4.5;
const LIGHT_DIRECTION = new Vector3(-0.5, 1, 0.6).normalize();

export type ViewName = "isometric" | "front" | "side" | "top";
export type LayerName = "rooms" | "roof" | "environment" | "grid";
export type Layers = Record<LayerName, boolean>;

export interface ScenePalette {
    sky: number;
    fog: number;
    ground: number;
    grid: number;
    /** Strength of the cyan and magenta accent lights; 0 turns them off. */
    accent: number;
}

export const SCENE_PALETTES: Record<"light" | "dark", ScenePalette> = {
    light: {
        sky: 0xb7d3ee,
        fog: 0xeef2f6,
        ground: 0xdde3d8,
        grid: 0xc2cabf,
        accent: 0,
    },
    dark: {
        sky: 0x14171e,
        fog: 0x1a202c,
        ground: 0x12161e,
        grid: 0x262c38,
        accent: 1.4,
    },
};

const VIEW_DIRECTIONS: Record<ViewName, Vector3> = {
    isometric: new Vector3(0.7, 0.6, 1).normalize(),
    front: new Vector3(0, 0.22, 1).normalize(),
    side: new Vector3(1, 0.22, 0).normalize(),
    top: new Vector3(0, 1, 0.001).normalize(),
};

export interface StructureViewer {
    show: (structure: Structure) => void;
    select: (key: string | null) => void;
    setColors: (colors: ElementColors | null) => void;
    setSurfaces: (surfaces: ElementSurfaces) => void;
    setRoof: (roof: RoofKind) => void;
    setLayers: (layers: Layers) => void;
    setPalette: (palette: ScenePalette) => void;
    setView: (view: ViewName) => void;
    zoomBy: (factor: number) => void;
    dispose: () => void;
}

export interface ViewerEvents {
    onSelect: (key: string | null) => void;
    onZoom: (percent: number) => void;
}

export { elementKey };

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

/** A tileable noise used as roughness and relief of the rough materials. */
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

/** A dome whose colour goes from the fog colour at the horizon to the sky colour overhead. */
function buildSky(palette: ScenePalette, radius: number): Mesh {
    const geometry = new SphereGeometry(radius, 32, 24);
    const positions = geometry.getAttribute("position");
    const colors = new Float32Array(positions.count * 3);
    const horizon = new Color(palette.fog);
    const sky = new Color(palette.sky);
    const mixed = new Color();

    for (let index = 0; index < positions.count; index += 1) {
        const height = Math.max(positions.getY(index) / radius, 0);

        mixed.copy(horizon).lerp(sky, Math.pow(height, SKY_FALLOFF));
        mixed.toArray(colors, index * 3);
    }

    geometry.setAttribute("color", new BufferAttribute(colors, 3));

    return new Mesh(
        geometry,
        new MeshBasicMaterial({
            vertexColors: true,
            side: BackSide,
            fog: false,
            toneMapped: false,
            depthWrite: false,
        }),
    );
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

function buildTerrain(terrain: StructureTerrain): Mesh {
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

    const mesh = new Mesh(geometry, standard(TERRAIN_COLOR, 0.95));
    mesh.receiveShadow = true;

    return mesh;
}

type ElementMesh = Mesh<BufferGeometry, MeshStandardMaterial>;

/** A concrete slab with its corner lines drawn. */
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

function glassMaterial(): MeshPhysicalMaterial {
    return new MeshPhysicalMaterial({
        color: GLASS_COLOR,
        transparent: true,
        opacity: 0.4,
        roughness: 0.1,
        metalness: 0.8,
        depthWrite: false,
    });
}

function frameMaterial(): MeshPhysicalMaterial {
    return new MeshPhysicalMaterial({
        color: FRAME_COLOR,
        roughness: 0.35,
        metalness: 0.9,
        clearcoat: 0.4,
        clearcoatRoughness: 0.3,
    });
}

/** A room is a hollow shell with real openings; every other element is a solid box. */
function buildElement(element: StructureElement, openings: Opening[]): ElementMesh {
    const solid = new BoxGeometry(element.width_m, element.height_m, element.depth_m);
    const shell = element.kind === "room" ? buildRoomShell(element, openings) : null;
    const geometry = applyMetricUVs(shell === null ? solid : shell.walls);
    const lines = shell === null ? new EdgesGeometry(solid) : shell.lines;
    const mesh: ElementMesh = new Mesh(geometry, buildMaterial(element));

    if (shell !== null) {
        solid.dispose();

        mesh.add(buildSlab(shell.band));

        if (shell.frames !== null) {
            const frames = new Mesh(shell.frames, frameMaterial());
            frames.castShadow = true;
            mesh.add(frames);
        }

        if (shell.door !== null) {
            const door = new Mesh(shell.door, standard(DOOR_COLOR, 0.7));
            door.castShadow = true;
            mesh.add(door);
        }

        if (shell.glass !== null) {
            mesh.add(new Mesh(shell.glass, glassMaterial()));
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

function buildRoof(rooms: StructureRoom[], kind: RoofKind): Mesh | null {
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

    const mesh = new Mesh(geometry, standard(ROOF_COLOR, 0.8));
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

function buildTree(x: number, y: number): Group {
    const tree = new Group();
    const trunk = new Mesh(new CylinderGeometry(0.12, 0.18, 1.6, 8), standard(TRUNK_COLOR, 0.9));
    const canopy = new Mesh(new IcosahedronGeometry(1.15, 1), standard(CANOPY_COLOR, 0.9));
    const crown = new Mesh(new IcosahedronGeometry(0.8, 1), standard(CANOPY_LIGHT_COLOR, 0.9));
    const variation = (Math.abs(Math.round(x * 13 + y * 7)) % 5) / 5;

    trunk.position.y = 0.8;
    canopy.position.y = 2.3;
    crown.position.set(0.25, 3.2, -0.15);

    for (const part of [trunk, canopy, crown]) {
        part.material.flatShading = true;
        part.castShadow = true;
    }

    tree.add(trunk, canopy, crown);
    tree.position.set(x, 0, -y);
    tree.scale.setScalar(0.85 + variation * 0.4);
    tree.rotation.y = variation * Math.PI * 2;

    return tree;
}

function buildEnvironment(structure: Structure): Group {
    const environment = new Group();
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
                environment.add(buildTree(x, y));
            }
        }
    }

    return environment;
}

function disposeMaterial(material: Material | Material[]): void {
    for (const item of Array.isArray(material) ? material : [material]) {
        item.dispose();
    }
}

function disposeObject(root: Object3D): void {
    root.traverse((child) => {
        if (child instanceof Mesh || child instanceof LineSegments) {
            child.geometry.dispose();
            disposeMaterial(child.material);
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
    renderer.toneMapping = ACESFilmicToneMapping;
    container.append(renderer.domElement);

    const canvas = renderer.domElement;
    const scene = new Scene();
    let palette = SCENE_PALETTES.dark;
    const fog = new Fog(palette.fog, 1, 2);
    scene.background = new Color(palette.fog);
    scene.fog = fog;

    const camera = new PerspectiveCamera(FIELD_OF_VIEW, 1, 0.1, 1000);

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI / 2 - 0.02;

    const pmrem = new PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const environmentMap = pmrem.fromScene(room, 0.04);
    room.dispose();
    pmrem.dispose();
    scene.environment = environmentMap.texture;
    scene.environmentIntensity = ENVIRONMENT_INTENSITY;

    const sun = new DirectionalLight(0xfff4e0, 2.6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(SHADOW_MAP_SIZE, SHADOW_MAP_SIZE);
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.03;
    sun.shadow.radius = SHADOW_RADIUS;

    const cyanAccent = new PointLight(CYAN_ACCENT, palette.accent, 0, 0);
    const magentaAccent = new PointLight(MAGENTA_ACCENT, palette.accent, 0, 0);
    scene.add(
        new AmbientLight(0xffffff, 0.2),
        new HemisphereLight(0xbfd9ff, 0x2a3326, 0.6),
        sun,
        sun.target,
        cyanAccent,
        magentaAccent,
    );

    const grain = buildGrain();
    const outlineMaterial = new LineMaterial({
        color: SELECTION_COLOR,
        linewidth: OUTLINE_WIDTH_PX,
    });
    const raycaster = new Raycaster();
    const pointer = new Vector2();
    const bounds = new Sphere(new Vector3(), 1);

    let model: Group | null = null;
    let elements: ElementMesh[] = [];
    let roof: Mesh | null = null;
    let environment: Group | null = null;
    let grid: GridHelper | null = null;
    let ground: Mesh | null = null;
    let sky: Mesh | null = null;
    let layers: Layers = { rooms: true, roof: true, environment: true, grid: true };
    let selectedKey: string | null = null;
    let colors: ElementColors | null = null;
    let surfaces: ElementSurfaces = {};
    let roofKind: RoofKind = "gable";
    let roofRooms: StructureRoom[] = [];
    let outline: LineSegments2 | null = null;
    let hoveredKey: string | null = null;
    let framed = false;
    let pressX = 0;
    let pressY = 0;
    let lastZoom = 0;

    function resize(): void {
        const width = container.clientWidth;
        const height = container.clientHeight;

        if (width === 0 || height === 0) {
            return;
        }

        renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
        renderer.setSize(width, height, false);
        outlineMaterial.resolution.set(width, height);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    }

    function viewDistance(): number {
        const fitAngle = Math.min(FIELD_OF_VIEW, FIELD_OF_VIEW * camera.aspect) / 2;

        return bounds.radius / Math.sin((fitAngle * Math.PI) / 180);
    }

    function reportZoom(): void {
        const percent = Math.round(
            (viewDistance() / camera.position.distanceTo(controls.target)) * 100,
        );

        if (percent !== lastZoom) {
            lastZoom = percent;
            events.onZoom(percent);
        }
    }

    function fitLimits(): void {
        const distance = viewDistance();

        camera.near = distance / 200;
        camera.far = distance * 12;
        camera.updateProjectionMatrix();
        controls.minDistance = bounds.radius * 0.3;
        controls.maxDistance = distance * 4;

        sun.position.copy(bounds.center).addScaledVector(LIGHT_DIRECTION, bounds.radius * 2);
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

    function setView(view: ViewName): void {
        camera.position.copy(bounds.center).addScaledVector(VIEW_DIRECTIONS[view], viewDistance());
        controls.target.copy(bounds.center);
        controls.update();
        reportZoom();
    }

    function zoomBy(factor: number): void {
        const offset = camera.position.clone().sub(controls.target);
        const distance = Math.min(
            Math.max(offset.length() / factor, controls.minDistance),
            controls.maxDistance,
        );

        camera.position.copy(controls.target).add(offset.setLength(distance));
        controls.update();
        reportZoom();
    }

    function paint(): void {
        for (const mesh of elements) {
            const key = mesh.userData.key as string;

            const surface =
                SURFACE_MATERIALS[
                    surfaceOf(surfaces, key, mesh.userData.kind as StructureElement["kind"])
                ];
            const opacity = colors === null ? surface.opacity : 1;

            mesh.material.color.setHex(
                colors === null ? surface.color : (colors.get(key) ?? MUTED_COLOR),
            );
            mesh.material.roughness = surface.roughness;
            mesh.material.metalness = surface.metalness;
            mesh.material.opacity = opacity;

            const relief = colors === null && surface.grain > 0 ? grain : null;

            if (mesh.material.bumpMap !== relief) {
                mesh.material.bumpMap = relief;
                mesh.material.roughnessMap = relief;
                mesh.material.needsUpdate = true;
            }

            mesh.material.bumpScale = surface.grain * GRAIN_BUMP;

            if (mesh.material.transparent !== opacity < 1) {
                mesh.material.transparent = opacity < 1;
                mesh.material.needsUpdate = true;
            }

            const edges = mesh.userData.edges as LineBasicMaterial;
            const selected = key === selectedKey;

            edges.color.setHex(selected ? SELECTION_COLOR : EDGE_COLOR);
            edges.opacity = selected ? 1 : 0.6;
            mesh.material.emissive.setHex(!selected && key === hoveredKey ? HOVER_COLOR : 0x000000);
            mesh.material.emissiveIntensity = 0.2;
        }
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

    function applyLayers(): void {
        for (const mesh of elements) {
            mesh.visible = layers.rooms || mesh.userData.space !== true;
        }

        if (roof !== null) {
            roof.visible = layers.roof && layers.rooms;
        }

        if (environment !== null) {
            environment.visible = layers.environment;
        }

        if (grid !== null) {
            grid.visible = layers.grid;
        }
    }

    function setPalette(next: ScenePalette): void {
        palette = next;
        scene.background = new Color(palette.fog);
        fog.color.setHex(palette.fog);
        cyanAccent.intensity = palette.accent;
        magentaAccent.intensity = palette.accent;

        if (model !== null) {
            buildGrid(model);
            applyLayers();
        }
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
        ground.position.set(bounds.center.x, -SLAB_THICKNESS_M - 0.08, bounds.center.z);
        ground.receiveShadow = true;

        grid = new GridHelper(bounds.radius * 6, 60, palette.grid, palette.grid);
        grid.position.set(bounds.center.x, -SLAB_THICKNESS_M - 0.05, bounds.center.z);
        parent.add(sky, ground, grid);
    }

    function setLayers(next: Layers): void {
        layers = next;
        applyLayers();
    }

    function clear(): void {
        removeOutline();

        if (model !== null) {
            scene.remove(model);
            disposeObject(model);
            model = null;
            elements = [];
            roof = null;
            environment = null;
            grid = null;
            ground = null;
            sky = null;
        }
    }

    function buildElements(structure: Structure): ElementMesh[] {
        const openings = placeOpenings(structure.rooms);

        return [...structure.rooms, ...structure.components].map((element) =>
            buildElement(element, openings.get(elementKey(element)) ?? []),
        );
    }

    function show(structure: Structure): void {
        clear();

        elements = buildElements(structure);
        roofRooms = structure.rooms;
        roof = buildRoof(roofRooms, roofKind);
        environment = buildEnvironment(structure);
        model = new Group();
        model.add(...structure.terrains.map(buildTerrain), ...elements, environment);

        if (roof !== null) {
            model.add(roof);
        }

        new Box3().setFromObject(model).getBoundingSphere(bounds);
        bounds.radius = Math.max(bounds.radius, 1);

        buildGrid(model);
        scene.add(model);

        hoveredKey = null;
        resize();
        fitLimits();
        applyLayers();
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

        roof = buildRoof(roofRooms, roofKind);

        if (roof !== null) {
            model.add(roof);
        }

        applyLayers();
    }

    function setSurfaces(next: ElementSurfaces): void {
        surfaces = next;
        paint();
    }

    function pick(event: PointerEvent): string | null {
        const box = canvas.getBoundingClientRect();

        pointer.set(
            ((event.clientX - box.left) / box.width) * 2 - 1,
            -((event.clientY - box.top) / box.height) * 2 + 1,
        );
        raycaster.setFromCamera(pointer, camera);

        const [hit] = raycaster.intersectObjects(
            elements.filter((mesh) => mesh.visible),
            false,
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
        const key = event.buttons === 0 ? pick(event) : null;

        if (key !== hoveredKey) {
            hoveredKey = key;
            canvas.style.cursor = key === null ? "" : "pointer";
            paint();
        }
    }

    function handlePointerLeave(): void {
        hoveredKey = null;
        canvas.style.cursor = "";
        paint();
    }

    const observer = new ResizeObserver(resize);
    observer.observe(container);
    window.addEventListener("resize", resize);
    controls.addEventListener("change", reportZoom);
    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerleave", handlePointerLeave);
    resize();

    renderer.setAnimationLoop(() => {
        controls.update();

        const reach = camera.position.distanceTo(controls.target);

        fog.near = reach + bounds.radius;
        fog.far = reach + bounds.radius * FOG_DEPTH_FACTOR;
        renderer.render(scene, camera);
    });

    function dispose(): void {
        renderer.setAnimationLoop(null);
        observer.disconnect();
        window.removeEventListener("resize", resize);
        controls.removeEventListener("change", reportZoom);
        canvas.removeEventListener("pointerdown", handlePointerDown);
        canvas.removeEventListener("pointerup", handlePointerUp);
        canvas.removeEventListener("pointermove", handlePointerMove);
        canvas.removeEventListener("pointerleave", handlePointerLeave);
        controls.dispose();
        clear();
        outlineMaterial.dispose();
        environmentMap.dispose();
        grain.dispose();
        sun.shadow.map?.dispose();
        sun.dispose();
        renderer.dispose();
        canvas.remove();
    }

    return {
        show,
        select,
        setColors,
        setSurfaces,
        setRoof,
        setLayers,
        setPalette,
        setView,
        zoomBy,
        dispose,
    };
}
