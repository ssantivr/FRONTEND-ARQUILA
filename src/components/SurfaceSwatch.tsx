import { useMemo, type CSSProperties } from "react";

import { PATTERN_SIZE, SURFACE_PATTERNS } from "../utils/patternPixels";
import { SURFACE_MATERIALS, type SurfaceMaterialId } from "../utils/surfaceMaterials";

import styles from "./SurfaceSwatch.module.css";

const images = new Map<SurfaceMaterialId, string | null>();

/**
 * The pattern the 3D engine puts on a surface, as an image: the same pixels its texture is made
 * from (`utils/patternPixels.ts`). Made once per surface; `null` for a flat surface, or where the
 * browser cannot draw on a canvas.
 */
function patternImage(id: SurfaceMaterialId): string | null {
    if (images.has(id)) {
        return images.get(id) ?? null;
    }

    let image: string | null = null;
    const make = SURFACE_PATTERNS[id];

    try {
        const canvas = make === undefined ? null : document.createElement("canvas");
        const context = canvas?.getContext("2d") ?? null;

        if (make !== undefined && canvas !== null && context !== null) {
            const { colors } = make();

            canvas.width = PATTERN_SIZE;
            canvas.height = PATTERN_SIZE;
            context.putImageData(
                new ImageData(new Uint8ClampedArray(colors), PATTERN_SIZE, PATTERN_SIZE),
                0,
                0,
            );
            image = canvas.toDataURL("image/png");
        }
    } catch {
        image = null;
    }

    images.set(id, image);

    return image;
}

export function cssColor(color: number): string {
    return `#${color.toString(16).padStart(6, "0")}`;
}

/**
 * A sample of a surface: its pattern or its flat colour, a highlight that sharpens as the surface
 * gets smoother or more metallic, and a checkerboard seen through it when it is translucent.
 */
export function SurfaceSwatch({ id, className }: { id: SurfaceMaterialId; className?: string }) {
    const surface = SURFACE_MATERIALS[id];
    const image = useMemo(() => patternImage(id), [id]);
    const shine = Math.round((1 - surface.roughness) * 55 + surface.metalness * 25);
    const layers = [
        `linear-gradient(135deg, rgba(255, 255, 255, ${shine / 100}) 0%, transparent 55%)`,
        ...(image === null ? [] : [`url(${image}) 0 0 / 50% repeat`]),
        cssColor(surface.color),
    ];
    const style: CSSProperties = {
        background: layers.join(", "),
        opacity: surface.opacity < 1 ? Math.max(surface.opacity + 0.2, 0.5) : 1,
    };

    return (
        <span
            className={[styles.swatch, surface.opacity < 1 ? styles.clear : undefined, className]
                .filter(Boolean)
                .join(" ")}
            aria-hidden="true"
        >
            <span className={styles.fill} style={style} />
        </span>
    );
}
