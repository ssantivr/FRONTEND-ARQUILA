import type { ProjectStatus } from "../types/api";
import { Icon, type IconName } from "./Icon";

const STATUS_LABELS: Record<ProjectStatus, string> = {
    draft: "Borrador",
    active: "Activo",
    archived: "Archivado",
};

const STATUS_ICONS: Record<ProjectStatus, IconName> = {
    draft: "edit",
    active: "check",
    archived: "archive",
};

/** The state is told by an icon and a word, never by colour alone. */
export function StatusBadge({ status }: { status: ProjectStatus }) {
    return (
        <span className={`badge badge-status badge-${status}`}>
            <Icon name={STATUS_ICONS[status]} />
            {STATUS_LABELS[status]}
        </span>
    );
}
