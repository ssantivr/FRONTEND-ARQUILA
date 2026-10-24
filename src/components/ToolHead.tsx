import type { ReactNode } from "react";

import type { useProjectChoice } from "../hooks/useProjectChoice";
import { AsyncStatus } from "./AsyncStatus";
import { ProjectPicker } from "./ProjectPicker";

interface ToolHeadProps {
    title: string;
    meta: string;
    choice: ReturnType<typeof useProjectChoice>;
    /** Buttons of the screen, beside the project picker. */
    children?: ReactNode;
}

/** Head of a screen that works on one project: its title, the project picker and its actions. */
export function ToolHead({ title, meta, choice, children }: ToolHeadProps) {
    return (
        <>
            <header className="page-head tool-head">
                <div>
                    <h2>{title}</h2>
                    <p className="page-head-meta">{meta}</p>
                </div>
                <div className="tool-head-actions">
                    {choice.project !== null && (
                        <ProjectPicker
                            projects={choice.projects}
                            value={choice.project.id}
                            onChange={choice.choose}
                        />
                    )}
                    {children}
                </div>
            </header>
            <AsyncStatus
                loading={choice.loading}
                error={choice.error}
                onRetry={choice.reload}
                isEmpty={choice.projects.length === 0}
                emptyTitle="Sin proyectos"
                emptyText="Todavía no tienes proyectos. Crea el primero desde Proyectos."
            />
        </>
    );
}
