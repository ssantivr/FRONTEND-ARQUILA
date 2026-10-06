import {
    BackSide,
    BoxGeometry,
    BufferAttribute,
    Color,
    Group,
    InstancedMesh,
    Matrix4,
    Mesh,
    MeshBasicMaterial,
    SphereGeometry,
    Vector3,
} from "three";

import { cityWindowsTexture } from "./textures";

const SKY_RADIUS = 420;
const SKY_STOPS: [number, number][] = [
    [0, 0xff8f52],
    [0.07, 0xd9537a],
    [0.2, 0x5b2c7a],
    [0.45, 0x161b47],
    [1, 0x070a1c],
];
const BELOW_HORIZON = 0x1a1226;
const TOWERS = 260;
const STREET_LEVEL = -120;
const ROOF_COLOR = 0x0b0d18;
const WINDOW_BOOST = 2;

function skyColor(height: number, target: Color): Color {
    if (height <= 0) {
        return target.setHex(BELOW_HORIZON).lerp(new Color(SKY_STOPS[0][1]), 1 + height * 6);
    }

    const upper = SKY_STOPS.findIndex(([stop]) => stop >= height);
    const [from, fromColor] = SKY_STOPS[Math.max(upper - 1, 0)];
    const [to, toColor] = SKY_STOPS[Math.max(upper, 0)];

    return target
        .setHex(fromColor)
        .lerp(new Color(toColor), to === from ? 0 : (height - from) / (to - from));
}

function buildSky(): Mesh {
    const geometry = new SphereGeometry(SKY_RADIUS, 32, 24);
    const positions = geometry.getAttribute("position");
    const colors = new Float32Array(positions.count * 3);
    const color = new Color();

    for (let index = 0; index < positions.count; index += 1) {
        const height = Math.max(positions.getY(index) / SKY_RADIUS, -1 / 6);

        skyColor(height, color).toArray(colors, index * 3);
    }

    geometry.setAttribute("color", new BufferAttribute(colors, 3));

    return new Mesh(
        geometry,
        new MeshBasicMaterial({
            vertexColors: true,
            side: BackSide,
            fog: false,
            depthWrite: false,
        }),
    );
}

function buildSkyline(): InstancedMesh {
    const texture = cityWindowsTexture();
    const facade = new MeshBasicMaterial({ map: texture, fog: false });
    const roof = new MeshBasicMaterial({ color: ROOF_COLOR, fog: false });
    const towers = new InstancedMesh(
        new BoxGeometry(1, 1, 1),
        [facade, facade, roof, roof, facade, facade],
        TOWERS,
    );
    const placement = new Matrix4();
    const scale = new Vector3();
    let seed = 91;
    const random = () => {
        seed = (seed * 16807) % 2147483647;

        return seed / 2147483647;
    };

    facade.color.multiplyScalar(WINDOW_BOOST);

    for (let index = 0; index < TOWERS; index += 1) {
        const distance = 90 + random() * 290;
        const side = (random() - 0.5) * (160 + distance * 1.5);
        const height = 40 + random() * 70 + (random() < 0.14 ? 70 : 0);

        scale.set(14 + random() * 20, height, 14 + random() * 20);
        placement.makeScale(scale.x, scale.y, scale.z);
        placement.setPosition(side, STREET_LEVEL + height / 2, -distance);
        towers.setMatrixAt(index, placement);
    }

    towers.instanceMatrix.needsUpdate = true;

    return towers;
}

export function buildCityBackdrop(): Group {
    const city = new Group();

    city.add(buildSky(), buildSkyline());

    return city;
}
