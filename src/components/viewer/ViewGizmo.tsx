import { useEffect, useRef, type KeyboardEvent, type MutableRefObject } from "react";

import type { ViewName } from "../../three/BuildingSceneManager";

/** Draws the gizmo for a camera direction given in degrees. The viewer calls it on every orbit. */
export type OrbitListener = (azimuth: number, elevation: number) => void;

const SIZE = 72;
const REACH = 24;

/**
 * The three axes of the plan, as the camera sees them: X across the lot, Y towards its back and
 * Z up. The plan's Y is the scene's -z, so the drawing matches the coordinates the user typed.
 */
const AXES: { id: string; vector: [number, number, number]; view: ViewName; label: string }[] = [
    {
        id: "x",
        vector: [1, 0, 0],
        view: "side",
        label: "Vista de perfil, mirando a lo largo del eje X",
    },
    {
        id: "y",
        vector: [0, 0, -1],
        view: "front",
        label: "Vista de alzado, mirando a lo largo del eje Y",
    },
    { id: "z", vector: [0, 1, 0], view: "top", label: "Vista de planta, desde arriba" },
];

interface ViewGizmoProps {
    /** The gizmo leaves here the function that redraws it, so orbiting never re-renders React. */
    listener: MutableRefObject<OrbitListener | null>;
    /** Clicking an axis looks along it; the centre goes back to the isometric view. */
    onView: (view: ViewName) => void;
}

function onActivate(action: () => void) {
    return (event: KeyboardEvent) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            action();
        }
    };
}

/** Orientation gizmo: it turns with the camera to show where the axes of the plan point, and
 *  each axis is a button to the orthogonal view along it. */
export function ViewGizmo({ listener, onView }: ViewGizmoProps) {
    const svg = useRef<SVGSVGElement>(null);

    useEffect(() => {
        listener.current = (azimuth, elevation) => {
            const yaw = (azimuth * Math.PI) / 180;
            const pitch = (elevation * Math.PI) / 180;
            const gaze = [
                Math.cos(pitch) * Math.sin(yaw),
                Math.sin(pitch),
                Math.cos(pitch) * Math.cos(yaw),
            ];
            // Screen right is gaze × up; screen up is right × gaze.
            const length = Math.hypot(gaze[2], gaze[0]) || 1;
            const right = [-gaze[2] / length, 0, gaze[0] / length];
            const up = [
                right[1] * gaze[2] - right[2] * gaze[1],
                right[2] * gaze[0] - right[0] * gaze[2],
                right[0] * gaze[1] - right[1] * gaze[0],
            ];

            for (const axis of AXES) {
                const [x, y, z] = axis.vector;
                const across = x * right[0] + y * right[1] + z * right[2];
                const above = x * up[0] + y * up[1] + z * up[2];
                const depth = x * gaze[0] + y * gaze[1] + z * gaze[2];
                const endX = SIZE / 2 + across * REACH;
                const endY = SIZE / 2 - above * REACH;
                const group = svg.current?.querySelector<SVGGElement>(`[data-axis="${axis.id}"]`);

                group?.querySelector("line")?.setAttribute("x2", endX.toFixed(1));
                group?.querySelector("line")?.setAttribute("y2", endY.toFixed(1));
                group?.querySelectorAll("circle").forEach((circle) => {
                    circle.setAttribute("cx", endX.toFixed(1));
                    circle.setAttribute("cy", endY.toFixed(1));
                });
                group?.querySelector("text")?.setAttribute("x", endX.toFixed(1));
                group?.querySelector("text")?.setAttribute("y", (endY + 3).toFixed(1));
                // An axis pointing away from the viewer is drawn fainter.
                group?.setAttribute("opacity", depth > 0.2 ? "0.45" : "1");
            }
        };

        return () => {
            listener.current = null;
        };
    }, [listener]);

    return (
        <svg
            ref={svg}
            className="hud-gizmo"
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            role="group"
            aria-label="Orientación de la cámara"
        >
            <circle
                className="hud-gizmo-disc"
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={SIZE / 2 - 2}
                role="button"
                tabIndex={0}
                aria-label="Vista isométrica"
                onClick={() => onView("isometric")}
                onKeyDown={onActivate(() => onView("isometric"))}
            >
                <title>Vista isométrica</title>
            </circle>
            {AXES.map((axis) => (
                <g
                    key={axis.id}
                    data-axis={axis.id}
                    className={`hud-gizmo-${axis.id} hud-gizmo-axis`}
                    role="button"
                    tabIndex={0}
                    aria-label={axis.label}
                    onClick={() => onView(axis.view)}
                    onKeyDown={onActivate(() => onView(axis.view))}
                >
                    <title>{axis.label}</title>
                    {/* The target: 24 px across (WCAG 2.5.8), and the focus ring. */}
                    <circle className="hud-gizmo-hit" cx={SIZE / 2} cy={SIZE / 2} r="12" />
                    <line x1={SIZE / 2} y1={SIZE / 2} x2={SIZE / 2} y2={SIZE / 2} />
                    <circle cx={SIZE / 2} cy={SIZE / 2} r="7" />
                    <text x={SIZE / 2} y={SIZE / 2} textAnchor="middle">
                        {axis.id.toUpperCase()}
                    </text>
                </g>
            ))}
        </svg>
    );
}
