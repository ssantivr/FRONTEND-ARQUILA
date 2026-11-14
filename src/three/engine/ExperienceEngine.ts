import {
    ACESFilmicToneMapping,
    Color,
    Fog,
    Group,
    OrthographicCamera,
    PCFShadowMap,
    PerspectiveCamera,
    Plane,
    Scene,
    Sphere,
    Vector3,
    WebGLRenderer,
} from "three";
import type { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";

import { createCameraRig, type CameraRig } from "../camera/cameraRig";
import { matchOrthographic } from "../camera/frameToFit";
import type { Projection } from "../camera/views";
import type { ScenePalette } from "../lightingPalette";
import { buildEnvironmentMap, createSceneLights, type SceneLights } from "../materials/environment";
import { createPostprocessing, type Postprocessing } from "../postprocessing";
import {
    DEFAULT_QUALITY,
    fittedProfile,
    pixelRatioFor,
    type PreviewQuality,
    type QualityProfile,
} from "./quality";
import { createRenderLoop, type RenderLoop } from "./renderLoop";
import { createResources, type Resources } from "./resources";
import { jitterSample, type StillJob } from "./still";

const FIELD_OF_VIEW = 45;
const FOG_DEPTH_FACTOR = 5;
const BLOOM_STRENGTH = 0.55;
export const CUT_DISABLED_M = 1e6;

export type { StillJob } from "./still";

export interface EngineOptions {
    palette: ScenePalette;
    /** The camera moved: there is a new frame to draw and the reported figures may change. */
    onCameraChange: () => void;
    /** The canvas took a new size, before the frame at that size is drawn. */
    onViewport: () => void;
    /** Runs every frame, before the engine decides whether to draw. */
    onStep: (time: number, elapsedSeconds: number) => void;
    onContextLost?: () => void;
}

/**
 * What any 3D scene of the product needs, whatever it shows: the renderer, the cameras, the
 * lights, the render loop, the quality and the registry of resources. It knows nothing about
 * buildings.
 */
export interface ExperienceEngine {
    canvas: HTMLCanvasElement;
    scene: Scene;
    /** Editing aids drawn over the model (gizmo, measurement). They are on screen only: images
     *  of the model (`capture`, `renderStill`) are drawn without them. */
    overlay: Group;
    rig: CameraRig;
    lights: SceneLights;
    resources: Resources;
    bounds: Sphere;
    cutPlane: Plane;
    cutPlanes: Plane[];
    loop: RenderLoop;
    maxImageSize: number;
    /** Lines with a width in pixels need to know the size of the canvas. */
    trackLineMaterials: (...materials: LineMaterial[]) => void;
    /** Something in the scene changed: draw again, shadows included. */
    invalidate: () => void;
    activeCamera: () => PerspectiveCamera | OrthographicCamera;
    resize: () => void;
    width: () => number;
    setProjection: (projection: Projection) => void;
    applyPalette: (palette: ScenePalette) => void;
    setExposure: (exposure: number) => void;
    setQuality: (quality: PreviewQuality) => void;
    capture: () => string;
    renderStill: (job: StillJob) => Promise<HTMLCanvasElement | null>;
    start: () => void;
    /** Stops the loop and every listener; what is drawn stays until `dispose`. */
    stop: () => void;
    dispose: () => void;
}

export function createExperienceEngine(
    container: HTMLElement,
    options: EngineOptions,
): ExperienceEngine {
    const renderer = new WebGLRenderer({ antialias: true });
    let profile: QualityProfile = fittedProfile(
        DEFAULT_QUALITY,
        renderer.capabilities.maxTextureSize,
    );
    let quality = DEFAULT_QUALITY;

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFShadowMap;
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = true;
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.localClippingEnabled = true;
    container.append(renderer.domElement);

    const canvas = renderer.domElement;
    const scene = new Scene();
    const overlay = new Group();
    const fog = new Fog(options.palette.fog, 1, 2);
    const camera = new PerspectiveCamera(FIELD_OF_VIEW, 1, 0.1, 1000);
    // The orbit controls keep driving the perspective camera. The orthographic one follows it and
    // is the camera that draws and picks while that projection is on.
    const orthographic = new OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);
    const rig = createCameraRig(camera, canvas, handleCameraChange);
    const cutPlane = new Plane(new Vector3(0, -1, 0), CUT_DISABLED_M);
    const cutPlanes = [cutPlane];
    const post: Postprocessing = createPostprocessing(renderer, scene, camera, {
        occlusion: profile.occlusion,
        msaaSamples: profile.msaaSamples,
        clippingPlanes: cutPlanes,
    });
    const resources = createResources();
    const bounds = new Sphere(new Vector3(), 1);
    const lineMaterials: LineMaterial[] = [];
    const lights = createSceneLights(scene, options.palette, profile.shadowMapSize);
    const loop = createRenderLoop({
        schedule: (callback) => renderer.setAnimationLoop(callback),
        step: options.onStep,
        draw,
    });
    const environmentMap = resources.track(buildEnvironmentMap(renderer));
    const observer = new ResizeObserver(resize);
    let projection: Projection = "perspective";
    let viewport = "";

    scene.background = new Color(options.palette.fog);
    scene.fog = fog;
    scene.environment = environmentMap.texture;
    scene.environmentIntensity = options.palette.reflections;
    overlay.name = "overlay";
    scene.add(overlay);

    function handleCameraChange(): void {
        loop.invalidate();
        options.onCameraChange();
    }

    function invalidate(): void {
        renderer.shadowMap.needsUpdate = true;
        loop.invalidate();
    }

    function syncOrthographic(): void {
        if (projection === "orthographic") {
            matchOrthographic(orthographic, camera, rig.distance());
        }
    }

    function activeCamera(): PerspectiveCamera | OrthographicCamera {
        syncOrthographic();

        return projection === "orthographic" ? orthographic : camera;
    }

    function draw(): void {
        const reach = rig.distance();

        syncOrthographic();
        fog.near = reach + bounds.radius;
        fog.far = reach + bounds.radius * FOG_DEPTH_FACTOR;
        post.render();
    }

    function applySize(width: number, height: number, pixelRatio: number): void {
        renderer.setPixelRatio(pixelRatio);
        renderer.setSize(width, height, false);
        post.setSize(width, height, pixelRatio);

        for (const material of lineMaterials) {
            material.resolution.set(width, height);
        }

        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    }

    function resize(): void {
        const width = container.clientWidth;
        const height = container.clientHeight;
        const pixelRatio = pixelRatioFor(profile, window.devicePixelRatio);
        const next = `${width}x${height}@${pixelRatio}`;

        // A still owns the drawing buffer until it ends; it calls this again when it does.
        if (loop.paused() || width === 0 || height === 0 || next === viewport) {
            return;
        }

        viewport = next;
        applySize(width, height, pixelRatio);
        options.onViewport();
        loop.drawNow();
    }

    function setQuality(next: PreviewQuality): void {
        if (next === quality) {
            return;
        }

        quality = next;
        profile = fittedProfile(next, renderer.capabilities.maxTextureSize);
        post.setQuality({ occlusion: profile.occlusion, msaaSamples: profile.msaaSamples });
        lights.setShadowMapSize(profile.shadowMapSize);
        invalidate();
        resize();
    }

    /** Draws once without the editing aids, so an image of the model shows only the model. */
    function drawWithoutOverlay(): void {
        const shown = overlay.visible;

        overlay.visible = false;

        try {
            loop.drawNow();
        } finally {
            overlay.visible = shown;
        }
    }

    function capture(): string {
        // The drawing buffer is only readable in the same task that rendered it.
        renderer.shadowMap.needsUpdate = true;
        drawWithoutOverlay();
        const image = canvas.toDataURL("image/png");

        // The screen shows the aids again.
        invalidate();

        return image;
    }

    async function renderStill(job: StillJob): Promise<HTMLCanvasElement | null> {
        if (loop.paused()) {
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
        const restingDirection = lights.direction.clone();
        const active = projection === "orthographic" ? orthographic : camera;
        let cancelled = false;

        loop.setPaused(true);

        try {
            applySize(job.width, job.height, 1);
            lights.setShadowMapSize(job.shadowMapSize);

            for (let index = 0; index < total; index += 1) {
                if (job.signal?.aborted === true) {
                    cancelled = true;
                    break;
                }

                if (total > 1) {
                    jitterSample(index, job, active, lights, restingDirection, bounds);
                }

                renderer.shadowMap.needsUpdate = true;
                drawWithoutOverlay();

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
            lights.direction.copy(restingDirection);
            lights.placeSun(bounds);
            lights.setShadowMapSize(profile.shadowMapSize);
            loop.setPaused(false);
            viewport = "";
            renderer.shadowMap.needsUpdate = true;
            resize();
        }

        return cancelled ? null : output;
    }

    // Without preventDefault the browser never offers the context back. The screen is told, so it
    // can explain what happened and rebuild the viewer; `stop` removes this listener first,
    // because releasing the context on purpose fires the same event.
    function handleContextLost(event: Event): void {
        event.preventDefault();
        options.onContextLost?.();
    }

    return {
        canvas,
        scene,
        overlay,
        rig,
        lights,
        resources,
        bounds,
        cutPlane,
        cutPlanes,
        loop,
        maxImageSize: renderer.capabilities.maxTextureSize,
        trackLineMaterials: (...materials) => {
            lineMaterials.push(...materials);
        },
        invalidate,
        activeCamera,
        resize,
        width: () => container.clientWidth,
        setProjection: (next) => {
            projection = next;
            post.setCamera(next === "orthographic" ? orthographic : camera);
        },
        applyPalette: (palette) => {
            scene.background = new Color(palette.fog);
            fog.color.setHex(palette.fog);
            post.setBloom(palette.glow * BLOOM_STRENGTH);
            lights.applyPalette(palette);
        },
        setExposure: (exposure) => {
            renderer.toneMappingExposure = exposure;
        },
        setQuality,
        capture,
        renderStill,
        start: () => {
            observer.observe(container);
            window.addEventListener("resize", resize);
            canvas.addEventListener("webglcontextrestored", invalidate);
            canvas.addEventListener("webglcontextlost", handleContextLost);
            resize();
            loop.start();
        },
        stop: () => {
            loop.stop();
            observer.disconnect();
            window.removeEventListener("resize", resize);
            canvas.removeEventListener("webglcontextrestored", invalidate);
            canvas.removeEventListener("webglcontextlost", handleContextLost);
        },
        dispose: () => {
            rig.dispose();
            post.dispose();
            resources.disposeAll();
            lights.dispose();
            renderer.dispose();
            renderer.forceContextLoss();
            canvas.remove();
        },
    };
}
