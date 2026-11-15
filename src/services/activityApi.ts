import type { ActivityFilters } from "../types/activity";
import type { ActivityPage } from "../types/api";
import { request } from "./http";

export const activityApi = {
    listByProject: (projectId: number, page = 1, pageSize = 50, filters: ActivityFilters = {}) =>
        request<ActivityPage>(`/projects/${projectId}/activity`, {
            query: {
                page,
                page_size: pageSize,
                origin: filters.origin,
                source_module: filters.sourceModule,
                from: filters.from,
                to: filters.to,
            },
        }),
};
