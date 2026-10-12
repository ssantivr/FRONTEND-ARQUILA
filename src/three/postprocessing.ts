import {
    HalfFloatType,
    Mesh,
    Vector2,
    WebGLRenderTarget,
    type Camera,
    type Material,
    type Object3D,
    type Plane,
    type Scene,
    type WebGLRenderer,
} from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { GTAOPass } from "three/examples/jsm/postprocessing/GTAOPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

const BLOOM_RADIUS = 0.55;
const BLOOM_THRESHOLD = 1.4;
const MSAA_SAMPLES = 4;
const OCCLUSION_RADIUS_M = 1.1;
const OCCLUSION_INTENSITY = 0.85;

export interface Postprocessing {
    render: () => void;
    setSize: (width: number, height: number, pixelRatio: number) => void;
    setBloom: (strength: number) => void;
    /** Renders through another camera from now on, for example an orthographic one. */
    setCamera: (camera: Camera) => void;
    dispose: () => void;
}

export interface PostprocessingOptions {
    /** Ambient occlusion: soft contact shadows where surfaces meet. */
    occlusion?: boolean;
    /** Planes that cut the model, so the occlusion pass ignores what they hide. */
    clippingPlanes?: Plane[];
}

interface Pipeline {
    composer: EffectComposer;
    scenePass: RenderPass;
    occlusion: GTAOPass | null;
    bloom: UnrealBloomPass;
    output: OutputPass;
}

function seeThrough(object: Object3D): boolean {
    if (!(object instanceof Mesh)) {
        return false;
    }

    // Wide lines are meshes too, and their quads would be drawn as solid geometry.
    if ((object as { isLineSegments2?: boolean }).isLineSegments2 === true) {
        return true;
    }

    const materials: Material[] = Array.isArray(object.material)
        ? object.material
        : [object.material];

    return materials.some((material) => material.transparent || !material.depthWrite);
}

/**
 * The stock pass draws every mesh into its depth buffer, so glass, ghosted elements, wide lines
 * and the sky dome would darken what is behind them. This one leaves them out.
 */
class SolidOcclusionPass extends GTAOPass {
    private readonly skipped: Object3D[] = [];

    override render(...args: Parameters<GTAOPass["render"]>): void {
        this.scene.traverse((object) => {
            if (object.visible && seeThrough(object)) {
                object.visible = false;
                this.skipped.push(object);
            }
        });

        try {
            super.render(...args);
        } finally {
            for (const object of this.skipped) {
                object.visible = true;
            }

            this.skipped.length = 0;
        }
    }
}

export function createPostprocessing(
    renderer: WebGLRenderer,
    scene: Scene,
    camera: Camera,
    options: PostprocessingOptions = {},
): Postprocessing {
    let pipeline: Pipeline | null = null;
    let view = camera;
    let strength = 0;
    let width = 1;
    let height = 1;
    let pixelRatio = 1;

    function resize({ composer }: Pipeline): void {
        composer.setPixelRatio(pixelRatio);
        composer.setSize(width, height);
    }

    function buildOcclusion(): GTAOPass {
        const pass = new SolidOcclusionPass(scene, view, width, height);

        pass.blendIntensity = OCCLUSION_INTENSITY;
        pass.updateGtaoMaterial({
            radius: OCCLUSION_RADIUS_M,
            distanceExponent: 1.4,
            thickness: 1.2,
            scale: 1.15,
            samples: 16,
        });
        pass.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2 });
        pass.normalMaterial.clippingPlanes = options.clippingPlanes ?? null;

        return pass;
    }

    function build(): Pipeline {
        const target = new WebGLRenderTarget(1, 1, { type: HalfFloatType, samples: MSAA_SAMPLES });
        const composer = new EffectComposer(renderer, target);
        const occlusion = options.occlusion === true ? buildOcclusion() : null;
        const bloom = new UnrealBloomPass(
            new Vector2(width, height),
            strength,
            BLOOM_RADIUS,
            BLOOM_THRESHOLD,
        );
        const output = new OutputPass();

        const scenePass = new RenderPass(scene, view);

        composer.addPass(scenePass);

        if (occlusion !== null) {
            composer.addPass(occlusion);
        }

        composer.addPass(bloom);
        composer.addPass(output);

        const built = { composer, scenePass, occlusion, bloom, output };

        resize(built);

        return built;
    }

    return {
        render: () => {
            if (strength <= 0 && options.occlusion !== true) {
                renderer.render(scene, view);

                return;
            }

            pipeline ??= build();
            pipeline.bloom.enabled = strength > 0;
            pipeline.bloom.strength = strength;
            pipeline.composer.render();
        },
        setSize: (nextWidth, nextHeight, nextPixelRatio) => {
            width = nextWidth;
            height = nextHeight;
            pixelRatio = nextPixelRatio;

            if (pipeline !== null) {
                resize(pipeline);
            }
        },
        setBloom: (next) => {
            strength = next;
        },
        setCamera: (next) => {
            view = next;

            if (pipeline === null) {
                return;
            }

            pipeline.scenePass.camera = next;

            if (pipeline.occlusion !== null) {
                // The occlusion shader reads depth differently for each kind of projection.
                const material = pipeline.occlusion.gtaoMaterial;

                pipeline.occlusion.camera = next;
                material.defines.PERSPECTIVE_CAMERA =
                    (next as { isPerspectiveCamera?: boolean }).isPerspectiveCamera === true
                        ? 1
                        : 0;
                material.needsUpdate = true;
            }
        },
        dispose: () => {
            if (pipeline !== null) {
                pipeline.occlusion?.dispose();
                pipeline.bloom.dispose();
                pipeline.output.dispose();
                pipeline.composer.dispose();
                pipeline = null;
            }
        },
    };
}
