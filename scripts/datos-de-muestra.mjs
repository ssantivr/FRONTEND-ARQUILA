// Sample answers for the API, shared by the screenshots, the accessibility and movement checks
// and the browser tests. They never show a real account, and nothing in this file ships with
// the app.
//
// The data is one believable project, «Casa Mirador»: a house of two levels and eight rooms on
// an irregular lot of six vertices with a gentle slope, with its structure, its materials and
// costs and its recommendations. A second, simpler project («Estudio Guadua») shows how the
// lists look with more than one.
const NOW = "2026-10-05T10:00:00Z";

/** The demo account of the README; the password never reaches this file. */
export const user = { id: 1, name: "Usuario demo", email: "demo@example.com", created_at: NOW };

export const projects = [
    {
        id: 1,
        owner_id: 1,
        name: "Casa Mirador",
        description: "Vivienda de dos niveles en ladera, con vista al valle.",
        location: "Manizales, Caldas",
        status: "active",
        created_at: "2026-09-01T10:00:00Z",
        updated_at: "2026-10-04T10:00:00Z",
    },
    {
        id: 2,
        owner_id: 1,
        name: "Estudio Guadua",
        description: "Taller de un nivel en un lote rectangular.",
        location: "Pereira, Risaralda",
        status: "draft",
        created_at: "2026-09-20T10:00:00Z",
        updated_at: "2026-09-28T10:00:00Z",
    },
];

// ---- Casa Mirador ----

// The lot as the user wrote it in the Terreno tab: six vertices from its own origin.
const LOT = [
    [2, 0],
    [24, 0],
    [26, 12],
    [22, 24],
    [4, 24],
    [0, 12],
];
// In the model the house starts at (0, 0), 7 m in from the left of the lot and 6 m from its front.
const LOT_OFFSET = [-7, -6];

/** Gauss's area formula, so the figure shown is the one of the outline drawn. */
function areaOf(points) {
    return Math.abs(
        points.reduce((sum, [x, y], index) => {
            const [nextX, nextY] = points[(index + 1) % points.length];

            return sum + x * nextY - nextX * y;
        }, 0) / 2,
    );
}

const terrainsOfMirador = [
    {
        id: 1,
        project_id: 1,
        name: "Lote Mirador",
        area_m2: areaOf(LOT),
        width_m: null,
        length_m: null,
        points: LOT.map(([x_m, y_m]) => ({ x_m, y_m })),
        slope_percent: 5,
        soil_type: "Limo arcilloso",
        latitude: 5.0703,
        longitude: -75.5138,
        created_at: NOW,
    },
];

const LEVELS = { 1: "Planta baja", 2: "Planta alta" };
const STOREY_M = 3;

function element(kind, id, name, level, x_m, y_m, width_m, depth_m, height_m, base_m) {
    return {
        kind,
        id,
        plan_id: level,
        plan_title: LEVELS[level],
        name,
        level: String(level),
        x_m,
        y_m,
        base_m: base_m ?? (level - 1) * STOREY_M,
        width_m,
        depth_m,
        height_m,
        surface: null,
    };
}

const room = (id, name, level, x, y, width, depth) =>
    element("room", id, name, level, x, y, width, depth, 2.8);

// Eight rooms, 161.5 m² built: 100 m² on the ground and 61.5 m² above.
const rooms = [
    room(1, "Sala", 1, 0, 0, 6, 5),
    room(2, "Comedor", 1, 6, 0, 4.5, 5),
    room(3, "Cocina", 1, 0, 5, 4.5, 5),
    room(4, "Estudio", 1, 4.5, 5, 3.5, 5),
    room(5, "Baño social", 1, 8, 5, 2.5, 3),
    room(6, "Alcoba principal", 2, 0, 0, 6, 5),
    room(7, "Alcoba 2", 2, 6, 0, 4.5, 5),
    room(8, "Baño", 2, 0, 5, 3, 3),
];

const COLUMN_M = 0.3;
const column = (id, name, x, y) => element("column", id, name, 1, x, y, COLUMN_M, COLUMN_M, 2.8);
const beam = (id, name, x, y, width, depth) =>
    element("beam", id, name, 1, x, y, width, depth, 0.4, 2.4);

