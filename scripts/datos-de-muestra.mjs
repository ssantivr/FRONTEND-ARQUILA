// Sample answers for the API, shared by the screenshot and accessibility scripts. They never
// show a real account, and nothing in this file ships with the app.
const NOW = "2026-10-05T10:00:00Z";

const user = { id: 1, name: "Ana Torres", email: "ana@example.com", created_at: NOW };
const projects = ["Casa Andina", "Oficina Central", "Loft Norte", "Vivienda Mirador"].map(
    (name, index) => ({
        id: index + 1,
        owner_id: 1,
        name,
        description: "Vivienda de dos niveles con patio interior.",
        location: index === 1 ? null : "Quito",
        status: ["active", "draft", "archived", "active"][index],
        created_at: NOW,
        updated_at: `2026-10-0${index + 1}T10:00:00Z`,
    }),
);
const terrains = [
    {
        id: 1,
        project_id: 1,
        name: "Lote principal",
        area_m2: 480,
        width_m: 24,
        length_m: 20,
        points: [
            { x_m: 0, y_m: 0 },
            { x_m: 24, y_m: 0 },
            { x_m: 24, y_m: 14 },
            { x_m: 14, y_m: 20 },
            { x_m: 0, y_m: 20 },
        ],
        slope_percent: 4,
        soil_type: "Arcilloso",
        latitude: null,
        longitude: null,
        created_at: NOW,
    },
];
const materials = [
    ["Ladrillo", "Mampostería", "u", 4200, 0.35],
    ["Cemento", "Estructura", "saco", 180, 8.2],
    ["Acero corrugado", "Estructura", "kg", 950, 1.4],
    ["Porcelanato", "Acabados", "m²", 120, 22],
].map(([name, category, unit, quantity, unit_cost], index) => ({
    id: index + 1,
    project_id: 1,
    name,
    category,
    unit,
    quantity,
    unit_cost,
    created_at: NOW,
}));
const room = (id, name, level, x, y) => ({
    kind: "room",
    id,
    plan_id: level,
    plan_title: level === 1 ? "Planta baja" : "Planta alta",
    name,
    level: String(level),
    x_m: x,
    y_m: y,
    base_m: (level - 1) * 3,
    width_m: 6,
    depth_m: 5,
    height_m: 2.8,
    surface: null,
});
const structure = {
    project_id: 1,
    roof: "gable",
    terrains: [
        {
            id: 1,
            name: "Lote principal",
            outline: [
                { x_m: -6, y_m: -5 },
                { x_m: 18, y_m: -5 },
                { x_m: 18, y_m: 15 },
                { x_m: -6, y_m: 15 },
            ],
        },
    ],
    rooms: [
        room(1, "Sala", 1, 3, 2.5),
        room(2, "Cocina", 1, 9, 2.5),
        room(3, "Comedor", 1, 3, 7.5),
        room(4, "Dormitorio", 2, 3, 2.5),
        room(5, "Baño", 2, 9, 2.5),
    ],
    components: [],
};

const tasks = [
    ["Replanteo y excavación", "structure", "completed", "2026-09-01", "2026-09-12", 1800],
    ["Fundir la losa de entrepiso", "structure", "in_progress", "2026-09-20", "2026-10-02", 5200],
    ["Tubería de agua potable", "installations", "in_progress", "2026-10-01", "2026-10-20", 940],
    ["Cableado eléctrico", "installations", "planned", "2026-10-15", "2026-11-05", 1300],
    ["Porcelanato de la sala", "finishes", "planned", null, null, null],
    ["Cielo raso de yeso", "finishes", "cancelled", null, null, null],
].map(([title, layer, status, planned_start, planned_end, estimated_cost], index) => ({
    id: index + 1,
    project_id: 1,
    room_id: null,
    spatial_element_id: null,
    created_by: 1,
    layer,
    title,
    description: null,
    status,
    planned_start,
    planned_end,
    completed_at: status === "completed" ? NOW : null,
    estimated_cost,
    created_at: NOW,
    updated_at: NOW,
}));

// The project's own screens ask without a query; only the first sample project has tasks.
function tasksOf(projectId) {
    return projectId === null || projectId === "1" ? tasks : [];
}

export function answer(path, query = new URLSearchParams()) {
    if (path === "/auth/me") return user;
    if (path === "/summary") {
        return {
            projects: 4,
            draft_projects: 1,
            active_projects: 2,
            archived_projects: 1,
            terrains: 1,
            total_area_m2: 480,
            materials_total_cost: 6916,
        };
    }
    if (path === "/projects") return projects;
    if (/^\/projects\/\d+$/.test(path)) return projects[0];
    // Every sample project draws the same sample building, under its own id.
    if (path.endsWith("/structure")) {
        return { ...structure, project_id: Number(path.split("/")[2]) };
    }
    if (path.endsWith("/terrains")) return path.startsWith("/projects/1/") ? terrains : [];
    if (path.endsWith("/materials")) return path.startsWith("/projects/1/") ? materials : [];
    if (path.includes("spatial-data")) {
        return {
            project_id: 1,
            counts: { structure: 0, installations: 0, finishes: 0 },
            elements: [],
        };
    }
    if (path.includes("interior-walkthrough")) {
        return { project_id: 1, steps: [], renovation_logs: tasksOf(query.get("project_id")) };
    }
    if (path === "/health") return { status: "ok" };
    if (path === "/assistant/status") return { provider: "rules", model: null };

    return [];
}
