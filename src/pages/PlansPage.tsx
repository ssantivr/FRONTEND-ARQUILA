import { useState } from "react";

import { FloorPlansPanel } from "../components/FloorPlansPanel";
import { GeneratedElevationsPanel } from "../components/GeneratedElevationsPanel";
import { SitePlanPanel } from "../components/SitePlanPanel";
import { ToolHead } from "../components/ToolHead";
import { Button } from "../components/ui/Button";
import { Tabs } from "../components/ui/Tabs";
import { useProjectChoice } from "../hooks/useProjectChoice";

type SheetId = "floors" | "facades" | "site";

const SHEETS: { id: SheetId; label: string }[] = [
    { id: "floors", label: "Plantas" },
    { id: "facades", label: "Fachadas y corte" },
    { id: "site", label: "Implantación" },
];

interface PlansPageProps {
    onOpenProject: (projectId: number) => void;
}

/**
 * The drawings of a project in one place. They are generated from its terrains and rooms, so
 * they are read, measured and downloaded here, and edited through the project's data.
 */
export function PlansPage({ onOpenProject }: PlansPageProps) {
    const choice = useProjectChoice();
    const project = choice.project;
    const [sheet, setSheet] = useState<SheetId>("floors");

    return (
        <>
            <ToolHead
                title="Planos 2D"
                meta="Plantas, fachadas, corte e implantación generados con los datos del proyecto"
                choice={choice}
            >
                {project !== null && (
                    <Button variant="secondary" onClick={() => onOpenProject(project.id)}>
                        Editar planos en el proyecto
                    </Button>
                )}
            </ToolHead>

            {project !== null && (
                <>
                    <Tabs
                        label="Tipo de plano"
                        items={SHEETS}
                        current={sheet}
                        onChange={setSheet}
                    />
                    {sheet === "floors" && (
                        <FloorPlansPanel
                            key={project.id}
                            projectId={project.id}
                            projectName={project.name}
                            version={0}
                        />
                    )}
                    {sheet === "facades" && (
                        <GeneratedElevationsPanel
                            key={project.id}
                            projectId={project.id}
                            projectName={project.name}
                        />
                    )}
                    {sheet === "site" && <SitePlanPanel key={project.id} projectId={project.id} />}
                </>
            )}
        </>
    );
}
