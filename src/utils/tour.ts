import type { CameraPose } from "../three/BuildingSceneManager";
import type { StructureRoom, WalkthroughStep } from "../types/api";
import { elementKey } from "./openings";

/** One point of a walkthrough: a room, what is said about it, how long it lasts, where to look. */
export interface TourStop {
    key: string;
    /** The room the stop is in, by its id in the API. */
    roomId: number;
    title: string;
    description: string | null;
    durationMs: number;
    /** How much of the walls above the floor is cut away, in percent. */
    cut: number;
    camera: CameraPose | null;
}

export const TOUR_STEP_MS = 5000;
/** The first stop is seen from this bearing, and each next one turns the camera a little. */
export const TOUR_START_AZIMUTH = 0.6;
export const TOUR_TURN = 0.7;
export const ISOLATION_CUT_PERCENT = 80;

function isPoint(value: unknown): boolean {
    return (
        Array.isArray(value) &&
        value.length === 3 &&
        value.every((item) => typeof item === "number")
    );
}

export function readPose(value: unknown): CameraPose | null {
    const pose = value as Partial<CameraPose> | null | undefined;

    return typeof pose === "object" &&
        pose !== null &&
        isPoint(pose.position) &&
        isPoint(pose.target)
        ? (pose as CameraPose)
        : null;
}

/** The rooms of a model, lowest level first: the order a walk through the house takes. */
export function tourRooms(rooms: StructureRoom[]): StructureRoom[] {
    return rooms.filter((room) => room.kind === "room").sort((a, b) => a.base_m - b.base_m);
}

/**
 * The stops of a walkthrough. The ones saved in the project come first, in their order, and a
 * step whose room no longer exists is left out. Without saved steps every room is a stop.
 */
export function buildStops(
    rooms: StructureRoom[],
    steps: WalkthroughStep[] | undefined,
): { stops: TourStop[]; saved: boolean } {
    const planned = [...(steps ?? [])]
        .sort((a, b) => a.position - b.position)
        .flatMap((item) => {
            const room = rooms.find((candidate) => candidate.id === item.room_id);
            const cut = item.view_config.cut_fraction;

            return room === undefined
                ? []
                : [
                      {
                          key: elementKey(room),
                          roomId: room.id,
                          title: item.title,
                          description: item.description,
                          durationMs: item.duration_ms,
                          cut:
                              typeof cut === "number"
                                  ? Math.round(cut * 100)
                                  : ISOLATION_CUT_PERCENT,
                          camera: readPose(item.view_config.camera),
                      },
                  ];
        });

    if (planned.length > 0) {
        return { stops: planned, saved: true };
    }

    return {
        stops: rooms.map((room) => ({
            key: elementKey(room),
            roomId: room.id,
            title: room.name,
            description: null,
            durationMs: TOUR_STEP_MS,
            cut: ISOLATION_CUT_PERCENT,
            camera: null,
        })),
        saved: false,
    };
}
