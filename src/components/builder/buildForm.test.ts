import { describe, expect, it } from "vitest";

import { countMissing, emptyItem, initialLevels, toApply } from "./buildForm";

const read = (value: string | number) => ({ value, confidence: 0.95, source: "sala de 5 m" });

describe("buildForm", () => {
    it("keeps what the AI did not read empty and counts it as missing", () => {
        const levels = initialLevels([
            {
                fields: { title: read("Planta baja") },
                rooms: [{ name: read("sala"), width_m: read(5) }],
                components: [],
            },
        ]);

        expect(levels[0].rooms[0].values).toEqual({ name: "sala", width_m: "5" });
        // x, y, depth and height of the room.
        expect(countMissing(levels)).toBe(4);
        expect(toApply(levels)).toEqual({ error: "Falta «X (m)» en el ambiente 1 del nivel 1." });
    });

    it("sends complete levels with numbers and without empty optional fields", () => {
        const [level] = initialLevels([
            { fields: { title: read("Planta baja") }, rooms: [], components: [] },
        ]);
        const wall = emptyItem();
        wall.values = {
            kind: "wall",
            name: "Muro",
            x_m: "0",
            y_m: "-1,5",
            width_m: "0,2",
            depth_m: "4",
            height_m: "2.6",
        };

        expect(toApply([{ ...level, components: [wall] }])).toEqual({
            data: {
                levels: [
                    {
                        title: "Planta baja",
                        rooms: [],
                        components: [
                            {
                                kind: "wall",
                                name: "Muro",
                                x_m: 0,
                                y_m: -1.5,
                                width_m: 0.2,
                                depth_m: 4,
                                height_m: 2.6,
                            },
                        ],
                    },
                ],
            },
        });
    });

    it("refuses a measure that is not positive and an empty proposal", () => {
        const [level] = initialLevels([
            { fields: { title: read("P") }, rooms: [], components: [] },
        ]);
        const room = emptyItem();
        room.values = { name: "a", x_m: "0", y_m: "0", width_m: "0", depth_m: "1", height_m: "1" };

        expect(toApply([{ ...level, rooms: [room] }])).toEqual({
            error: "«Ancho (m)» en el ambiente 1 del nivel 1 debe ser mayor que 0 y menor que 1000.",
        });
        expect(toApply([])).toEqual({ error: "Deja al menos un nivel." });
    });
});

it("refuses a measure that reaches 1000 once rounded like the backend", () => {
    const [level] = initialLevels([{ fields: { title: read("P") }, rooms: [], components: [] }]);
    const room = emptyItem();
    room.values = {
        name: "a",
        x_m: "0",
        y_m: "0",
        width_m: "999,999",
        depth_m: "1",
        height_m: "1",
    };

    expect(toApply([{ ...level, rooms: [room] }])).toHaveProperty("error");
});
