import { elementKey, type CameraPose } from "../../three/BuildingSceneManager";
import type { StructureRoom, WalkthroughStep } from "../../types/api";

export const TOUR_STEP_MS = 5000;
export const ISOLATION_CUT_PERCENT = 80;

export interface TourStop {
    key: string;
    title: string;
    description: string | null;
    durationMs: number;
    cut: number;
    camera: CameraPose | null;
}

function isPoint(value: unknown): boolean {
    return (
        Array.isArray(value) &&
        value.length === 3 &&
        value.every((item) => typeof item === "number")
    );
}

function readPose(value: unknown): CameraPose | null {
    const pose = value as Partial<CameraPose> | null | undefined;

    return typeof pose === "object" &&
        pose !== null &&
        isPoint(pose.position) &&
        isPoint(pose.target)
        ? (pose as CameraPose)
        : null;
}

/** The stops planned for the project; without any, one per room from the bottom up. */
export function tourStops(rooms: StructureRoom[], steps: WalkthroughStep[] = []): TourStop[] {
    const planned = steps.flatMap((item) => {
        const room = rooms.find((candidate) => candidate.id === item.room_id);
        const cut = item.view_config.cut_fraction;

        return room === undefined
            ? []
            : [
                  {
                      key: elementKey(room),
                      title: item.title,
                      description: item.description,
                      durationMs: item.duration_ms,
                      cut: typeof cut === "number" ? Math.round(cut * 100) : ISOLATION_CUT_PERCENT,
                      camera: readPose(item.view_config.camera),
                  },
              ];
    });

    return planned.length > 0
        ? planned
        : rooms.map((room) => ({
              key: elementKey(room),
              title: room.name,
              description: null,
              durationMs: TOUR_STEP_MS,
              cut: ISOLATION_CUT_PERCENT,
              camera: null,
          }));
}
