import { useEffect, type RefObject } from "react";

import type { StructureViewer as Viewer } from "../../three/BuildingSceneManager";

/**
 * The scene takes the rest of the window below where it starts, and the camera frames the model
 * in the room that the panels over each side leave free.
 */
export function useFrameInsets(
    stage: RefObject<HTMLDivElement | null>,
    container: RefObject<HTMLDivElement | null>,
    viewer: RefObject<Viewer | null>,
    enabled: boolean,
    panels: { tree: boolean; inspector: boolean; treeShown: boolean },
): void {
    const { tree, inspector, treeShown } = panels;

    useEffect(() => {
        const host = stage.current;
        const scene = container.current;

        if (!enabled || host === null || scene === null) {
            return;
        }

        function measure(host: HTMLDivElement, scene: HTMLDivElement): void {
            const top = host.getBoundingClientRect().top + window.scrollY;
            const box = scene.getBoundingClientRect();
            let left = 0;
            let right = 0;

            host.style.setProperty("--viewer-top", `${Math.round(top)}px`);

            for (const panel of host.querySelectorAll<HTMLElement>(".hud-layer > *")) {
                const rect = panel.getBoundingClientRect();
                const middle = (rect.left + rect.right) / 2 - box.left;

                if (rect.width === 0 || rect.height < box.height * 0.3) {
                    continue;
                }

                if (middle < box.width * 0.4) {
                    left = Math.max(left, rect.right - box.left);
                } else if (middle > box.width * 0.6) {
                    right = Math.max(right, box.right - rect.left);
                }
            }

            viewer.current?.setFrameInsets(left, right);
        }

        measure(host, scene);

        if (typeof ResizeObserver === "undefined") {
            return;
        }

        const observer = new ResizeObserver(() => measure(host, scene));

        observer.observe(host);
        host.querySelectorAll(".hud-layer > *").forEach((panel) => observer.observe(panel));

        return () => observer.disconnect();
    }, [stage, container, viewer, enabled, tree, inspector, treeShown]);
}
