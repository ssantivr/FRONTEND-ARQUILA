import { useState } from "react";

import sampleLoft from "../assets/renders/sample-loft.jpg";
import sampleStairs from "../assets/renders/sample-stairs.jpg";
import { useTheme } from "../state/theme";
import { ArchitectureArt } from "./ArchitectureArt";

/**
 * Drop `house-day.jpg` and/or `house-night.jpg` into `src/assets/renders/` and they replace the
 * sample scene, with no code change. The glob finds whichever of the two exist at build time.
 */
const OWN = import.meta.glob<string>("../assets/renders/house-*.jpg", {
    eager: true,
    query: "?url",
    import: "default",
});
const OWN_DAY: string | undefined = OWN["../assets/renders/house-day.jpg"];
const OWN_NIGHT: string | undefined = OWN["../assets/renders/house-night.jpg"];

interface RenderImageProps {
    /** Where the image is shown; each place has its own sample picture. */
    place: "home" | "auth";
}

/**
 * The leading picture of the home page and the sign-in screen. Until the team provides its own
 * renders it shows the sample loft of the interior walkthrough, labelled as such; if the image
 * cannot load, a line drawing takes its place.
 */
export function RenderImage({ place }: RenderImageProps) {
    const theme = useTheme();
    const [failed, setFailed] = useState(false);
    const [ready, setReady] = useState(false);
    const own = theme === "dark" ? (OWN_NIGHT ?? OWN_DAY) : (OWN_DAY ?? OWN_NIGHT);
    const source = own ?? (place === "home" ? sampleLoft : sampleStairs);

    if (failed) {
        return <ArchitectureArt />;
    }

    return (
        <>
            <img
                key={source}
                className={ready ? "render render-ready" : "render"}
                src={source}
                alt={
                    own === undefined
                        ? "Escena de muestra: interior de un loft con ventanal a la ciudad al atardecer"
                        : "Render arquitectónico de ARQUILA"
                }
                decoding="async"
                onLoad={() => setReady(true)}
                onError={() => setFailed(true)}
            />
            {own === undefined && <span className="render-label">Escena de muestra</span>}
        </>
    );
}
