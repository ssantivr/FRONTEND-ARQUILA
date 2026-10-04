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
    LineBasicMaterial,
    LineSegments,
    Material,
    Mesh,
    MeshStandardMaterial,
    Object3D,
    PCFShadowMap,
    PerspectiveCamera,
    Raycaster,
    Scene,
    Shape,
    Sphere,
    Vector2,
    Vector3,
    WebGLRenderer,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import type { Structure, StructureRoom, StructureTerrain } from "../types/api";

const BACKGROUND = 0x090a0f;
const CYAN = 0x00f0ff;
const MAGENTA = 0xff007f;
const TERRAIN_COLOR = 0x18222f;
const ROOM_COLOR = 0x2a8fa8;
const VOLUME_COLOR = 0x33455c;
const GRID_COLOR = 0x12303a;
const SLAB_THICKNESS_M = 0.3;
const FIELD_OF_VIEW = 45;
const MAX_PIXEL_RATIO = 2;
const SHADOW_MAP_SIZE = 2048;
const CLICK_TOLERANCE_PX = 4;
const LIGHT_DIRECTION = new Vector3(-0.5, 1, 0.6).normalize();
const VIEW_DIRECTION = new Vector3(0.7, 0.6, 1).normalize();

export interface StructureViewer {
    show: (structure: Structure) => void;
    select: (key: string | null) => void;
    resetView: () => void;
    dispose: () => void;
}

export function roomKey(room: StructureRoom): string {
    return `${room.kind}-${room.id}`;
}

type RoomMesh = Mesh<BoxGeometry, MeshStandardMaterial>;

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

    const material = new MeshStandardMaterial({
        color: TERRAIN_COLOR,
        roughness: 0.9,
        metalness: 0.05,
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1,
    });
    const mesh = new Mesh(geometry, material);
    mesh.receiveShadow = true;

    return mesh;
}

function buildRoom(room: StructureRoom): RoomMesh {
    const geometry = new BoxGeometry(room.width_m, room.height_m, room.depth_m);
    const material = new MeshStandardMaterial({
        color: room.kind === "room" ? ROOM_COLOR : VOLUME_COLOR,
        roughness: 0.45,
        metalness: 0.15,
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1,
    });
    const mesh = new Mesh(geometry, material);
    mesh.position.set(room.x_m, room.base_m + room.height_m / 2, -room.y_m);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.key = roomKey(room);

    const edges = new LineSegments(
        new EdgesGeometry(geometry),
        new LineBasicMaterial({ color: CYAN, transparent: true, opacity: 0.45 }),
    );
    mesh.add(edges);

    return mesh;
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
    onSelect: (key: string | null) => void,
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

    const sun = new DirectionalLight(0xffffff, 2.6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(SHADOW_MAP_SIZE, SHADOW_MAP_SIZE);
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.03;
    scene.add(new AmbientLight(0xffffff, 0.8), sun, sun.target);

    const raycaster = new Raycaster();
    const pointer = new Vector2();
    const bounds = new Sphere(new Vector3(), 1);

    let model: Group | null = null;
    let rooms: RoomMesh[] = [];
    let selectedKey: string | null = null;
    let hoveredKey: string | null = null;
    let framed = false;
    let pressX = 0;
    let pressY = 0;

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

    function resetView(): void {
        camera.position.copy(bounds.center).addScaledVector(VIEW_DIRECTION, viewDistance());
        controls.target.copy(bounds.center);
        controls.update();
    }

    function paint(): void {
        for (const mesh of rooms) {
            const key = mesh.userData.key as string;
            const edges = mesh.children[0] as LineSegments<EdgesGeometry, LineBasicMaterial>;

            if (key === selectedKey) {
                mesh.material.emissive.setHex(MAGENTA);
                mesh.material.emissiveIntensity = 0.55;
                edges.material.color.setHex(MAGENTA);
                edges.material.opacity = 1;
            } else {
                mesh.material.emissive.setHex(key === hoveredKey ? CYAN : 0x000000);
                mesh.material.emissiveIntensity = 0.25;
                edges.material.color.setHex(CYAN);
                edges.material.opacity = key === hoveredKey ? 0.9 : 0.45;
            }
        }
    }

    function clear(): void {
        if (model !== null) {
            scene.remove(model);
            disposeObject(model);
            model = null;
            rooms = [];
        }
    }

    function show(structure: Structure): void {
        clear();

        rooms = structure.rooms.map(buildRoom);
        model = new Group();
        model.add(...structure.terrains.map(buildTerrain), ...rooms);
        new Box3().setFromObject(model).getBoundingSphere(bounds);
        bounds.radius = Math.max(bounds.radius, 1);

        const grid = new GridHelper(bounds.radius * 6, 60, GRID_COLOR, GRID_COLOR);
        grid.position.set(bounds.center.x, -SLAB_THICKNESS_M - 0.05, bounds.center.z);
        model.add(grid);
        scene.add(model);

        hoveredKey = null;
        resize();
        fitLimits();
        paint();

        if (!framed) {
            resetView();
            framed = true;
        }
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

        const [hit] = raycaster.intersectObjects(rooms, false);

        return hit === undefined ? null : (hit.object.userData.key as string);
    }

    function handlePointerDown(event: PointerEvent): void {
        pressX = event.clientX;
        pressY = event.clientY;
    }

    function handlePointerUp(event: PointerEvent): void {
        const moved = Math.hypot(event.clientX - pressX, event.clientY - pressY);

        if (event.button === 0 && moved <= CLICK_TOLERANCE_PX) {
            onSelect(pick(event));
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

    return { show, select, resetView, dispose };
}
