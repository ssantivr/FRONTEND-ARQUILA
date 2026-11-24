import type { Extraction, ExtractionApply, ExtractionAvailability } from "../types/extraction";
import { request } from "./http";

export const extractionsApi = {
    status: () => request<ExtractionAvailability>("/extraction/status"),
    listByProject: (projectId: number) =>
        request<Extraction[]>(`/projects/${projectId}/extractions`),
    create: (projectId: number, fileId: number, consent: boolean) =>
        request<Extraction>(`/projects/${projectId}/extractions`, {
            method: "POST",
            body: { file_id: fileId, consent },
        }),
    apply: (id: number, data: ExtractionApply) =>
        request<Extraction>(`/extractions/${id}/apply`, { method: "POST", body: data }),
    undo: (id: number) => request<Extraction>(`/extractions/${id}/undo`, { method: "POST" }),
};
