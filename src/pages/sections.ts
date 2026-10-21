/** The tabs of a project. They live apart from the project screen so the app can name them
 *  (in the address and in the command palette) without loading that screen. */
export type SectionId =
    | "summary"
    | "terrain"
    | "plans"
    | "model"
    | "elevations"
    | "materials"
    | "tasks"
    | "versions"
    | "activity"
    | "analysis"
    | "files"
    | "assistant";

export const SECTIONS: { id: SectionId; label: string }[] = [
    { id: "summary", label: "Resumen" },
    { id: "terrain", label: "Terreno" },
    { id: "plans", label: "Planos" },
    { id: "model", label: "Modelo 3D" },
    { id: "elevations", label: "Elevaciones" },
    { id: "materials", label: "Materiales" },
    { id: "tasks", label: "Tareas" },
    { id: "versions", label: "Versiones" },
    { id: "activity", label: "Historial" },
    { id: "analysis", label: "Análisis" },
    { id: "files", label: "Archivos" },
    { id: "assistant", label: "Asistente IA" },
];
