import {
    ACESFilmicToneMapping,
    InstancedMesh,
    Material,
    Mesh,
    MeshBasicMaterial,
    Object3D,
    PCFShadowMap,
    PMREMGenerator,
    PerspectiveCamera,
    Scene,
    WebGLRenderer,
} from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

import { createPostprocessing } from "../postprocessing";
import { buildCityBackdrop } from "./cityBackdrop";
import { createInteriorCamera, type Viewpoint } from "./interiorCamera";
import { buildLoftScene } from "./loftScene";

const FIELD_OF_VIEW = 62;
const MAX_PIXEL_RATIO = 2;
const EXPOSURE = 0.95;
const ENVIRONMENT_INTENSITY = 0.3;
const BLOOM_STRENGTH = 0.38;

export type ViewpointId = "living" | "mezzanine" | "stairs" | "window";

export const VIEWPOINTS: Record<ViewpointId, Viewpoint> = {
    living: { position: [-3.4, 1.7, 0.9], target: [-0.6, 1.5, -3.2] },
    mezzanine: { position: [-2.6, 4.5, 2.6], target: [0.4, 2.6, -3.5] },
    stairs: { position: [0.6, 1.7, -4.6], target: [3.2, 1.9, 0.4] },
    window: { position: [0.4, 1.7, -2.2], target: [0.2, 1.9, -5.6] },
};

export interface InteriorViewer {
    setViewpoint: (id: ViewpointId) => void;
    setNeon: (visible: boolean) => void;
    dispose: () => void;
}

function disposeObject(root: Object3D): void {
    root.traverse((child) => {
        if (child instanceof Mesh) {
            const materials: Material[] = Array.isArray(child.material)
                ? child.material
                : [child.material];

            child.geometry.dispose();

            for (const material of materials) {
                if (material instanceof MeshBasicMaterial) {
                    material.map?.dispose();
                }

                material.dispose();
            }
        }

        if (child instanceof InstancedMesh) {
            child.dispose();
        }
    });
}

export function createInteriorViewer(container: HTMLElement): InteriorViewer {
    const renderer = new WebGLRenderer({ antialias: true });

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFShadowMap;
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = EXPOSURE;
    container.append(renderer.domElement);

    const canvas = renderer.domElement;
    const scene = new Scene();
    const camera = new PerspectiveCamera(FIELD_OF_VIEW, 1, 0.05, 1200);
    const loft = buildLoftScene();
    const city = buildCityBackdrop();
    const rig = createInteriorCamera(camera, canvas, loft.room, loft.solids, invalidate);
    const post = createPostprocessing(renderer, scene, camera);
    const pmrem = new PMREMGenerator(renderer);
    const reflections = new RoomEnvironment();
    const environmentMap = pmrem.fromScene(reflections, 0.04);

    reflections.dispose();
    pmrem.dispose();
    scene.environment = environmentMap.texture;
    scene.environmentIntensity = ENVIRONMENT_INTENSITY;
    scene.add(city, loft.group);
    post.setBloom(BLOOM_STRENGTH);

    let viewport = "";
    let dirty = true;
    let placed = false;

    function invalidate(): void {
        dirty = true;
    }

    function render(): void {
        dirty = false;
        post.render();
    }

    /** Resizing clears the canvas, so it is drawn again at once instead of on the next frame. */
    function resize(): void {
        const width = container.clientWidth;
        const height = container.clientHeight;
        const pixelRatio = Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO);
        const next = `${width}x${height}@${pixelRatio}`;

        if (width === 0 || height === 0 || next === viewport) {
            return;
        }

        viewport = next;
        renderer.setPixelRatio(pixelRatio);
        renderer.setSize(width, height, false);
        post.setSize(width, height, pixelRatio);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        render();
    }

    /** The first viewpoint is set at once; later ones fly there. */
    function setViewpoint(id: ViewpointId): void {
        rig.flyTo(VIEWPOINTS[id], placed);
        placed = true;
        invalidate();
    }

    const observer = new ResizeObserver(resize);

    observer.observe(container);
    window.addEventListener("resize", resize);
    canvas.addEventListener("webglcontextrestored", invalidate);
    setViewpoint("living");
    resize();

    renderer.setAnimationLoop((time) => {
        rig.update(time);

        if (dirty) {
            render();
        }
    });

    return {
        setViewpoint,
        setNeon: (visible) => {
            loft.neon.visible = visible;
            invalidate();
        },
        dispose: () => {
            renderer.setAnimationLoop(null);
            observer.disconnect();
            window.removeEventListener("resize", resize);
            canvas.removeEventListener("webglcontextrestored", invalidate);
            rig.dispose();
            disposeObject(scene);
            loft.dispose();
            post.dispose();
            environmentMap.dispose();
            renderer.dispose();
            renderer.forceContextLoss();
            canvas.remove();
        },
    };
}
