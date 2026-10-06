import {
    CylinderGeometry,
    Group,
    IcosahedronGeometry,
    InstancedMesh,
    Matrix4,
    MeshStandardMaterial,
    Quaternion,
    Vector3,
    type BufferGeometry,
} from "three";

const TRUNK_COLOR = 0x5a4030;
const CANOPY_COLOR = 0x3f7a4f;
const CANOPY_LIGHT_COLOR = 0x5a9a5f;
const UP = new Vector3(0, 1, 0);

export interface TreeSpot {
    x: number;
    y: number;
}

export function buildTrees(spots: TreeSpot[]): Group {
    const trees = new Group();

    if (spots.length === 0) {
        return trees;
    }

    const parts: [BufferGeometry, number][] = [
        [new CylinderGeometry(0.12, 0.18, 1.6, 8).translate(0, 0.8, 0), TRUNK_COLOR],
        [new IcosahedronGeometry(1.15, 1).translate(0, 2.3, 0), CANOPY_COLOR],
        [new IcosahedronGeometry(0.8, 1).translate(0.25, 3.2, -0.15), CANOPY_LIGHT_COLOR],
    ];
    const placements = spots.map(({ x, y }) => {
        const variation = (Math.abs(Math.round(x * 13 + y * 7)) % 5) / 5;

        return new Matrix4().compose(
            new Vector3(x, 0, -y),
            new Quaternion().setFromAxisAngle(UP, variation * Math.PI * 2),
            new Vector3().setScalar(0.85 + variation * 0.4),
        );
    });

    for (const [geometry, color] of parts) {
        const mesh = new InstancedMesh(
            geometry,
            new MeshStandardMaterial({ color, roughness: 0.9, flatShading: true }),
            spots.length,
        );

        placements.forEach((placement, index) => mesh.setMatrixAt(index, placement));
        mesh.instanceMatrix.needsUpdate = true;
        mesh.castShadow = true;
        trees.add(mesh);
    }

    return trees;
}
