import {
    AmbientLight,
    BackSide,
    BufferAttribute,
    BufferGeometry,
    Color,
    DirectionalLight,
    HemisphereLight,
    MathUtils,
    Mesh,
    MeshBasicMaterial,
    PMREMGenerator,
    PointLight,
    Points,
    PointsMaterial,
    SphereGeometry,
    Vector3,
    type Scene,
    type Sphere,
    type WebGLRenderer,
    type WebGLRenderTarget,
} from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

import { disposeObject } from "../dispose";
import type { ScenePalette } from "../lightingPalette";
import { CYBER_ACCENT, VIOLET_ACCENT } from "./pbr";

const SHADOW_RADIUS = 4;
const AMBIENT_SHARE = 0.28;
const SKY_FALLOFF = 0.55;
const SKY_GLOW_HEIGHT = 0.035;
const STAR_COUNT = 700;
const STAR_SIZE_PX = 1.6;
const LIGHT_DIRECTION = new Vector3(-0.5, 1, 0.6).normalize();
const UP_AXIS = new Vector3(0, 1, 0);

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
export function buildSky(palette: ScenePalette, radius: number): Mesh {
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

/** The procedural reflections that glass and metal need; without them metal renders black. */
export function buildEnvironmentMap(renderer: WebGLRenderer): WebGLRenderTarget {
    const pmrem = new PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const map = pmrem.fromScene(room, 0.04);

    // RoomEnvironment.dispose (three r186) frees meshes but not its InstancedMesh's matrix buffer.
    disposeObject(room);
    pmrem.dispose();

    return map;
}

export interface SceneLights {
    /** Moves the lights to a model of this size and points the sun's shadow camera at it. */
    fit: (bounds: Sphere) => void;
    /** Places the sun along its current direction, without touching its shadow camera. */
    placeSun: (bounds: Sphere) => void;
    direction: Vector3;
    /** Turns the sun around the model; with an elevation it also raises or lowers it. */
    setSun: (degrees: number, elevation?: number) => void;
    setShadows: (enabled: boolean) => void;
    setShadowMapSize: (size: number) => void;
    applyPalette: (palette: ScenePalette) => void;
    dispose: () => void;
}

export function createSceneLights(
    scene: Scene,
    palette: ScenePalette,
    shadowMapSize: number,
): SceneLights {
    const sun = new DirectionalLight(palette.sun, palette.sunPower);
    sun.castShadow = true;
    sun.shadow.mapSize.set(shadowMapSize, shadowMapSize);
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.03;
    sun.shadow.radius = SHADOW_RADIUS;

    const cyberAccent = new PointLight(CYBER_ACCENT, palette.accent, 0, 0);
    const violetAccent = new PointLight(VIOLET_ACCENT, palette.accent, 0, 0);
    const ambient = new AmbientLight(0xffffff, 0.2);
    const skyLight = new HemisphereLight(palette.skyLight, 0x2a3326, palette.skyPower);
    const direction = LIGHT_DIRECTION.clone();

    scene.add(ambient, skyLight, sun, sun.target, cyberAccent, violetAccent);

    function placeSun(bounds: Sphere): void {
        sun.position.copy(bounds.center).addScaledVector(direction, bounds.radius * 2);
    }

    return {
        direction,
        placeSun,
        fit: (bounds) => {
            placeSun(bounds);
            sun.target.position.copy(bounds.center);
            sun.shadow.camera.left = -bounds.radius;
            sun.shadow.camera.right = bounds.radius;
            sun.shadow.camera.top = bounds.radius;
            sun.shadow.camera.bottom = -bounds.radius;
            sun.shadow.camera.near = bounds.radius * 0.5;
            sun.shadow.camera.far = bounds.radius * 3.5;
            sun.shadow.camera.updateProjectionMatrix();

            cyberAccent.position
                .copy(bounds.center)
                .add(new Vector3(-1.2, 0.5, 1).multiplyScalar(bounds.radius));
            violetAccent.position
                .copy(bounds.center)
                .add(new Vector3(1.2, 0.35, -1).multiplyScalar(bounds.radius));
        },
        setSun: (degrees, elevation) => {
            direction.copy(LIGHT_DIRECTION);

            if (elevation !== undefined) {
                const angle = MathUtils.degToRad(elevation);

                direction.setY(0).normalize().multiplyScalar(Math.cos(angle)).setY(Math.sin(angle));
            }

            direction.applyAxisAngle(UP_AXIS, MathUtils.degToRad(degrees));
        },
        setShadows: (enabled) => {
            sun.castShadow = enabled;
        },
        setShadowMapSize: (size) => {
            if (sun.shadow.mapSize.x !== size) {
                sun.shadow.mapSize.set(size, size);
                sun.shadow.map?.dispose();
                sun.shadow.map = null;
            }
        },
        applyPalette: (next) => {
            cyberAccent.intensity = next.accent;
            violetAccent.intensity = next.accent;
            sun.color.setHex(next.sun);
            sun.intensity = next.sunPower;
            skyLight.color.setHex(next.skyLight);
            skyLight.intensity = next.skyPower;
            ambient.intensity = next.skyPower * AMBIENT_SHARE;
            scene.environmentIntensity = next.reflections;
        },
        dispose: () => {
            sun.shadow.map?.dispose();
            sun.dispose();
        },
    };
}
