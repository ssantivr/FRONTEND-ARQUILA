import { BoxGeometry, DataTexture, LineBasicMaterial, Mesh, MeshStandardMaterial } from "three";
import { describe, expect, it } from "vitest";

import { SCENE_PALETTES } from "../lightingPalette";
import type { Patterns } from "../patterns";
import { paintElements } from "./appearance";
import { createSceneContents } from "./contents";
import type { ElementMesh } from "./elements";

function scene() {
    const contents = createSceneContents(SCENE_PALETTES.dark);
    const mesh: ElementMesh = new Mesh(new BoxGeometry(), new MeshStandardMaterial());

    mesh.userData = { key: "room-1", kind: "room", edges: new LineBasicMaterial() };
    contents.elements = [mesh];

    const kit = { grain: new DataTexture(), patterns: { surfaces: {} } as unknown as Patterns };

    return { contents, mesh, kit };
}

describe("materials render mode", () => {
    it("shows the finish unlit: its colour is emitted and the lit colour goes black", () => {
        const { contents, mesh, kit } = scene();

        paintElements(contents, kit);
        const finish = mesh.material.color.getHex();

        contents.renderMode = "materials";
        paintElements(contents, kit);

        expect(mesh.material.color.getHex()).toBe(0x000000);
        expect(mesh.material.emissive.getHex()).toBe(finish);
        expect(mesh.material.emissiveIntensity).toBe(1);
        expect(mesh.material.metalness).toBe(0);
    });

    it("goes back to the lit finish in the solid mode", () => {
        const { contents, mesh, kit } = scene();

        paintElements(contents, kit);
        const finish = mesh.material.color.getHex();

        contents.renderMode = "materials";
        paintElements(contents, kit);
        contents.renderMode = "solid";
        paintElements(contents, kit);

        expect(mesh.material.color.getHex()).toBe(finish);
        expect(mesh.material.emissiveMap).toBeNull();
    });
});
