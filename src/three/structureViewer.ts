import {
    ACESFilmicToneMapping,
    AmbientLight,
    Box3,
    BoxGeometry,
    Color,
    DirectionalLight,
    EdgesGeometry,
    ExtrudeGeometry,
    GridHelper,
    Group,
    HemisphereLight,
    LineBasicMaterial,
    LineSegments,
    Material,
    Mesh,
    MeshPhysicalMaterial,
    MeshStandardMaterial,
    Object3D,
    PCFShadowMap,
    PerspectiveCamera,
    PlaneGeometry,
    Raycaster,
    Scene,
    Shape,
    Sphere,
    Vector2,
    Vector3,
    WebGLRenderer,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import type { Structure, StructureElement, StructureTerrain } from "../types/api";

const BACKGROUND = 0x090a0f;
const CYAN = 0x00f0ff;
const MAGENTA = 0xff007f;
const TERRAIN_COLOR = 0x35634a;
const WALL_COLOR = 0xa9583f;
const VOLUME_COLOR = 0x8d6a5a;
const CONCRETE_COLOR = 0xaab4bf;
const ROOF_COLOR = 0xb0655a;
const GLASS_COLOR = 0x2f5f8a;
const DOOR_COLOR = 0x4a3526;
const TRUNK_COLOR = 0x5a4030;
const CANOPY_COLOR = 0x3f7a4f;
const EDGE_COLOR = 0x1b1410;
const GRID_COLOR = 0x12303a;
const SLAB_THICKNESS_M = 0.3;
const FIELD_OF_VIEW = 45;
const MAX_PIXEL_RATIO = 2;
const SHADOW_MAP_SIZE = 2048;
const CLICK_TOLERANCE_PX = 4;
const SURFACE_GAP_M = 0.02;
const WINDOW_SIZE_M = 1.1;
const WINDOW_SILL_M = 0.9;
const WINDOW_SPACING_M = 3;
const DOOR_WIDTH_M = 0.95;
const DOOR_HEIGHT_M = 2.1;
const ROOF_OVERHANG_M = 0.4;
const TREE_SPACING_M = 4.5;
const LIGHT_DIRECTION = new Vector3(-0.5, 1, 0.6).normalize();

export type ViewName = "isometric" | "front" | "side" | "top";
export type LayerName = "rooms" | "roof" | "environment" | "grid";
export type Layers = Record<LayerName, boolean>;

const VIEW_DIRECTIONS: Record<ViewName, Vector3> = {
    isometric: new Vector3(0.7, 0.6, 1).normalize(),
    front: new Vector3(0, 0.22, 1).normalize(),
    side: new Vector3(1, 0.22, 0).normalize(),
    top: new Vector3(0, 1, 0.001).normalize(),
};

export interface StructureViewer {
    show: (structure: Structure) => void;
    select: (key: string | null) => void;
    setLayers: (layers: Layers) => void;
    setView: (view: ViewName) => void;
    zoomBy: (factor: number) => void;
    dispose: () => void;
}

export interface ViewerEvents {
    onSelect: (key: string | null) => void;
    onZoom: (percent: number) => void;
}

interface Rect {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
}

export function elementKey(element: StructureElement): string {
    return `${element.kind}-${element.id}`;
}

export function isSpace(element: StructureElement): boolean {
    return element.kind === "room" || element.kind === "volume";
}

function rectOf(element: StructureElement): Rect {
    return {
        minX: element.x_m - element.width_m / 2,
        maxX: element.x_m + element.width_m / 2,
        minY: element.y_m - element.depth_m / 2,
        maxY: element.y_m + element.depth_m / 2,
    };
}

function unionOf(rects: Rect[]): Rect {
    return {
        minX: Math.min(...rects.map((rect) => rect.minX)),
        maxX: Math.max(...rects.map((rect) => rect.maxX)),
        minY: Math.min(...rects.map((rect) => rect.minY)),
        maxY: Math.max(...rects.map((rect) => rect.maxY)),
    };
}

function near(first: number, second: number): boolean {
    return Math.abs(first - second) < 0.01;
}

function insidePolygon(x: number, y: number, outline: StructureTerrain["outline"]): boolean {
    let inside = false;

    outline.forEach((point, index) => {
        const previous = outline[(index + outline.length - 1) % outline.length];
        const crosses =
            point.y_m > y !== previous.y_m > y &&
            x < ((previous.x_m - point.x_m) * (y - point.y_m)) / (previous.y_m - point.y_m) + point.x_m;

        if (crosses) {
            inside = !inside;
        }
    });

    return inside;
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
    if (element.kind === "room") {
        return new MeshPhysicalMaterial({
            color: WALL_COLOR,
            roughness: 0.75,
            metalness: 0,
            clearcoat: 0.15,
            clearcoatRoughness: 0.6,
            polygonOffset: true,
            polygonOffsetFactor: 1,
            polygonOffsetUnits: 1,
        });
    }

    return element.kind === "volume"
        ? standard(VOLUME_COLOR, 0.8)
        : standard(CONCRETE_COLOR, 0.85);
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

type ElementMesh = Mesh<BoxGeometry, MeshStandardMaterial>;

interface Face {
    exterior: boolean;
    length: number;
    rotation: number;
}

function addOpenings(mesh: ElementMesh, element: StructureElement, level: Rect, door: boolean): void {
    const rect = rectOf(element);
    const faces: Face[] = [
        { exterior: near(rect.minY, level.minY), length: element.width_m, rotation: 0 },
        { exterior: near(rect.maxX, level.maxX), length: element.depth_m, rotation: Math.PI / 2 },
        { exterior: near(rect.maxY, level.maxY), length: element.width_m, rotation: Math.PI },
        { exterior: near(rect.minX, level.minX), length: element.depth_m, rotation: -Math.PI / 2 },
    ];
    const fitsWindow = element.height_m >= WINDOW_SILL_M + WINDOW_SIZE_M + 0.3;
    let doorPending = door && element.height_m >= DOOR_HEIGHT_M + 0.1;

    for (const face of faces) {
        if (!face.exterior || face.length < WINDOW_SIZE_M + 0.6) {
            continue;
        }

        const slots = Math.max(1, Math.floor(face.length / WINDOW_SPACING_M));
        const across = face.rotation === 0 || face.rotation === Math.PI;
        const offset = (across ? element.depth_m : element.width_m) / 2 + SURFACE_GAP_M;

        for (let slot = 0; slot < slots; slot += 1) {
            const isDoor = doorPending && face.rotation === 0 && slot === 0;
            const width = isDoor ? DOOR_WIDTH_M : WINDOW_SIZE_M;
            const height = isDoor ? DOOR_HEIGHT_M : WINDOW_SIZE_M;

            if (!isDoor && !fitsWindow) {
                continue;
            }

            const opening = new Mesh(
                new PlaneGeometry(width, height),
                isDoor
                    ? new MeshStandardMaterial({ color: DOOR_COLOR, roughness: 0.7 })
                    : new MeshStandardMaterial({
                          color: GLASS_COLOR,
                          roughness: 0.15,
                          metalness: 0.5,
                      }),
            );
            const pivot = new Group();
            opening.position.set(
                -face.length / 2 + ((slot + 0.5) * face.length) / slots,
                -element.height_m / 2 + (isDoor ? 0 : WINDOW_SILL_M) + height / 2,
                offset,
            );
            pivot.rotation.y = face.rotation;
            pivot.add(opening);
            mesh.add(pivot);

            if (isDoor) {
                doorPending = false;
            }
        }
    }
}

function buildElement(element: StructureElement): ElementMesh {
    const geometry = new BoxGeometry(element.width_m, element.height_m, element.depth_m);
    const mesh = new Mesh(geometry, buildMaterial(element));
    mesh.position.set(element.x_m, element.base_m + element.height_m / 2, -element.y_m);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.key = elementKey(element);
    mesh.userData.space = isSpace(element);

    const edges = new LineSegments(
        new EdgesGeometry(geometry),
        new LineBasicMaterial({ color: EDGE_COLOR, transparent: true, opacity: 0.6 }),
    );
    mesh.add(edges);

    return mesh;
}

function buildRoof(spaces: StructureElement[]): Mesh | null {
    if (spaces.length === 0) {
        return null;
    }

    const topBase = Math.max(...spaces.map((space) => space.base_m));
    const top = spaces.filter((space) => space.base_m === topBase);
    const area = unionOf(top.map(rectOf));
    const eaves = Math.max(...top.map((space) => space.base_m + space.height_m));
    const width = area.maxX - area.minX;
    const depth = area.maxY - area.minY;
    const alongX = width >= depth;
    const span = (alongX ? depth : width) + 2 * ROOF_OVERHANG_M;
    const length = (alongX ? width : depth) + 2 * ROOF_OVERHANG_M;
    const rise = Math.max(0.8, span * 0.28);

    const profile = new Shape();
    profile.moveTo(-span / 2, 0);
    profile.lineTo(span / 2, 0);
    profile.lineTo(0, rise);
    profile.closePath();

    const geometry = new ExtrudeGeometry(profile, { depth: length, bevelEnabled: false });
    geometry.translate(0, 0, -length / 2);

    if (alongX) {
        geometry.rotateY(Math.PI / 2);
    }

    const mesh = new Mesh(geometry, standard(ROOF_COLOR, 0.8));
    mesh.position.set(
        (area.minX + area.maxX) / 2,
        eaves + SURFACE_GAP_M,
        -(area.minY + area.maxY) / 2,
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return mesh;
}

function buildTree(x: number, y: number): Group {
    const tree = new Group();
    const trunk = new Mesh(new BoxGeometry(0.3, 1.6, 0.3), standard(TRUNK_COLOR, 0.9));
    const canopy = new Mesh(new BoxGeometry(1.8, 1.8, 1.8), standard(CANOPY_COLOR, 0.9));

    trunk.position.y = 0.8;
    canopy.position.y = 2.5;
    trunk.castShadow = true;
    canopy.castShadow = true;
    tree.add(trunk, canopy);
    tree.position.set(x, 0, -y);

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
    scene.background = new Color(BACKGROUND);

    const camera = new PerspectiveCamera(FIELD_OF_VIEW, 1, 0.1, 1000);

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI / 2 - 0.02;

    const sun = new DirectionalLight(0xfff4e0, 2.8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(SHADOW_MAP_SIZE, SHADOW_MAP_SIZE);
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.03;
    scene.add(
        new AmbientLight(0xffffff, 0.45),
        new HemisphereLight(0xbfd9ff, 0x2a3326, 0.7),
        sun,
        sun.target,
    );

    const raycaster = new Raycaster();
    const pointer = new Vector2();
    const bounds = new Sphere(new Vector3(), 1);

    let model: Group | null = null;
    let elements: ElementMesh[] = [];
    let roof: Mesh | null = null;
    let environment: Group | null = null;
    let grid: GridHelper | null = null;
    let layers: Layers = { rooms: true, roof: true, environment: true, grid: true };
    let selectedKey: string | null = null;
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
    }

    function setView(view: ViewName): void {
        camera.position
            .copy(bounds.center)
            .addScaledVector(VIEW_DIRECTIONS[view], viewDistance());
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

            if (key === selectedKey) {
                mesh.material.emissive.setHex(MAGENTA);
                mesh.material.emissiveIntensity = 0.5;
            } else {
                mesh.material.emissive.setHex(key === hoveredKey ? CYAN : 0x000000);
                mesh.material.emissiveIntensity = 0.2;
            }
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

    function setLayers(next: Layers): void {
        layers = next;
        applyLayers();
    }

    function clear(): void {
        if (model !== null) {
            scene.remove(model);
            disposeObject(model);
            model = null;
            elements = [];
            roof = null;
            environment = null;
            grid = null;
        }
    }

    function buildElements(structure: Structure): ElementMesh[] {
        const levels = new Map<number, Rect>();
        const ground = Math.min(...structure.rooms.map((room) => room.base_m));
        let doorPlaced = false;

        for (const room of structure.rooms) {
            const level = levels.get(room.plan_id);
            levels.set(room.plan_id, level ? unionOf([level, rectOf(room)]) : rectOf(room));
        }

        return [...structure.rooms, ...structure.components].map((element) => {
            const mesh = buildElement(element);
            const level = levels.get(element.plan_id);

            if (isSpace(element) && level !== undefined) {
                const atFront = near(rectOf(element).minY, level.minY);
                const door = !doorPlaced && element.base_m === ground && atFront;

                addOpenings(mesh, element, level, door);
                doorPlaced = doorPlaced || door;
            }

            return mesh;
        });
    }

    function show(structure: Structure): void {
        clear();

        elements = buildElements(structure);
        roof = buildRoof(structure.rooms);
        environment = buildEnvironment(structure);
        model = new Group();
        model.add(...structure.terrains.map(buildTerrain), ...elements, environment);

        if (roof !== null) {
            model.add(roof);
        }

        new Box3().setFromObject(model).getBoundingSphere(bounds);
        bounds.radius = Math.max(bounds.radius, 1);

        grid = new GridHelper(bounds.radius * 6, 60, GRID_COLOR, GRID_COLOR);
        grid.position.set(bounds.center.x, -SLAB_THICKNESS_M - 0.05, bounds.center.z);
        model.add(grid);
        scene.add(model);

        hoveredKey = null;
        resize();
        fitLimits();
        applyLayers();
        paint();

        if (!framed) {
            setView("isometric");
            framed = true;
        }

        reportZoom();
    }

    function select(key: string | null): void {
        selectedKey = key;
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
        sun.shadow.map?.dispose();
        sun.dispose();
        renderer.dispose();
        canvas.remove();
    }

    return { show, select, setLayers, setView, zoomBy, dispose };
}
