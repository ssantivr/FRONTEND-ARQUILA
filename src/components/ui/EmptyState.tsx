import type { ReactNode } from "react";

interface EmptyStateProps {
    /** Short headline; the text below it explains what to do. */
    title?: string;
    text: string;
    /** Optional next step, such as the button that creates the first item. */
    action?: ReactNode;
}

export function EmptyState({ title, text, action }: EmptyStateProps) {
    return (
        <div className="empty-state">
            <svg className="empty-art" viewBox="0 0 96 64" aria-hidden="true">
                <path className="empty-art-ground" d="M6 56h84" />
                <path className="empty-art-fill" d="M22 56V30l22-16 22 16v26z" />
                <path d="M22 56V30l22-16 22 16v26M38 56V40h12v16M30 34h6M52 34h6" />
                <path className="empty-art-soft" d="M76 56V44M76 44a6 6 0 100-12 6 6 0 000 12z" />
            </svg>
            {title && <p className="empty-title">{title}</p>}
            <p className="message">{text}</p>
            {action}
        </div>
    );
}

/**
 * The next step of an empty list whose form sits in the same panel: it takes the cursor to the
 * first field of that form, scrolling to it if it is out of view.
 */
export function FocusFormButton({ children }: { children: ReactNode }) {
    return (
        <button
            type="button"
            className="button-secondary"
            onClick={(event) => {
                const field = event.currentTarget
                    .closest(".panel")
                    ?.querySelector<HTMLElement>("form :is(input, select, textarea)");

                field?.scrollIntoView?.({ block: "center" });
                field?.focus();
            }}
        >
            {children}
        </button>
    );
}