const components = [
    column(1, "C1", 0, 0),
    column(2, "C2", 10.2, 0),
    column(3, "C3", 0, 9.7),
    column(4, "C4", 10.2, 9.7),
    beam(5, "V1", 0, 0, 10.5, 0.25),
    beam(6, "V2", 0, 4.9, 10.5, 0.25),
    beam(7, "V3", 0, 9.75, 10.5, 0.25),
    // The wall that holds the slope behind the house.
    element("wall", 8, "M1", 1, 0, 10, 10.5, 0.2, 1.4),
];

const structureOfMirador = {
    project_id: 1,
    roof: "gable",
    terrains: [
        {
            id: 1,
            name: "Lote Mirador",
            outline: LOT.map(([x, y]) => ({ x_m: x + LOT_OFFSET[0], y_m: y + LOT_OFFSET[1] })),
        },
    ],
    rooms,
    components,
};

const materialsOfMirador = [
    ["Concreto de 3000 psi", "Estructura", "m³", 38, 115],
    ["Acero de refuerzo", "Estructura", "kg", 2400, 1.25],
    ["Ladrillo tolete", "Mampostería", "u", 9800, 0.32],
    ["Mortero de pega", "Mampostería", "saco", 140, 7.5],
    ["Teja de barro", "Cubierta", "m²", 110, 14],
    ["Madera para la cubierta", "Cubierta", "m", 260, 6.8],
    ["Porcelanato", "Acabados", "m²", 150, 21],
    ["Pintura para interiores", "Acabados", "gal", 36, 28],
    ["Tubería de PVC", "Instalaciones", "m", 180, 3.2],
    ["Cable eléctrico", "Instalaciones", "m", 620, 0.9],
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

// They name elements of the model (C1, M1, Sala…), so the «Alertas» colour mode has what to show.
const recommendationsOfMirador = [
    [
        "Estructura",
        "high",
        "system",
        "La columna C1 queda en la parte baja del lote: revisa su cimentación por la pendiente del 5 %.",
    ],
    [
        "Estructura",
        "high",
        "ai",
        "El muro M1 contiene el terreno detrás de la casa. Necesita drenaje y un cálculo de empuje.",
    ],
    [
        "Confort",
        "medium",
        "ai",
        "La Sala recibe el sol de la tarde. Un alero de 80 cm sobre sus ventanas reduce el calor.",
    ],
    [
        "Normativa",
        "medium",
        "system",
        "El COS es 0,18 y el máximo que escribiste es 0,60: hay margen para ampliar la planta baja.",
    ],
    [
        "Presupuesto",
        "low",
        "user",
        "Cotizar la teja de barro con dos proveedores antes de comprar.",
    ],
    [
        "Confort",
        "low",
        "ai",
        "El Baño social no tiene ventana al exterior: considera un ducto de ventilación.",
    ],
].map(([category, priority, source, content], index) => ({
    id: index + 1,
    project_id: 1,
    category,
    content,
    source,
    priority,
    created_at: NOW,
}));

const plansOfMirador = Object.entries(LEVELS).map(([level, title]) => ({
    id: Number(level),
    project_id: 1,
    file_id: null,
    title,
    level,
    scale: "1:100",
    created_at: NOW,
}));

const elevationsOfMirador = [
    ["Fachada principal", "south"],
    ["Fachada posterior", "north"],
].map(([title, orientation], index) => ({
    id: index + 1,
    project_id: 1,
    file_id: null,
    title,
    orientation,
    created_at: NOW,
}));

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

// ---- Estudio Guadua: one level, two rooms, a rectangular lot ----

const terrainsOfGuadua = [
    {
        id: 2,
        project_id: 2,
        name: "Lote del taller",
        area_m2: 150,
        width_m: 10,
        length_m: 15,
        points: [],
        slope_percent: 0,
        soil_type: "Grava compacta",
        latitude: null,
        longitude: null,
        created_at: NOW,
    },
];

const structureOfGuadua = {
    project_id: 2,
    roof: "flat",
    terrains: [
        {
            id: 2,
            name: "Lote del taller",
            outline: [
                [-2, -3],
                [8, -3],
                [8, 12],
                [-2, 12],
            ].map(([x_m, y_m]) => ({ x_m, y_m })),
        },
    ],
    rooms: [
        { ...room(9, "Taller", 1, 0, 0, 6, 5), plan_id: 3 },
        { ...room(10, "Depósito", 1, 0, 5, 3, 3), plan_id: 3 },
    ],
    components: [],
};

const materialsOfGuadua = [
    ["Guadua tratada", "Estructura", "m", 320, 4.5],
    ["Lámina de cubierta", "Cubierta", "m²", 48, 11],
].map(([name, category, unit, quantity, unit_cost], index) => ({
    id: materialsOfMirador.length + index + 1,
    project_id: 2,
    name,
    category,
    unit,
    quantity,
    unit_cost,
    created_at: NOW,
}));

// ---- What each route answers ----

const BY_PROJECT = {
    1: {
        structure: structureOfMirador,
        terrains: terrainsOfMirador,
        materials: materialsOfMirador,
        recommendations: recommendationsOfMirador,
        plans: plansOfMirador,
        elevations: elevationsOfMirador,
    },
    2: {
        structure: structureOfGuadua,
        terrains: terrainsOfGuadua,
        materials: materialsOfGuadua,
        recommendations: [],
        plans: [{ ...plansOfMirador[0], id: 3, project_id: 2 }],
        elevations: [],
    },
};

const allTerrains = [...terrainsOfMirador, ...terrainsOfGuadua];
const allMaterials = [...materialsOfMirador, ...materialsOfGuadua];

export const summary = {
    projects: projects.length,
    draft_projects: projects.filter((project) => project.status === "draft").length,
    active_projects: projects.filter((project) => project.status === "active").length,
    archived_projects: projects.filter((project) => project.status === "archived").length,
    terrains: allTerrains.length,
    total_area_m2: allTerrains.reduce((sum, terrain) => sum + terrain.area_m2, 0),
    materials_total_cost: allMaterials.reduce(
        (sum, material) => sum + material.quantity * material.unit_cost,
        0,
    ),
};

/** A room or component as its own list gives it, without the fields only the model has. */
function plain(item, projectId) {
    const { kind, plan_title, level, base_m, surface, ...rest } = item;

    void plan_title;
    void level;
    void base_m;
    void surface;

    return {
        ...rest,
        ...(kind === "room" ? {} : { kind }),
        project_id: projectId,
        created_at: NOW,
    };
}

// The project's own screens ask without a query; only Casa Mirador has tasks.
function tasksOf(projectId) {
    return projectId === null || projectId === "1" ? tasks : [];
}

/** What the API would answer to a GET of `path`. Unknown lists come back empty. */
export function answer(path, query = new URLSearchParams()) {
    if (path === "/auth/me") return user;
    if (path === "/summary") return summary;
    if (path === "/health") return { status: "ok" };
    if (path === "/assistant/status") return { provider: "rules", model: null };

    if (path === "/projects") {
        const wanted = (query.get("search") ?? "").toLowerCase();

        return projects.filter((project) => project.name.toLowerCase().includes(wanted));
    }

    const [, projectId, list] = /^\/projects\/(\d+)(?:\/([\w-]+))?$/.exec(path) ?? [];

    if (projectId !== undefined) {
        const data = BY_PROJECT[projectId];

        if (list === undefined) {
            return projects.find((project) => String(project.id) === projectId) ?? projects[0];
        }

        if (data === undefined) {
            // A project created during a test: it exists and is still empty.
            return list === "structure"
                ? {
                      project_id: Number(projectId),
                      roof: "gable",
                      terrains: [],
                      rooms: [],
                      components: [],
                  }
                : [];
        }

        if (list === "rooms") {
            return data.structure.rooms.map((item) => plain(item, Number(projectId)));
        }

        if (list === "components") {
            return data.structure.components.map((item) => plain(item, Number(projectId)));
        }

        return data[list] ?? [];
    }

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

    return [];
}
