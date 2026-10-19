import { describe, expect, it } from "vitest";

import type { RenovationLog } from "../types/api";
import { buildTimeline, dayNumber, dayText, placeTask, share } from "./timeline";

function task(id: number, dates: Partial<RenovationLog>): RenovationLog {
    return {
        id,
        project_id: 1,
        room_id: null,
        spatial_element_id: null,
        created_by: null,
        layer: "finishes",
        title: `Tarea ${id}`,
        description: null,
        status: "planned",
        planned_start: null,
        planned_end: null,
        completed_at: null,
        estimated_cost: null,
        created_at: "2026-10-01T00:00:00Z",
        updated_at: "2026-10-01T00:00:00Z",
        ...dates,
    };
}

describe("timeline", () => {
    it("reads days and full dates as the same calendar day", () => {
        expect(dayNumber("2026-10-05")).toBe(dayNumber("2026-10-05T23:59:00Z"));
        expect(dayText(dayNumber("2026-02-28") + 1)).toBe("2026-03-01");
    });

    it("draws a bar only with both planned dates, and never invents the missing one", () => {
        const bar = placeTask(task(1, { planned_start: "2026-10-01", planned_end: "2026-10-10" }));
        const onlyEnd = placeTask(task(2, { planned_end: "2026-10-10" }));

        expect(bar?.start).toBe(dayNumber("2026-10-01"));
        expect(bar?.end).toBe(dayNumber("2026-10-10"));
        expect(bar?.single).toBeNull();

        expect(onlyEnd?.start).toBeNull();
        expect(onlyEnd?.end).toBeNull();
        expect(onlyEnd?.single).toBe(dayNumber("2026-10-10"));
        expect(onlyEnd?.singleKind).toBe("end");
    });

    it("keeps a task with no date at all apart", () => {
        const timeline = buildTimeline([
            task(1, {}),
            task(2, { completed_at: "2026-10-03T10:00:00Z" }),
        ]);

        expect(timeline.undated.map((item) => item.id)).toEqual([1]);
        expect(timeline.placed[0].done).toBe(dayNumber("2026-10-03"));
    });

    it("spans every date of the tasks and marks the months inside", () => {
        const timeline = buildTimeline([
            task(1, { planned_start: "2026-09-20", planned_end: "2026-10-04" }),
            task(2, { planned_end: "2026-11-15" }),
        ]);

        expect(timeline.from).toBe(dayNumber("2026-09-20"));
        expect(timeline.to).toBe(dayNumber("2026-11-15"));
        expect(timeline.months.map(dayText)).toEqual(["2026-10-01", "2026-11-01"]);
    });

    it("has no range when nothing is dated", () => {
        expect(buildTimeline([task(1, {})])).toMatchObject({ from: null, to: null });
    });

    it("places a day as a share of the range, clamped to it", () => {
        expect(share(5, 0, 10)).toBe(0.5);
        expect(share(-3, 0, 10)).toBe(0);
        expect(share(12, 0, 10)).toBe(1);
    });
});
