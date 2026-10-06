import {
    Box3,
    BoxGeometry,
    BufferGeometry,
    CylinderGeometry,
    DirectionalLight,
    Group,
    HemisphereLight,
    Material,
    Mesh,
    MeshBasicMaterial,
    MeshPhysicalMaterial,
    MeshStandardMaterial,
    PointLight,
    SphereGeometry,
    SpotLight,
    Texture,
    Vector3,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import { applyMetricUVs } from "../roomGeometry";
import { concreteTexture, fabricTexture, woodTexture } from "./textures";

const HALF_WIDTH = 4.5;
const HALF_DEPTH = 6;
const HEIGHT = 5.6;
const WALL = 0.2;
const MEZZANINE_Y = 2.8;
const MEZZANINE_EDGE = 1.5;
const SLAB = 0.25;
const STAIR_WIDTH = 1.1;
const STAIR_START = -2.5;
const STEPS = 16;
const STAIR_FLIGHTS = [0, 1, 2, 3];
const RAIL = 1;
const CAMERA_MARGIN = 0.35;
const CYAN = 0x00f0ff;
const MAGENTA = 0xff007f;
const WARM = 0xffc38a;
const NEON_BOOST = 3.6;
const NEON_SIZE = 0.035;
const CUSHION_RADIUS = 0.07;

export interface LoftScene {
    group: Group;
    neon: Group;
    room: Box3;
    solids: Box3[];
    dispose: () => void;
}

function createAssembler() {
    const parts = new Map<Material, BufferGeometry[]>();

    function add(material: Material, geometry: BufferGeometry): void {
        const flat = geometry.index === null ? geometry : geometry.toNonIndexed();

        parts.set(material, [...(parts.get(material) ?? []), flat]);
    }

    function box(
        material: Material,
        size: [number, number, number],
        center: [number, number, number],
    ): void {
        add(material, new BoxGeometry(...size).translate(...center));
    }

    function cushion(
        material: Material,
        size: [number, number, number],
        center: [number, number, number],
    ): void {
        add(material, new RoundedBoxGeometry(...size, 3, CUSHION_RADIUS).translate(...center));
    }

    function build(group: Group): void {
        for (const [material, geometries] of parts) {
            const mesh = new Mesh(applyMetricUVs(mergeGeometries(geometries, false)), material);

            for (const geometry of geometries) {
                geometry.dispose();
            }

            mesh.castShadow = !material.transparent && !(material instanceof MeshBasicMaterial);
            mesh.receiveShadow = !(material instanceof MeshBasicMaterial);
            group.add(mesh);
        }
    }

    return { add, box, cushion, build };
}

function neonMaterial(color: number): MeshBasicMaterial {
    const material = new MeshBasicMaterial({ color });

    material.color.multiplyScalar(NEON_BOOST);

    return material;
}

export function buildLoftScene(): LoftScene {
    const textures: Texture[] = [];
    const keep = <Kept extends Texture>(texture: Kept): Kept => {
        textures.push(texture);

        return texture;
    };

    const floor = new MeshPhysicalMaterial({
        map: keep(woodTexture([168, 118, 72], 1.6)),
        roughness: 0.42,
        clearcoat: 0.35,
        clearcoatRoughness: 0.3,
    });
    const darkWood = new MeshStandardMaterial({
        map: keep(woodTexture([62, 42, 30], 1.2)),
        roughness: 0.6,
    });
    const concrete = new MeshStandardMaterial({
        map: keep(concreteTexture(2.4)),
        roughness: 0.92,
    });
    const weave = keep(fabricTexture(0.25));
    const fabric = (color: number) =>
        new MeshPhysicalMaterial({
            color,
            map: weave,
            roughness: 1,
            sheen: 0.4,
            sheenRoughness: 0.8,
            sheenColor: 0xffffff,
        });
    const sofa = fabric(0x3f4756);
    const accent = fabric(0x9a5536);
    const linen = fabric(0x9d9280);
    const metal = new MeshStandardMaterial({ color: 0x15171c, roughness: 0.35, metalness: 0.9 });
    const glass = new MeshPhysicalMaterial({
        color: 0xbfe6ff,
        transparent: true,
        opacity: 0.16,
        roughness: 0.04,
        metalness: 0,
        clearcoat: 1,
        clearcoatRoughness: 0.03,
        depthWrite: false,
    });
    const pane = new MeshPhysicalMaterial({
        color: 0x9fc4ff,
        transparent: true,
        opacity: 0.07,
        roughness: 0.02,
        clearcoat: 1,
        depthWrite: false,
    });
    const bulb = neonMaterial(WARM);
    const cyan = neonMaterial(CYAN);
    const magenta = neonMaterial(MAGENTA);

    const shell = createAssembler();
    const width = HALF_WIDTH * 2;
    const depth = HALF_DEPTH * 2;
    const railWidth = width - STAIR_WIDTH;
    const railCenter = -STAIR_WIDTH / 2;
    const stairX = HALF_WIDTH - STAIR_WIDTH / 2;
    const stairRun = MEZZANINE_EDGE - STAIR_START;
    const stairSlope = Math.atan2(MEZZANINE_Y, stairRun);
    const stairLength = Math.hypot(MEZZANINE_Y, stairRun);
    const stairMiddle = (STAIR_START + MEZZANINE_EDGE) / 2;
    const mezzanineDepth = HALF_DEPTH - MEZZANINE_EDGE;
    const mezzanineMiddle = (HALF_DEPTH + MEZZANINE_EDGE) / 2;

    shell.box(floor, [width, 0.1, depth], [0, -0.05, 0]);
    shell.box(concrete, [width, 0.2, depth], [0, HEIGHT + 0.1, 0]);
    shell.box(concrete, [WALL, HEIGHT, depth], [-HALF_WIDTH - WALL / 2, HEIGHT / 2, 0]);
    shell.box(concrete, [WALL, HEIGHT, depth], [HALF_WIDTH + WALL / 2, HEIGHT / 2, 0]);
    shell.box(darkWood, [width, HEIGHT, WALL], [0, HEIGHT / 2, HALF_DEPTH + WALL / 2]);

    shell.box(pane, [width, HEIGHT, 0.02], [0, HEIGHT / 2, -HALF_DEPTH]);

    for (let x = -HALF_WIDTH; x <= HALF_WIDTH; x += 1.5) {
        shell.box(metal, [0.06, HEIGHT, 0.1], [x, HEIGHT / 2, -HALF_DEPTH]);
    }

    for (const y of [0.03, MEZZANINE_Y, HEIGHT - 0.03]) {
        shell.box(metal, [width, 0.06, 0.1], [0, y, -HALF_DEPTH]);
    }

    shell.box(
        concrete,
        [width, SLAB, mezzanineDepth],
        [0, MEZZANINE_Y - SLAB / 2 - 0.02, mezzanineMiddle],
    );
    shell.box(floor, [width, 0.02, mezzanineDepth], [0, MEZZANINE_Y - 0.01, mezzanineMiddle]);
    shell.box(
        darkWood,
        [width, SLAB + 0.02, 0.04],
        [0, MEZZANINE_Y - SLAB / 2 - 0.01, MEZZANINE_EDGE - 0.02],
    );
    shell.box(
        glass,
        [railWidth, RAIL, 0.02],
        [railCenter, MEZZANINE_Y + RAIL / 2, MEZZANINE_EDGE + 0.05],
    );
    shell.box(
        metal,
        [railWidth, 0.04, 0.05],
        [railCenter, MEZZANINE_Y + RAIL, MEZZANINE_EDGE + 0.05],
    );

    for (let step = 0; step < STEPS; step += 1) {
        shell.box(
            darkWood,
            [STAIR_WIDTH, 0.06, stairRun / STEPS + 0.03],
            [
                stairX,
                ((step + 1) * MEZZANINE_Y) / STEPS - 0.03,
                STAIR_START + ((step + 0.5) * stairRun) / STEPS,
            ],
        );
    }

    shell.add(
        glass,
        new BoxGeometry(0.02, RAIL, stairLength)
            .rotateX(-stairSlope)
            .translate(HALF_WIDTH - STAIR_WIDTH, MEZZANINE_Y / 2 + RAIL / 2 + 0.1, stairMiddle),
    );

    shell.box(linen, [3.4, 0.02, 2.4], [-1, 0.01, -2.6]);
    shell.cushion(sofa, [2.6, 0.42, 1], [-1, 0.21, -1.4]);
    shell.cushion(sofa, [2.6, 0.5, 0.24], [-1, 0.67, -1.02]);
    shell.cushion(sofa, [0.24, 0.24, 1], [-2.42, 0.54, -1.4]);
    shell.cushion(sofa, [0.24, 0.24, 1], [0.42, 0.54, -1.4]);
    shell.cushion(linen, [0.55, 0.16, 0.5], [-1.8, 0.5, -1.5]);
    shell.cushion(accent, [0.55, 0.16, 0.5], [-0.3, 0.5, -1.5]);
    shell.cushion(accent, [0.9, 0.4, 0.9], [1.5, 0.2, -3.1]);
    shell.cushion(accent, [0.9, 0.5, 0.2], [1.5, 0.6, -2.75]);
    shell.box(darkWood, [1.3, 0.05, 0.65], [-1, 0.38, -2.9]);
    shell.box(metal, [1.2, 0.34, 0.04], [-1, 0.18, -2.9]);

    shell.box(darkWood, [2.6, 0.86, 0.9], [-1.4, 0.43, 4.1]);
    shell.box(concrete, [2.75, 0.05, 1.05], [-1.4, 0.885, 4.1]);
    shell.cushion(linen, [1.9, 0.4, 2.2], [-2.2, MEZZANINE_Y + 0.2, 4.6]);
    shell.box(darkWood, [2.1, 0.9, 0.08], [-2.2, MEZZANINE_Y + 0.45, 5.75]);

    const pendants: Vector3[] = [-2.2, -1, 0.2].map((x) => new Vector3(x, 3.7, -2.4));

    for (const { x, y, z } of pendants) {
        shell.add(
            metal,
            new CylinderGeometry(0.008, 0.008, HEIGHT - y, 6).translate(x, (HEIGHT + y) / 2, z),
        );
    }

    shell.add(metal, new CylinderGeometry(0.015, 0.015, 1.5, 8).translate(1, 0.75, -1.3));

    const group = new Group();
    const lamps = new Group();
    const neon = new Group();

    shell.build(group);

    const bulbs = createAssembler();

    for (const { x, y, z } of pendants) {
        bulbs.add(bulb, new SphereGeometry(0.09, 16, 12).translate(x, y, z));
    }

    bulbs.add(bulb, new SphereGeometry(0.11, 16, 12).translate(1, 1.55, -1.3));
    bulbs.build(lamps);

    const strips = createAssembler();

    strips.box(cyan, [NEON_SIZE, NEON_SIZE, depth], [-HALF_WIDTH + 0.03, MEZZANINE_Y, 0]);
    strips.box(
        cyan,
        [width, NEON_SIZE, NEON_SIZE],
        [0, MEZZANINE_Y - SLAB - 0.04, MEZZANINE_EDGE - 0.05],
    );
    strips.box(
        cyan,
        [NEON_SIZE, HEIGHT, NEON_SIZE],
        [-HALF_WIDTH + 0.03, HEIGHT / 2, -HALF_DEPTH + 0.2],
    );
    strips.box(magenta, [width, NEON_SIZE, NEON_SIZE], [0, 4.7, HALF_DEPTH - 0.03]);
    strips.box(magenta, [NEON_SIZE, HEIGHT, NEON_SIZE], [1.6, HEIGHT / 2, HALF_DEPTH - 0.03]);
    strips.box(magenta, [width, NEON_SIZE, NEON_SIZE], [0, 1.4, HALF_DEPTH - 0.03]);
    strips.add(
        magenta,
        new BoxGeometry(NEON_SIZE, NEON_SIZE, stairLength)
            .rotateX(-stairSlope)
            .translate(HALF_WIDTH - 0.03, MEZZANINE_Y / 2 + 0.25, stairMiddle),
    );
    strips.build(neon);

    const spot = new SpotLight(WARM, 34, 14, 0.95, 0.85, 1.6);

    spot.position.set(-0.6, HEIGHT - 0.1, -1.6);
    spot.target.position.set(-1, 0, -2.4);
    spot.castShadow = true;
    spot.shadow.mapSize.set(1024, 1024);
    spot.shadow.bias = -0.0004;
    spot.shadow.radius = 4;

    const dusk = new DirectionalLight(0x6f8cff, 0.55);

    dusk.position.set(1, 3, -HALF_DEPTH - 8);
    dusk.target.position.set(0, 1, 2);
    lamps.add(spot, spot.target, dusk, dusk.target, new HemisphereLight(0x3d4a86, 0x1c1410, 0.3));

    for (const position of [...pendants, new Vector3(1, 1.55, -1.3), new Vector3(-1.4, 2.2, 4)]) {
        const light = new PointLight(WARM, 5, 9, 1.8);

        light.position.copy(position);
        lamps.add(light);
    }

    const cyanLight = new PointLight(CYAN, 7, 9, 1.8);
    const magentaLight = new PointLight(MAGENTA, 7, 9, 1.8);

    cyanLight.position.set(-HALF_WIDTH + 0.5, MEZZANINE_Y, -1.5);
    magentaLight.position.set(1.6, 4.4, HALF_DEPTH - 0.6);
    neon.add(cyanLight, magentaLight);
    group.add(lamps, neon);

    return {
        group,
        neon,
        room: new Box3(
            new Vector3(-HALF_WIDTH + CAMERA_MARGIN, CAMERA_MARGIN, -HALF_DEPTH + CAMERA_MARGIN),
            new Vector3(
                HALF_WIDTH - CAMERA_MARGIN,
                HEIGHT - CAMERA_MARGIN,
                HALF_DEPTH - CAMERA_MARGIN,
            ),
        ),
        solids: (
            [
                [
                    -HALF_WIDTH,
                    MEZZANINE_Y - SLAB,
                    MEZZANINE_EDGE,
                    HALF_WIDTH,
                    MEZZANINE_Y,
                    HALF_DEPTH,
                ],
                [-2.54, 0, -1.9, 0.54, 0.92, -0.9],
                [1.05, 0, -3.55, 1.95, 0.85, -2.65],
                [-1.65, 0, -3.25, -0.35, 0.42, -2.55],
                [-2.8, 0, 3.55, 0, 0.92, 4.65],
                [-3.15, MEZZANINE_Y, 3.5, -1.25, MEZZANINE_Y + 0.9, 5.8],
                ...STAIR_FLIGHTS.map(
                    (flight) =>
                        [
                            HALF_WIDTH - STAIR_WIDTH,
                            0,
                            STAIR_START + (flight * stairRun) / STAIR_FLIGHTS.length,
                            HALF_WIDTH,
                            ((flight + 1) * MEZZANINE_Y) / STAIR_FLIGHTS.length,
                            STAIR_START + ((flight + 1) * stairRun) / STAIR_FLIGHTS.length,
                        ] as const,
                ),
            ] as const
        ).map(
            ([minX, minY, minZ, maxX, maxY, maxZ]) =>
                new Box3(new Vector3(minX, minY, minZ), new Vector3(maxX, maxY, maxZ)),
        ),
        dispose: () => {
            for (const texture of textures) {
                texture.dispose();
            }
        },
    };
}
