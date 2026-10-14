/** The tabs of a project. They live apart from the project screen so the app can name them
 *  (in the address and in the command palette) without loading that screen. */
export type SectionId =
    "terrain" | "plans" | "model" | "elevations" | "materials" | "analysis" | "files" | "assistant";

export const SECTIONS: { id: SectionId; label: string }[] = [
    { id: "terrain", label: "Terreno" },
    { id: "plans", label: "Planos" },
    { id: "model", label: "Modelo 3D" },
    { id: "elevations", label: "Elevaciones" },
    { id: "materials", label: "Materiales" },
    { id: "analysis", label: "Análisis" },
    { id: "files", label: "Archivos" },
    { id: "assistant", label: "Asistente IA" },
];
