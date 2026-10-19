import {
    Color,
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

const TRUNK_COLOR = 0x4f3a2b;
const CANOPY_DEEP = new Color(0x1d4428);
const CANOPY_FRESH = new Color(0x4a8540);
const UP = new Vector3(0, 1, 0);

export interface TreeSpot {
    x: number;
    y: number;
}

/**
 * Trees with a tapered trunk and a crown of four rounded masses. All of them share five
 * instanced meshes, so they cost five draw calls however many there are; each tree gets its own
 * turn, size and shade of green from its position.
 */
export function buildTrees(spots: TreeSpot[]): Group {
    const trees = new Group();

    if (spots.length === 0) {
        return trees;
    }

    const trunk = new CylinderGeometry(0.09, 0.2, 2, 10).translate(0, 1, 0);
    const crowns: BufferGeometry[] = [
        new IcosahedronGeometry(1.15, 2).scale(1, 0.92, 1).translate(0, 2.7, 0),
        new IcosahedronGeometry(0.85, 2).translate(0.55, 2.35, 0.2),
        new IcosahedronGeometry(0.8, 2).translate(-0.5, 2.5, -0.3),
        new IcosahedronGeometry(0.7, 2).translate(0.1, 3.5, -0.05),
    ];
    const variations = spots.map(({ x, y }) => (Math.abs(Math.round(x * 13 + y * 7)) % 7) / 7);
    const placements = spots.map(({ x, y }, index) =>
        new Matrix4().compose(
            new Vector3(x, 0, -y),
            new Quaternion().setFromAxisAngle(UP, variations[index] * Math.PI * 2),
            new Vector3(1, 0.9 + variations[index] * 0.35, 1).multiplyScalar(
                0.85 + variations[index] * 0.4,
            ),
        ),
    );
    const shade = new Color();

    function plant(geometry: BufferGeometry, material: MeshStandardMaterial, tinted: boolean) {
        const mesh = new InstancedMesh(geometry, material, spots.length);

        placements.forEach((placement, index) => {
            mesh.setMatrixAt(index, placement);

            if (tinted) {
                mesh.setColorAt(
                    index,
                    shade.lerpColors(CANOPY_DEEP, CANOPY_FRESH, variations[index]),
                );
            }
        });
        mesh.instanceMatrix.needsUpdate = true;

        if (mesh.instanceColor !== null) {
            mesh.instanceColor.needsUpdate = true;
        }

        mesh.castShadow = true;
        mesh.receiveShadow = true;
        trees.add(mesh);
    }

    plant(trunk, new MeshStandardMaterial({ color: TRUNK_COLOR, roughness: 0.95 }), false);

    for (const crown of crowns) {
        // White, so each tree shows the shade it was given.
        plant(crown, new MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 }), true);
    }

    return trees;
}
