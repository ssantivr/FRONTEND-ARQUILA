import { Suspense, lazy, useState } from "react";

import { AssistantPanel } from "../components/AssistantPanel";
import { AsyncStatus } from "../components/AsyncStatus";
import { Panel } from "../components/ui/Panel";
import { ProjectPicker } from "../components/ProjectPicker";
import { useAsync } from "../hooks/useAsync";
import { projectsApi } from "../services/api";
import { Button } from "../components/ui/Button";
import { Skeleton } from "../components/ui/Skeleton";

const ProjectModel = lazy(() =>
    import("../components/ProjectModel").then((module) => ({ default: module.ProjectModel })),
);

interface ProjectToolPageProps {
    tool: "viewer" | "assistant";
    /** Opens the 3D model as a walkthrough, from `/visor?modo=recorrido` (N2, R14). */
    walkthrough?: boolean;
    onOpenProject: (projectId: number) => void;
}

const TEXT = {
    viewer: {
        title: "Editor y modelos 3D",
        intro: "Elige un proyecto para ver su modelo. Los cuartos y componentes se editan en la pestaña Modelo 3D del proyecto.",
        open: "Editar en el proyecto",
    },
    assistant: {
        title: "Proyecto",
        intro: "Elige un proyecto: el asistente responde con los datos de ese proyecto y guarda la conversación en él.",
        open: "Abrir el proyecto",
    },
};

export function ProjectToolPage({
    tool,
    walkthrough = false,
    onOpenProject,
}: ProjectToolPageProps) {
    const projects = useAsync(() => projectsApi.list(), []);
    const [chosen, setChosen] = useState<number | null>(null);
    const items = projects.data ?? [];
    const projectId = chosen ?? items[0]?.id ?? null;
    const text = TEXT[tool];
    const chosenName = items.find((project) => project.id === projectId)?.name;

    // The 3D editor is a workspace, not a page: one line to pick the project, then the editor.
    if (tool === "viewer") {
        return (
            <section className="workspace-page" aria-label={text.title}>
                <h1 className="visually-hidden">{text.title}</h1>
                <div className="workspace-head">
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
                    {projectId !== null && (
                        <Button
                            variant="secondary"

                            title="Los cuartos y componentes también se editan en tablas, en la pestaña Modelo 3D del proyecto"
                            onClick={() => onOpenProject(projectId)}
                        >
                            {text.open}
                        </Button>
                    )}
                </div>
                {projectId !== null && (
                    <Suspense fallback={<Skeleton />}>
                        <ProjectModel
                            key={projectId}
                            projectId={projectId}
                            walkthrough={walkthrough}
                            projectName={chosenName}
                        />
                    </Suspense>
                )}
            </section>
        );
    }

    return (
        <>
            <h1 className="visually-hidden">{text.title}</h1>
            <Panel
                title={text.title}
                actions={
                    projectId !== null && (
                        <Button
                            variant="secondary"

                            onClick={() => onOpenProject(projectId)}
                        >
                            {text.open}
                        </Button>
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
            </Panel>
            {projectId !== null && <AssistantPanel key={projectId} projectId={projectId} />}
        </>
    );
}
