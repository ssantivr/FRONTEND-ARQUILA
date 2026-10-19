import type { StructureRoom } from "../types/api";

const PAD = 0.4;

interface PlanThumbProps {
    /** All the rooms of the model; only those on the level of `roomId` are drawn. */
    rooms: StructureRoom[];
    roomId: number;
    className?: string;
}

/**
 * A small floor plan of one level with one room filled: where a stop of the walkthrough is.
 * Plain SVG, so it costs nothing next to the 3D scene and works where the scene cannot run.
 */
export function PlanThumb({ rooms, roomId, className }: PlanThumbProps) {
    const room = rooms.find((item) => item.id === roomId);

    if (room === undefined) {
        return null;
    }

    const level = rooms.filter((item) => item.base_m === room.base_m);
    const minX = Math.min(...level.map((item) => item.x_m)) - PAD;
    const minY = Math.min(...level.map((item) => item.y_m)) - PAD;
    const maxX = Math.max(...level.map((item) => item.x_m + item.width_m)) + PAD;
    const maxY = Math.max(...level.map((item) => item.y_m + item.depth_m)) + PAD;

    return (
        <svg
            className={className === undefined ? "plan-thumb" : `plan-thumb ${className}`}
            viewBox={`${minX} ${-maxY} ${maxX - minX} ${maxY - minY}`}
            role="img"
            aria-label={`${room.name} en la planta de ${room.plan_title}`}
        >
            {level.map((item) => (
                <rect
                    key={item.id}
                    className={item.id === roomId ? "plan-thumb-current" : undefined}
                    x={item.x_m}
                    // Plan y grows towards the back of the lot, which is up on the drawing.
                    y={-(item.y_m + item.depth_m)}
                    width={item.width_m}
                    height={item.depth_m}
                />
            ))}
        </svg>
    );
}
