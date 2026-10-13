import { useState } from "react";

import { useTheme } from "../state/theme";
import { ArchitectureArt } from "./ArchitectureArt";

/**
 * The two pictures are drawn by the app's own 3D viewer (`npm run renders`): the sample building
 * by day and by night. The glob finds whichever exist at build time, so replacing or removing a
 * file needs no code change.
 */
const RENDERS = import.meta.glob<string>("../assets/renders/house-*.jpg", {
    eager: true,
    query: "?url",
    import: "default",
});
const DAY: string | undefined = RENDERS["../assets/renders/house-day.jpg"];
const NIGHT: string | undefined = RENDERS["../assets/renders/house-night.jpg"];

/**
 * The leading picture of the home page and the sign-in screen: the building by day in the light
 * theme and by night in the dark one. It says what it is, a sample model and not a project of
 * the user; if the image is missing or cannot load, a line drawing takes its place.
 */
export function RenderImage() {
    const theme = useTheme();
    const [failed, setFailed] = useState(false);
    const [ready, setReady] = useState(false);
    const source = theme === "dark" ? (NIGHT ?? DAY) : (DAY ?? NIGHT);

    if (failed || source === undefined) {
        return <ArchitectureArt />;
    }

    return (
        <>
            <img
                key={source}
                className={ready ? "render render-ready" : "render"}
                src={source}
                alt={`Modelo de muestra dibujado con el visor 3D de ARQUILA: una casa de ladrillo de dos plantas, ${source === NIGHT ? "de noche con las ventanas encendidas" : "de día"}`}
                decoding="async"
                onLoad={() => setReady(true)}
                onError={() => setFailed(true)}
            />
            <span className="render-label">Modelo de muestra · visor 3D</span>
        </>
    );
}
