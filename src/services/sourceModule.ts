import type { View } from "../components/Sidebar";
import type { SectionId } from "../pages/sections";
import { parsePath } from "../routes";
import type { SourceModule } from "../types/activity";

export { SOURCE_MODULES, type SourceModule } from "../types/activity";

export const MODULE_HEADER = "X-Arquila-Module";

const VIEW_MODULES: Record<View, SourceModule> = {
    home: "home",
    projects: "projects",
    terrains: "terrain",
    plans: "plans",
    materials: "materials",
    viewer: "viewer",
    lighting: "lighting",
    render: "render",
    tasks: "tasks",
    assistant: "assistant",
    settings: "settings",
};

const SECTION_MODULES: Record<SectionId, SourceModule> = {
    summary: "summary",
    terrain: "terrain",
    plans: "plans",
    model: "viewer",
    elevations: "elevations",
    materials: "materials",
    tasks: "tasks",
    versions: "versions",
    activity: "history",
    analysis: "analysis",
    files: "files",
    assistant: "assistant",
};

/** The module the user is working in, read from the address, or `null` outside of any. */
export function sourceModuleOf(pathname: string): SourceModule | null {
    const route = parsePath(pathname);

    if (route.kind === "view") {
        return VIEW_MODULES[route.view];
    }

    if (route.kind === "project") {
        return SECTION_MODULES[route.section];
    }

    return null;
}
