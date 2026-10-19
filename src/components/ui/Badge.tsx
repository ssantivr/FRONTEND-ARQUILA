import type { ProjectStatus } from "../../types/api";
import type { IconName } from "../Icon";
import { Tag, type TagTone } from "./Tag";

const STATUS: Record<ProjectStatus, { label: string; icon: IconName; tone: TagTone }> = {
    draft: { label: "Borrador", icon: "edit", tone: "neutral" },
    active: { label: "Activo", icon: "check", tone: "success" },
    archived: { label: "Archivado", icon: "archive", tone: "warning" },
};

/** The state of a project, told by an icon and a word, never by colour alone. */
export function StatusBadge({ status }: { status: ProjectStatus }) {
    const { label, icon, tone } = STATUS[status];

    // `badge-status` is the hook the screens not yet rebuilt use to place it (phase R9 removes it).
    return (
        <Tag tone={tone} icon={icon} className="badge-status">
            {label}
        </Tag>
    );
}
