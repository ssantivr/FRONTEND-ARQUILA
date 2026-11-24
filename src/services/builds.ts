import type { Build, BuildApply, BuildSource } from "../types/build";
import { request } from "./http";

export const buildsApi = {
    listByProject: (projectId: number) => request<Build[]>(`/projects/${projectId}/builds`),
    create: (projectId: number, source: BuildSource, consent: boolean) =>
        request<Build>(`/projects/${projectId}/builds`, {
            method: "POST",
            body: { ...source, consent },
        }),
    apply: (id: number, data: BuildApply) =>
        request<Build>(`/builds/${id}/apply`, { method: "POST", body: data }),
    undo: (id: number) => request<Build>(`/builds/${id}/undo`, { method: "POST" }),
};
