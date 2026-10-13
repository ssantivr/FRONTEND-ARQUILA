import type { View } from "./components/Sidebar";
import type { SectionId } from "./pages/ProjectDetailPage";

/** One address per screen. The words are Spanish because the user reads them in the URL bar. */
const VIEW_PATHS: Record<View, string> = {
    home: "/",
    projects: "/proyectos",
    terrains: "/terrenos",
    materials: "/materiales",
    plans: "/planos",
    viewer: "/visor",
    lighting: "/iluminacion",
    interior: "/recorrido",
    render: "/renderizado",
    tasks: "/tareas",
    assistant: "/asistente",
    settings: "/configuracion",
};

const SECTION_SLUGS: Record<SectionId, string> = {
    terrain: "terreno",
    plans: "planos",
    model: "modelo-3d",
    elevations: "elevaciones",
    materials: "materiales",
    analysis: "analisis",
    files: "archivos",
    assistant: "asistente",
};

/** Slugs of earlier versions. A link saved with one of them still opens, and is rewritten. */
const LEGACY_SLUGS = new Map<string, SectionId>([["modelo", "model"]]);

export const DESIGN_SYSTEM_PATH = "/design-system";

export type Route =
    | { kind: "view"; view: View }
    | { kind: "project"; id: number; section: SectionId }
    | { kind: "design-system" }
    | { kind: "unknown" };

export function viewPath(view: View): string {
    return VIEW_PATHS[view];
}

export function projectPath(id: number, section: SectionId = "terrain"): string {
    return `${VIEW_PATHS.projects}/${id}/${SECTION_SLUGS[section]}`;
}

function sectionOf(slug: string | undefined): SectionId | null {
    if (slug === undefined) {
        return "terrain";
    }

    const found = (Object.keys(SECTION_SLUGS) as SectionId[]).find(
        (section) => SECTION_SLUGS[section] === slug,
    );

    return found ?? LEGACY_SLUGS.get(slug) ?? null;
}

export function parsePath(pathname: string): Route {
    const path = pathname.replace(/\/+$/, "") || "/";
    const view = (Object.keys(VIEW_PATHS) as View[]).find((item) => VIEW_PATHS[item] === path);

    if (view !== undefined) {
        return { kind: "view", view };
    }

    if (path === DESIGN_SYSTEM_PATH) {
        return { kind: "design-system" };
    }

    const [, base, id, slug, ...rest] = path.split("/");
    const section = sectionOf(slug);

    if (
        `/${base}` === VIEW_PATHS.projects &&
        /^\d+$/.test(id) &&
        section !== null &&
        rest.length === 0
    ) {
        return { kind: "project", id: Number(id), section };
    }

    return { kind: "unknown" };
}

/**
 * The address a path should be shown as, or `null` when it is already the right one. It turns an
 * old link such as `/proyectos/7/modelo` into `/proyectos/7/modelo-3d`.
 */
export function canonicalPath(pathname: string): string | null {
    const route = parsePath(pathname);

    if (route.kind !== "project") {
        return null;
    }

    const wanted = projectPath(route.id, route.section);
    const [, , , slug] = pathname.replace(/\/+$/, "").split("/");

    return slug !== undefined && pathname.replace(/\/+$/, "") !== wanted ? wanted : null;
}
