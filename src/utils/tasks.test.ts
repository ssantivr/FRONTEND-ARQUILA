import { describe, expect, it } from "vitest";

import type { RenovationLog, RenovationStatus } from "../types/api";
import { isOverdue, localDay, taskProgress, taskStatusLabel, upcomingTasks } from "./tasks";

function task(id: number, status: RenovationStatus, plannedEnd: string | null = null) {
    return { id, status, planned_end: plannedEnd } as RenovationLog;
}

describe("upcomingTasks", () => {
    it("keeps the unfinished tasks with an end date, the nearest first", () => {
        const tasks = [
            task(1, "planned", "2026-12-01"),
            task(2, "in_progress", "2026-11-01"),
            task(3, "completed", "2026-10-01"),
            task(4, "cancelled", "2026-10-02"),
            task(5, "planned", null),
        ];

        expect(upcomingTasks(tasks, 5).map((item) => item.id)).toEqual([2, 1]);
        expect(upcomingTasks(tasks, 1).map((item) => item.id)).toEqual([2]);
    });
});

describe("localDay and taskStatusLabel", () => {
    it("writes the day as a task does, with its zeros", () => {
        expect(localDay(new Date(2026, 2, 5))).toBe("2026-03-05");
    });

    it("names a status in words", () => {
        expect(taskStatusLabel("in_progress")).toBe("En curso");
    });
});

describe("taskProgress", () => {
    it("measures progress over the tasks that were not cancelled", () => {
        const progress = taskProgress(
            [
                task(1, "completed"),
                task(2, "in_progress"),
                task(3, "planned"),
                task(4, "cancelled"),
            ],
            "2026-10-13",
        );

        expect(progress.total).toBe(4);
        expect(progress.completed).toBe(1);
        expect(progress.done).toBeCloseTo(1 / 3);
    });

    it("has no progress to show without tasks, or with all of them cancelled", () => {
        expect(taskProgress([], "2026-10-13").done).toBeNull();
        expect(taskProgress([task(1, "cancelled")], "2026-10-13").done).toBeNull();
    });

    it("counts as overdue only what is unfinished and past its end date", () => {
        const tasks = [
            task(1, "planned", "2026-10-01"),
            task(2, "completed", "2026-10-01"),
            task(3, "in_progress", "2026-10-13"),
            task(4, "in_progress"),
        ];

        expect(taskProgress(tasks, "2026-10-13").overdue).toBe(1);
        expect(isOverdue(tasks[2], "2026-10-14")).toBe(true);
    });
});
