import type { ExtractionApply, Proposal, ProposalSection } from "../../types/extraction";

interface ReviewField {
    name: string;
    label: string;
    max?: number;
    numeric?: boolean;
    required?: boolean;
}

export const REVIEW_SECTIONS: { id: ProposalSection; title: string; fields: ReviewField[] }[] = [
    {
        id: "project",
        title: "Proyecto",
        fields: [
            { name: "description", label: "Descripción" },
            { name: "location", label: "Ubicación" },
        ],
    },
    {
        id: "terrain",
        title: "Terreno",
        fields: [
            { name: "name", label: "Nombre del terreno", max: 160, required: true },
            { name: "area_m2", label: "Área (m²)", numeric: true, required: true },
            { name: "width_m", label: "Ancho (m)", numeric: true },
            { name: "length_m", label: "Largo (m)", numeric: true },
            { name: "slope_percent", label: "Pendiente (%)", numeric: true },
            { name: "soil_type", label: "Suelo", max: 80 },
        ],
    },
    {
        id: "plan",
        title: "Plano",
        fields: [
            { name: "title", label: "Título del plano", max: 160, required: true },
            { name: "level", label: "Nivel", max: 60 },
            { name: "scale", label: "Escala", max: 20 },
        ],
    },
];

/** Below this confidence a field is marked "Revisar". The backend uses the same threshold. */
export const SURE_CONFIDENCE = 0.85;

export function initialValues(proposal: Proposal): Record<string, string> {
    const values: Record<string, string> = {};

    for (const [section, fields] of Object.entries(proposal)) {
        for (const [name, field] of Object.entries(fields ?? {})) {
            values[`${section}.${name}`] = String(field.value);
        }
    }

    return values;
}

/** What to send, or the error to show. Nothing is completed or calculated. */
export function buildApply(
    values: Record<string, string>,
    included: ReadonlySet<ProposalSection>,
): { data: ExtractionApply } | { error: string } {
    const data: ExtractionApply = {};

    for (const section of REVIEW_SECTIONS) {
        if (!included.has(section.id)) {
            continue;
        }

        const sent: Record<string, string | number> = {};

        for (const field of section.fields) {
            const text = (values[`${section.id}.${field.name}`] ?? "").trim();

            if (text === "") {
                if (field.required) {
                    return { error: `Completa «${field.label}» o quita «${section.title}».` };
                }

                continue;
            }

            if (field.numeric) {
                const number = Number(text.replace(",", "."));

                if (!Number.isFinite(number)) {
                    return { error: `«${field.label}» debe ser un número.` };
                }

                sent[field.name] = number;
            } else {
                sent[field.name] = text;
            }
        }

        if (Object.keys(sent).length > 0) {
            data[section.id] = sent;
        }
    }

    return Object.keys(data).length > 0 ? { data } : { error: "No hay datos para guardar." };
}
