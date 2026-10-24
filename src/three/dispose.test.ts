import {
    BoxGeometry,
    DataTexture,
    DirectionalLight,
    Group,
    Mesh,
    MeshStandardMaterial,
    type Material,
    type Texture,
} from "three";
import { describe, expect, it, vi } from "vitest";

import { disposeObject } from "./dispose";

function build(material: Material): { root: Group; mesh: Mesh } {
    const root = new Group();
    const mesh = new Mesh(new BoxGeometry(1, 1, 1), material);

    root.add(new Group().add(mesh));

    return { root, mesh };
}

function spy(target: { dispose: () => void }) {
    return vi.spyOn(target, "dispose");
}

function textured(): { material: MeshStandardMaterial; map: Texture } {
    const map = new DataTexture(new Uint8Array(4), 1, 1);

    return { material: new MeshStandardMaterial({ map }), map };
}

describe("disposeObject", () => {
    it("releases the geometry and material of nested meshes", () => {
        const material = new MeshStandardMaterial();
        const { root, mesh } = build(material);
        const geometry = spy(mesh.geometry);
        const released = spy(material);

        disposeObject(root);

        expect(geometry).toHaveBeenCalledOnce();
        expect(released).toHaveBeenCalledOnce();
    });

    it("keeps materials marked as shared", () => {
        const material = new MeshStandardMaterial();

        material.userData.shared = true;

        const released = spy(material);

        disposeObject(build(material).root, { textures: true });

        expect(released).not.toHaveBeenCalled();
    });

    it("keeps textures unless asked to release them", () => {
        const { material, map } = textured();
        const released = spy(map);

        disposeObject(build(material).root);

        expect(released).not.toHaveBeenCalled();
    });

    it("releases the textures of a loaded model", () => {
        const { material, map } = textured();
        const released = spy(map);

        disposeObject(build(material).root, { textures: true });

        expect(released).toHaveBeenCalledOnce();
    });

    it("releases the shadow map of a light", () => {
        const root = new Group();
        const light = new DirectionalLight();
        const released = spy(light);

        root.add(light);
        disposeObject(root);

        expect(released).toHaveBeenCalledOnce();
    });
});
