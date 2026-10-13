import { useEffect, useState } from "react";

interface CountUpProps {
    value: number;
    format: (value: number) => string;
}

const DURATION_MS = 700;

/** True when neither the system nor the user's own switch asks for less motion. */
function motionAllowed(): boolean {
    return (
        typeof window.matchMedia === "function" &&
        !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
        document.documentElement.dataset.motion !== "reduced"
    );
}

/**
 * A figure that counts from zero up to its real value when it appears. The value is always the
 * one it was given: only the way it arrives is animated, and not at all with reduced motion.
 */
export function CountUp({ value, format }: CountUpProps) {
    const [shown, setShown] = useState(() => (motionAllowed() ? 0 : value));

    useEffect(() => {
        if (!motionAllowed()) {
            setShown(value);
            return;
        }

        const start = performance.now();
        let frame = requestAnimationFrame(function tick(now) {
            const progress = Math.min(1, (now - start) / DURATION_MS);
            const eased = 1 - (1 - progress) ** 3;

            setShown(progress === 1 ? value : value * eased);

            if (progress < 1) {
                frame = requestAnimationFrame(tick);
            }
        });

        return () => cancelAnimationFrame(frame);
    }, [value]);

    // Whole figures stay whole on the way up; money keeps its cents only at the end.
    return <>{format(shown === value ? value : Math.round(shown))}</>;
}
