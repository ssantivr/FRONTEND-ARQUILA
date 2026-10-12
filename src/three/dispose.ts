import {
    InstancedMesh,
    Light,
    LineSegments,
    Mesh,
    Points,
    Texture,
    type Material,
    type Object3D,
} from "three";

export interface DisposeOptions {
    textures?: boolean;
}

function disposeMaterial(material: Material, textures: boolean): void {
    if (material.userData.shared === true) {
        return;
    }

    if (textures) {
        for (const value of Object.values(material) as unknown[]) {
            if (value instanceof Texture) {
                value.dispose();
            }
        }
    }

    material.dispose();
}

export function disposeObject(root: Object3D, { textures = false }: DisposeOptions = {}): void {
    root.traverse((child) => {
        if (child instanceof Mesh || child instanceof LineSegments || child instanceof Points) {
            const materials: Material[] = Array.isArray(child.material)
                ? child.material
                : [child.material];

            child.geometry.dispose();

            for (const material of materials) {
                disposeMaterial(material, textures);
            }
        }

        if (child instanceof InstancedMesh || child instanceof Light) {
            child.dispose();
        }
    });
}
