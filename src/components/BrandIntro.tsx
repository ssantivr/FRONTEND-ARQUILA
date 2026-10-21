import { useEffect, useState } from "react";

import { prefersReducedMotion } from "../state/motion";
import { LogoMark } from "./ui/Logo";

import styles from "./BrandIntro.module.css";

const SEEN_KEY = "arquila:intro";
/** A little longer than the CSS: the pieces (600 ms) and the fade (240 ms after 720 ms). */
export const INTRO_MS = 1000;

/** Once per browser tab, and never when less movement is asked for. */
export function shouldPlayIntro(): boolean {
    if (prefersReducedMotion()) {
        return false;
    }

    try {
        return window.sessionStorage.getItem(SEEN_KEY) === null;
    } catch {
        return false;
    }
}

/**
 * The entry of the app: the four volumes of the mark settle one after the other, like a building
 * going up, and the name appears; then it all fades. It lasts under a second, does not catch clicks
 * (the page under it is already usable) and any key or click ends it at once.
 */
export function BrandIntro() {
    const [playing, setPlaying] = useState(shouldPlayIntro);

    useEffect(() => {
        if (!playing) {
            return;
        }

        try {
            window.sessionStorage.setItem(SEEN_KEY, "seen");
        } catch {}

        const stop = () => setPlaying(false);
        const timer = window.setTimeout(stop, INTRO_MS);

        window.addEventListener("keydown", stop);
        window.addEventListener("pointerdown", stop);

        return () => {
            window.clearTimeout(timer);
            window.removeEventListener("keydown", stop);
            window.removeEventListener("pointerdown", stop);
        };
    }, [playing]);

    if (!playing) {
        return null;
    }

    return (
        <div className={styles.intro} aria-hidden="true" data-testid="brand-intro">
            <div className={styles.lockup}>
                <LogoMark size={56} className={styles.mark} />
                <span className={styles.word}>ARQUILA</span>
            </div>
        </div>
    );
}
