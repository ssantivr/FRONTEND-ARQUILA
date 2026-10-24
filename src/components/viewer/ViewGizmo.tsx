import { useEffect, useRef, type MutableRefObject } from "react";

/** Draws the gizmo for a camera direction given in degrees. The viewer calls it on every orbit. */
export type OrbitListener = (azimuth: number, elevation: number) => void;

const SIZE = 72;
const REACH = 24;

/**
 * The three axes of the plan, as the camera sees them: X across the lot, Y towards its back and
 * Z up. The plan's Y is the scene's -z, so the drawing matches the coordinates the user typed.
 */
const AXES: { id: string; vector: [number, number, number] }[] = [
    { id: "x", vector: [1, 0, 0] },
    { id: "y", vector: [0, 0, -1] },
    { id: "z", vector: [0, 1, 0] },
];

interface ViewGizmoProps {
    /** The gizmo leaves here the function that redraws it, so orbiting never re-renders React. */
    listener: MutableRefObject<OrbitListener | null>;
}

/** Orientation gizmo: it turns with the camera to show where the axes of the plan point. */
export function ViewGizmo({ listener }: ViewGizmoProps) {
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
                group?.querySelector("circle")?.setAttribute("cx", endX.toFixed(1));
                group?.querySelector("circle")?.setAttribute("cy", endY.toFixed(1));
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
        <svg ref={svg} className="hud-gizmo" viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
            <circle className="hud-gizmo-disc" cx={SIZE / 2} cy={SIZE / 2} r={SIZE / 2 - 2} />
            {AXES.map((axis) => (
                <g key={axis.id} data-axis={axis.id} className={`hud-gizmo-${axis.id}`}>
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
