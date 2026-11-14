import { Box3, type Plane } from "three";

import type { SpatialLayer } from "../../types/api";
import { placeSection, type SectionAxis } from "./section";
import type { SceneContents } from "./contents";

const COMPANION_REACH_M = 0.05;

export type LayerName = "rooms" | "roof" | "environment" | "grid";
export type Layers = Record<LayerName, boolean>;
export type OverlayLayers = Record<SpatialLayer, boolean>;

/** What can be seen: layers, hidden objects, the isolated room and the height of the cut. */
export interface LayerManager {
    apply: () => void;
    updateIsolation: () => void;
    isolate: (key: string | null) => void;
    setCutaway: (fraction: number) => void;
    /** The axis the cutaway crosses: y for a floor plan, x or z for a vertical section. */
    setSectionAxis: (axis: SectionAxis) => void;
    setHidden: (keys: ReadonlySet<string>) => void;
    setLayers: (layers: Layers) => void;
    setOverlayLayers: (layers: OverlayLayers) => void;
}

export function createLayerManager(contents: SceneContents, cutPlane: Plane): LayerManager {
    let layers: Layers = { rooms: true, roof: true, environment: true, grid: true };
    let overlayLayers: OverlayLayers = { structure: true, installations: true, finishes: true };
    let hidden: ReadonlySet<string> = new Set();
    let isolatedKey: string | null = null;
    let companions: ReadonlySet<string> = new Set();
    let cutFraction = 1;
    let sectionAxis: SectionAxis = "y";

    /**
     * The roof is one piece that sits on the rooms of the top floor. With one of them hidden it
     * would hang in the air, so it is hidden with them.
     */
    function topFloorHasHiddenRoom(): boolean {
        const top = contents.levelBases.length - 1;

        return contents.elements.some(
            (mesh) =>
                mesh.userData.space === true &&
                mesh.userData.level === top &&
                hidden.has(mesh.userData.key as string),
        );
    }

    function apply(): void {
        const { elements, environment, grid, lotEdges, overlays, palette, roof } = contents;

        for (const mesh of elements) {
            mesh.visible =
                !hidden.has(mesh.userData.key as string) &&
                (isolatedKey === null
                    ? layers.rooms || mesh.userData.space !== true
                    : companions.has(mesh.userData.key as string));
        }

        for (const mesh of overlays) {
            mesh.visible =
                overlayLayers[mesh.userData.layer as SpatialLayer] &&
                (isolatedKey === null || companions.has(mesh.userData.key as string));
        }

        if (roof !== null) {
            roof.visible =
                layers.roof && layers.rooms && isolatedKey === null && !topFloorHasHiddenRoom();
        }

        if (environment !== null) {
            environment.visible = layers.environment;
        }

        if (lotEdges !== null) {
            lotEdges.visible = palette.glow > 0;
        }

        if (grid !== null) {
            grid.visible = layers.grid;
        }
    }

    function updateIsolation(): void {
        const { elements, overlays } = contents;
        const target = elements.find((item) => item.userData.key === isolatedKey);
        const range = new Box3();
        const kept = new Set<string>();

        if (target === undefined) {
            isolatedKey = null;

            for (const mesh of elements) {
                range.expandByObject(mesh);
            }
        } else {
            range.setFromObject(target);

            const reach = range.clone().expandByScalar(COMPANION_REACH_M);
            const box = new Box3();

            for (const mesh of elements) {
                if (
                    mesh === target ||
                    (mesh.userData.space !== true && reach.intersectsBox(box.setFromObject(mesh)))
                ) {
                    kept.add(mesh.userData.key as string);
                }
            }

            for (const mesh of overlays) {
                if (
                    mesh.userData.room === isolatedKey ||
                    (mesh.userData.room === null && reach.intersectsBox(box.setFromObject(mesh)))
                ) {
                    kept.add(mesh.userData.key as string);
                }
            }
        }

        companions = kept;
        placeSection(cutPlane, sectionAxis, cutFraction, range);
    }

    return {
        apply,
        updateIsolation,
        isolate: (key) => {
            isolatedKey = key;
            updateIsolation();
            apply();
        },
        setCutaway: (fraction) => {
            cutFraction = fraction;
            updateIsolation();
        },
        setSectionAxis: (axis) => {
            sectionAxis = axis;
            updateIsolation();
        },
        setHidden: (keys) => {
            hidden = keys;
            apply();
        },
        setLayers: (next) => {
            layers = next;
            apply();
        },
        setOverlayLayers: (next) => {
            overlayLayers = next;
            apply();
        },
    };
}
