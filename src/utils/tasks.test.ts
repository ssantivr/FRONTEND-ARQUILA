import { describe, expect, it } from "vitest";

import type { RenovationLog, RenovationStatus } from "../types/api";
import { isOverdue, taskProgress } from "./tasks";

function task(id: number, status: RenovationStatus, plannedEnd: string | null = null) {
    return { id, status, planned_end: plannedEnd } as RenovationLog;
}

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
