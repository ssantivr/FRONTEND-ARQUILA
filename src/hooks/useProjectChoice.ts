import { useState } from "react";

import { projectsApi } from "../services/api";
import type { Project } from "../types/api";
import { useAsync } from "./useAsync";

const KEY = "arquila:tool-project";

function remembered(): number | null {
    try {
        const stored = Number(window.sessionStorage.getItem(KEY));

        return Number.isInteger(stored) && stored > 0 ? stored : null;
    } catch {
        return null;
    }
}

interface ProjectChoice {
    projects: Project[];
    project: Project | null;
    loading: boolean;
    error: string | null;
    reload: () => void;
    choose: (projectId: number) => void;
}

/**
 * The project a tool screen works on. The choice is remembered while the tab is open, so going
 * from the lighting to the render keeps the same project; without one, it is the first.
 */
export function useProjectChoice(): ProjectChoice {
    const list = useAsync(() => projectsApi.list(), []);
    const [chosen, setChosen] = useState(remembered);
    const projects = list.data ?? [];

    function choose(projectId: number) {
        setChosen(projectId);

        try {
            window.sessionStorage.setItem(KEY, String(projectId));
        } catch {
            // Without storage the choice simply lasts until the screen is left.
        }
    }

    return {
        projects,
        project: projects.find((item) => item.id === chosen) ?? projects[0] ?? null,
        loading: list.loading,
        error: list.error,
        reload: list.reload,
        choose,
    };
}
