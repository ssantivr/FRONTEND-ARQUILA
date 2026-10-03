import type { ProjectStatus } from "../types/api";

const STATUS_LABELS: Record<ProjectStatus, string> = {
    draft: "Borrador",
    active: "Activo",
    archived: "Archivado",
};

export function StatusBadge({ status }: { status: ProjectStatus }) {
    return <span className={`badge badge-${status}`}>{STATUS_LABELS[status]}</span>;
}
