import type { ReactNode } from "react";

interface EmptyStateProps {
    text: string;
    /** Optional next step, such as the button that creates the first item. */
    action?: ReactNode;
}

export function EmptyState({ text, action }: EmptyStateProps) {
    return (
        <div className="empty-state">
            <svg className="empty-art" viewBox="0 0 64 48" aria-hidden="true">
                <path d="M4 44h56M12 44V20l20-14 20 14v24M26 44V30h12v14" />
            </svg>
            <p className="message">{text}</p>
            {action}
        </div>
    );
}
