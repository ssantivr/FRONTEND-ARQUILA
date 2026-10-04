import { Suspense, lazy, useState } from "react";

import { AssistantPanel } from "../components/AssistantPanel";
import { AsyncStatus } from "../components/AsyncStatus";
import { Panel } from "../components/Panel";
import { ProjectPicker } from "../components/ProjectPicker";
import { useAsync } from "../hooks/useAsync";
import { projectsApi } from "../services/api";

const ProjectModel = lazy(() =>
    import("../components/ProjectModel").then((module) => ({ default: module.ProjectModel })),
);

interface ProjectToolPageProps {
    tool: "viewer" | "assistant";
    onOpenProject: (projectId: number) => void;
}

const TEXT = {
    viewer: {
        title: "Visualización 3D",
        intro: "Elige un proyecto para ver su modelo. Los cuartos y componentes se editan en la pestaña Modelo 3D del proyecto.",
        open: "Editar en el proyecto",
    },
    assistant: {
        title: "Proyecto",
        intro: "Elige un proyecto: el asistente responde con los datos de ese proyecto y guarda la conversación en él.",
        open: "Abrir el proyecto",
    },
};

export function ProjectToolPage({ tool, onOpenProject }: ProjectToolPageProps) {
    const projects = useAsync(() => projectsApi.list(), []);
    const [chosen, setChosen] = useState<number | null>(null);
    const items = projects.data ?? [];
    const projectId = chosen ?? items[0]?.id ?? null;
    const text = TEXT[tool];

    return (
        <>
            <Panel
                title={text.title}
                actions={
                    projectId !== null && (
                        <button
                            type="button"
                            className="button-secondary"
                            onClick={() => onOpenProject(projectId)}
                        >
                            {text.open}
                        </button>
                    )
                }
            >
                <p className="message">{text.intro}</p>
                <AsyncStatus
                    loading={projects.loading}
                    error={projects.error}
                    onRetry={projects.reload}
                    isEmpty={items.length === 0}
                    emptyText="Todavía no tienes proyectos. Crea el primero desde Proyectos."
                />
                {items.length > 0 && (
                    <ProjectPicker projects={items} value={projectId} onChange={setChosen} />
                )}
                {tool === "viewer" && projectId !== null && (
                    <Suspense fallback={<p className="message">Cargando…</p>}>
                        <ProjectModel projectId={projectId} />
                    </Suspense>
                )}
            </Panel>
            {tool === "assistant" && projectId !== null && (
                <AssistantPanel key={projectId} projectId={projectId} />
            )}
        </>
    );
}
