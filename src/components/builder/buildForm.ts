import type {
    BuildApply,
    BuildItemApply,
    BuildLevelApply,
    ProposedFields,
    ProposedLevel,
} from "../../types/build";

export type FieldKind = "text" | "measure" | "position" | "kind";

export interface BuildField {
    name: string;
    label: string;
    kind: FieldKind;
    max?: number;
    required: boolean;
}

export const LEVEL_FIELDS: BuildField[] = [
    { name: "title", label: "Nombre del nivel", kind: "text", max: 160, required: true },
    { name: "level", label: "Código o piso (opcional)", kind: "text", max: 60, required: false },
    { name: "scale", label: "Escala (opcional)", kind: "text", max: 20, required: false },
];

const ITEM_FIELDS: BuildField[] = [
    { name: "name", label: "Nombre", kind: "text", max: 160, required: true },
    { name: "x_m", label: "X (m)", kind: "position", required: true },
    { name: "y_m", label: "Y (m)", kind: "position", required: true },
    { name: "width_m", label: "Ancho (m)", kind: "measure", required: true },
    { name: "depth_m", label: "Fondo (m)", kind: "measure", required: true },
    { name: "height_m", label: "Alto (m)", kind: "measure", required: true },
];

export const ROOM_FIELDS = ITEM_FIELDS;

export const COMPONENT_FIELDS: BuildField[] = [
    { name: "kind", label: "Tipo", kind: "kind", required: true },
    ...ITEM_FIELDS,
];

export const COMPONENT_KINDS = [
    { value: "column", label: "Columna" },
    { value: "beam", label: "Viga" },
    { value: "wall", label: "Muro" },
];

export interface ItemForm {
    key: string;
    values: Record<string, string>;
    /** What the AI read for each field: its quote and confidence. */
    read: ProposedFields;
}

export interface LevelForm extends ItemForm {
    rooms: ItemForm[];
    components: ItemForm[];
}

let nextKey = 0;

function itemForm(read: ProposedFields): ItemForm {
    nextKey += 1;

    const values: Record<string, string> = {};

    for (const [name, field] of Object.entries(read)) {
        values[name] = String(field.value);
    }

    return { key: `item-${nextKey}`, values, read };
}

export function emptyItem(): ItemForm {
    return itemForm({});
}

export function initialLevels(levels: ProposedLevel[]): LevelForm[] {
    return levels.map((level) => ({
        ...itemForm(level.fields),
        rooms: level.rooms.map(itemForm),
        components: level.components.map(itemForm),
    }));
}

function isEmpty(form: ItemForm, field: BuildField): boolean {
    return field.required && (form.values[field.name] ?? "").trim() === "";
}

/** How many required values nobody has given yet: the AI never fills them in. */
export function countMissing(levels: LevelForm[]): number {
    return levels.reduce(
        (total, level) =>
            total +
            LEVEL_FIELDS.filter((field) => isEmpty(level, field)).length +
            level.rooms.reduce(
                (sum, room) => sum + ROOM_FIELDS.filter((field) => isEmpty(room, field)).length,
                0,
            ) +
            level.components.reduce(
                (sum, item) =>
                    sum + COMPONENT_FIELDS.filter((field) => isEmpty(item, field)).length,
                0,
            ),
        0,
    );
}

function readValue(
    form: ItemForm,
    field: BuildField,
    where: string,
): { value?: string | number } | { error: string } {
    const text = (form.values[field.name] ?? "").trim();

    if (text === "") {
        return field.required ? { error: `Falta «${field.label}» en ${where}.` } : {};
    }

    if (field.kind === "text" || field.kind === "kind") {
        return { value: text };
    }

    const typed = Number(text.replace(",", "."));
    // The backend keeps two decimals and checks the bounds on the rounded value.
    const number = Math.round(typed * 100) / 100;

    if (!Number.isFinite(typed)) {
        return { error: `«${field.label}» en ${where} debe ser un número.` };
    }

    if (field.kind === "measure" && (number <= 0 || number >= 1000)) {
        return { error: `«${field.label}» en ${where} debe ser mayor que 0 y menor que 1000.` };
    }

    if (field.kind === "position" && Math.abs(number) > 100_000) {
        return { error: `«${field.label}» en ${where} está fuera del rango permitido.` };
    }

    return { value: number };
}

type ItemData = Record<string, string | number>;

function readItem(
    form: ItemForm,
    fields: BuildField[],
    where: string,
): { data: ItemData } | { error: string } {
    const data: ItemData = {};

    for (const field of fields) {
        const read = readValue(form, field, where);

        if ("error" in read) {
            return read;
        }

        if (read.value !== undefined) {
            data[field.name] = read.value;
        }
    }

    return { data };
}

function text(data: ItemData, name: string): string {
    return String(data[name]);
}

function optionalText(data: ItemData, name: string): string | undefined {
    return data[name] === undefined ? undefined : String(data[name]);
}

function toItem(data: ItemData): BuildItemApply {
    return {
        name: text(data, "name"),
        x_m: Number(data.x_m),
        y_m: Number(data.y_m),
        width_m: Number(data.width_m),
        depth_m: Number(data.depth_m),
        height_m: Number(data.height_m),
    };
}

/** What to send, or the first error to show. Nothing is completed or calculated. */
export function toApply(levels: LevelForm[]): { data: BuildApply } | { error: string } {
    if (levels.length === 0) {
        return { error: "Deja al menos un nivel." };
    }

    const sent: BuildLevelApply[] = [];

    for (const [index, level] of levels.entries()) {
        const head = readItem(level, LEVEL_FIELDS, `el nivel ${index + 1}`);

        if ("error" in head) {
            return head;
        }

        const sentLevel: BuildLevelApply = {
            title: text(head.data, "title"),
            rooms: [],
            components: [],
        };
        const levelName = optionalText(head.data, "level");
        const scale = optionalText(head.data, "scale");

        if (levelName !== undefined) {
            sentLevel.level = levelName;
        }

        if (scale !== undefined) {
            sentLevel.scale = scale;
        }

        for (const [position, room] of level.rooms.entries()) {
            const read = readItem(
                room,
                ROOM_FIELDS,
                `el ambiente ${position + 1} del nivel ${index + 1}`,
            );

            if ("error" in read) {
                return read;
            }

            sentLevel.rooms.push(toItem(read.data));
        }

        for (const [position, item] of level.components.entries()) {
            const read = readItem(
                item,
                COMPONENT_FIELDS,
                `el elemento ${position + 1} del nivel ${index + 1}`,
            );

            if ("error" in read) {
                return read;
            }

            sentLevel.components.push({ kind: text(read.data, "kind"), ...toItem(read.data) });
        }

        sent.push(sentLevel);
    }

    return { data: { levels: sent } };
}
