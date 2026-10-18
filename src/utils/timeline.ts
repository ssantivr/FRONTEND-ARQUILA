import type { RenovationLog } from "../types/api";

const DAY_MS = 86_400_000;

/** Days since 1970 of a `YYYY-MM-DD` day (or the day part of a full date and time). */
export function dayNumber(day: string): number {
    const [year, month, date] = day.slice(0, 10).split("-").map(Number);

    return Math.round(Date.UTC(year, month - 1, date) / DAY_MS);
}

/** The `YYYY-MM-DD` day of a day number. */
export function dayText(day: number): string {
    return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

/**
 * Where a task goes on the timeline. Only its own dates are used:
 * - `start` and `end`: a bar, when both planned dates exist;
 * - `single`: a mark, when only one of them exists (it is not stretched into a bar);
 * - `done`: the day it was completed, a mark of its own.
 */
export interface PlacedTask {
    task: RenovationLog;
    start: number | null;
    end: number | null;
    single: number | null;
    /** Which planned date `single` is. */
    singleKind: "start" | "end" | null;
    done: number | null;
}

export interface Timeline {
    /** First and last day shown; `null` when no task has a date. */
    from: number | null;
    to: number | null;
    placed: PlacedTask[];
    /** Tasks without any date: listed apart, never placed on a made-up day. */
    undated: RenovationLog[];
    /** First day of each month inside the range, for the scale. */
    months: number[];
}

export function placeTask(task: RenovationLog): PlacedTask | null {
    const start = task.planned_start === null ? null : dayNumber(task.planned_start);
    const end = task.planned_end === null ? null : dayNumber(task.planned_end);
    const done = task.completed_at === null ? null : dayNumber(task.completed_at);

    if (start === null && end === null && done === null) {
        return null;
    }

    const both = start !== null && end !== null;

    return {
        task,
        start: both ? Math.min(start, end) : null,
        end: both ? Math.max(start, end) : null,
        single: both ? null : (start ?? end),
        singleKind: both ? null : start !== null ? "start" : end !== null ? "end" : null,
        done,
    };
}

/** Lays the tasks on one time scale, from their first date to their last. */
export function buildTimeline(tasks: readonly RenovationLog[]): Timeline {
    const placed: PlacedTask[] = [];
    const undated: RenovationLog[] = [];

    for (const task of tasks) {
        const place = placeTask(task);

        if (place === null) {
            undated.push(task);
        } else {
            placed.push(place);
        }
    }

    const days = placed.flatMap((item) =>
        [item.start, item.end, item.single, item.done].filter((day): day is number => day !== null),
    );

    if (days.length === 0) {
        return { from: null, to: null, placed, undated, months: [] };
    }

    const from = Math.min(...days);
    // One day at least, so a single date still has width to be drawn in.
    const to = Math.max(Math.max(...days), from + 1);
    const months: number[] = [];
    const first = new Date(from * DAY_MS);
    let cursor = Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 1);

    while (cursor / DAY_MS <= to) {
        months.push(Math.round(cursor / DAY_MS));
        const next = new Date(cursor);
        cursor = Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 1);
    }

    return { from, to, placed, undated, months };
}

/** Position of a day inside the range, from 0 to 1. */
export function share(day: number, from: number, to: number): number {
    return to === from ? 0 : Math.min(1, Math.max(0, (day - from) / (to - from)));
}
