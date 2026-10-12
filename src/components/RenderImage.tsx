import { useState } from "react";

import houseDay from "../assets/renders/house-day.jpg";
import houseNight from "../assets/renders/house-night.jpg";
import { ArchitectureArt } from "./ArchitectureArt";

/** Sample house drawn by ARQUILA's own 3D viewer; it is not any user's project. */
export const RENDERS = { day: houseDay, night: houseNight } as const;

interface RenderImageProps {
    time: keyof typeof RENDERS;
}

/** Fades the render in once it has loaded and falls back to the line drawing if it cannot. */
export function RenderImage({ time }: RenderImageProps) {
    const [failed, setFailed] = useState(false);
    const [ready, setReady] = useState(false);

    if (failed) {
        return <ArchitectureArt />;
    }

    return (
        <img
            key={time}
            className={ready ? "render render-ready" : "render"}
            src={RENDERS[time]}
            alt="Casa de muestra modelada con el visor 3D de ARQUILA"
            decoding="async"
            onLoad={() => setReady(true)}
            onError={() => setFailed(true)}
        />
    );
}
