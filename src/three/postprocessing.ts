import {
    HalfFloatType,
    Vector2,
    WebGLRenderTarget,
    type Camera,
    type Scene,
    type WebGLRenderer,
} from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

const BLOOM_RADIUS = 0.55;
/** Above what sunlit surfaces reach, so only the neon accents and sharp glints glow. */
const BLOOM_THRESHOLD = 1.4;
const MSAA_SAMPLES = 4;

export interface Postprocessing {
    render: () => void;
    setSize: (width: number, height: number, pixelRatio: number) => void;
    /** A strength of 0 draws straight to the canvas and skips every extra pass. */
    setBloom: (strength: number) => void;
    dispose: () => void;
}

interface Pipeline {
    composer: EffectComposer;
    bloom: UnrealBloomPass;
    output: OutputPass;
}

export function createPostprocessing(
    renderer: WebGLRenderer,
    scene: Scene,
    camera: Camera,
): Postprocessing {
    let pipeline: Pipeline | null = null;
    let strength = 0;
    let width = 1;
    let height = 1;
    let pixelRatio = 1;

    function resize({ composer }: Pipeline): void {
        composer.setPixelRatio(pixelRatio);
        composer.setSize(width, height);
    }

    /** The passes are only created the first time the glow is needed. */
    function build(): Pipeline {
        const target = new WebGLRenderTarget(1, 1, { type: HalfFloatType, samples: MSAA_SAMPLES });
        const composer = new EffectComposer(renderer, target);
        const bloom = new UnrealBloomPass(
            new Vector2(width, height),
            strength,
            BLOOM_RADIUS,
            BLOOM_THRESHOLD,
        );
        const output = new OutputPass();

        composer.addPass(new RenderPass(scene, camera));
        composer.addPass(bloom);
        composer.addPass(output);

        const built = { composer, bloom, output };

        resize(built);

        return built;
    }

    return {
        render: () => {
            if (strength <= 0) {
                renderer.render(scene, camera);

                return;
            }

            pipeline ??= build();
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
        dispose: () => {
            if (pipeline !== null) {
                pipeline.bloom.dispose();
                pipeline.output.dispose();
                pipeline.composer.dispose();
                pipeline = null;
            }
        },
    };
}
