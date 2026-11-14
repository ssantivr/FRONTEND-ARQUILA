import type { View } from "./components/Sidebar";
import type { SectionId } from "./pages/sections";

/** One address per screen. The words are Spanish because the user reads them in the URL bar. */
const VIEW_PATHS: Record<View, string> = {
    home: "/",
    projects: "/proyectos",
    terrains: "/terrenos",
    materials: "/materiales",
    plans: "/planos",
    viewer: "/visor",
    lighting: "/iluminacion",
    render: "/renderizado",
    tasks: "/tareas",
    assistant: "/asistente",
    settings: "/configuracion",
};

const SECTION_SLUGS: Record<SectionId, string> = {
    summary: "resumen",
    terrain: "terreno",
    plans: "planos",
    model: "modelo-3d",
    elevations: "elevaciones",
    materials: "materiales",
    tasks: "tareas",
    versions: "versiones",
    activity: "historial",
    analysis: "analisis",
    files: "archivos",
    assistant: "asistente",
};

/** The query that opens the 3D viewer as a walkthrough (N2, R14): `/visor?modo=recorrido`. */
const MODE_PARAM = "modo";
const WALKTHROUGH_MODE = "recorrido";

/** Screens of earlier versions, with the query their new address adds. The walkthrough is a
 *  mode of the 3D viewer (R14), so its old address opens the viewer as a walkthrough. */
const LEGACY_VIEWS = new Map<string, { view: View; query: string }>([
    ["/recorrido", { view: "viewer", query: `${MODE_PARAM}=${WALKTHROUGH_MODE}` }],
]);

/** Whether the address asks the 3D viewer to open as a walkthrough. */
export function isWalkthrough(search: string): boolean {
    return new URLSearchParams(search).get(MODE_PARAM) === WALKTHROUGH_MODE;
}

/** `path` (which may carry a query of its own) followed by the query the address already had. */
export function withQuery(path: string, search: string): string {
    const extra = search.replace(/^\?/, "");

    if (extra === "") {
        return path;
    }

    return `${path}${path.includes("?") ? "&" : "?"}${extra}`;
}

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

export function projectPath(id: number, section: SectionId = "summary"): string {
    return `${VIEW_PATHS.projects}/${id}/${SECTION_SLUGS[section]}`;
}

function sectionOf(slug: string | undefined): SectionId | null {
    if (slug === undefined) {
        return "summary";
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

    const legacyView = LEGACY_VIEWS.get(path);

    if (legacyView !== undefined) {
        return { kind: "view", view: legacyView.view };
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
 * old link such as `/proyectos/7/modelo` into `/proyectos/7/modelo-3d`, and `/recorrido` into
 * `/visor?modo=recorrido`.
 */
export function canonicalPath(pathname: string): string | null {
    const route = parsePath(pathname);
    const legacyView = LEGACY_VIEWS.get(pathname.replace(/\/+$/, "") || "/");

    if (legacyView !== undefined) {
        return `${viewPath(legacyView.view)}?${legacyView.query}`;
    }

    if (route.kind !== "project") {
        return null;
    }

    const wanted = projectPath(route.id, route.section);
    const [, , , slug] = pathname.replace(/\/+$/, "").split("/");

    return slug !== undefined && pathname.replace(/\/+$/, "") !== wanted ? wanted : null;
}
