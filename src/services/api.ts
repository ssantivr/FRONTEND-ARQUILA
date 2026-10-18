import type {
    AssistantStatus,
    ComponentCreate,
    ComponentKind,
    ComponentUpdate,
    Conversation,
    ConversationDetail,
    ConversationMessage,
    DeletedItem,
    Elevation,
    ElevationCreate,
    ElevationUpdate,
    LoginRequest,
    Material,
    MaterialCreate,
    MaterialUpdate,
    Orientation,
    Plan,
    PlanCreate,
    PlanUpdate,
    Project,
    ProjectCreate,
    ProjectFile,
    ProjectFilters,
    ProjectTemplate,
    ProjectUpdate,
    RegisterRequest,
    RenovationLog,
    RenovationLogCreate,
    RenovationStatus,
    SpatialData,
    Summary,
    Recommendation,
    RecommendationCreate,
    RecommendationFilters,
    Room,
    RoomCreate,
    RoomSpatial,
    RoomUpdate,
    StructuralComponent,
    RoofKind,
    Structure,
    StructureElement,
    SurfaceMaterialId,
    Terrain,
    TerrainCreate,
    TerrainUpdate,
    User,
    Walkthrough,
} from "../types/api";
import { apiUrl, onWrite, request, upload } from "./http";

export const healthApi = {
    check: () => request<{ status: string }>("/health"),
};

export const authApi = {
    me: () => request<User>("/auth/me"),
    register: (data: RegisterRequest) =>
        request<User>("/auth/register", { method: "POST", body: data }),
    login: (data: LoginRequest) => request<User>("/auth/login", { method: "POST", body: data }),
    logout: () => request<void>("/auth/logout", { method: "POST" }),
    requestPasswordReset: (email: string) =>
        request<void>("/auth/password-reset", { method: "POST", body: { email } }),
    confirmPasswordReset: (token: string, password: string) =>
        request<void>("/auth/password-reset/confirm", {
            method: "POST",
            body: { token, password },
        }),
};

export const projectsApi = {
    list: (filters: ProjectFilters = {}) =>
        request<Project[]>("/projects", { query: { ...filters } }),
    get: (id: number) => request<Project>(`/projects/${id}`),
    create: (data: ProjectCreate) => request<Project>("/projects", { method: "POST", body: data }),
    update: (id: number, data: ProjectUpdate) =>
        request<Project>(`/projects/${id}`, { method: "PATCH", body: data }),
    remove: (id: number) => request<void>(`/projects/${id}`, { method: "DELETE" }),
};

export const templatesApi = {
    list: () => request<ProjectTemplate[]>("/templates"),
    createProject: (templateId: string) =>
        request<Project>(`/templates/${templateId}/projects`, { method: "POST" }),
};

const ACROSS_PROJECTS_TTL_MS = 30_000;

interface AcrossProjects<T> {
    projects: Project[];
    items: T[];
}

const acrossProjects = new Map<unknown, { at: number; value: Promise<AcrossProjects<unknown>> }>();

// Any write may change what these lists contain, and so may a different user signing in.
onWrite(() => acrossProjects.clear());

/**
 * The API has no route listing terrains or materials of every project, so this asks for the
 * projects and then for each one's list, all in parallel. The answer is kept for a short while so
 * that moving between screens does not repeat one request per project.
 */
export function loadAcrossProjects<T>(
    loader: (projectId: number) => Promise<T[]>,
): Promise<AcrossProjects<T>> {
    const cached = acrossProjects.get(loader);

    if (cached !== undefined && Date.now() - cached.at < ACROSS_PROJECTS_TTL_MS) {
        return cached.value as Promise<AcrossProjects<T>>;
    }

    const value = (async () => {
        const projects = await projectsApi.list();
        const lists = await Promise.all(projects.map((project) => loader(project.id)));

        return { projects, items: lists.flat() };
    })();

    acrossProjects.set(loader, { at: Date.now(), value });
    // A failed load is not worth remembering: the retry must reach the server again.
    value.catch(() => acrossProjects.delete(loader));

    return value;
}

export const terrainsApi = {
    listByProject: (projectId: number) => request<Terrain[]>(`/projects/${projectId}/terrains`),
    get: (id: number) => request<Terrain>(`/terrains/${id}`),
    create: (projectId: number, data: TerrainCreate) =>
        request<Terrain>(`/projects/${projectId}/terrains`, { method: "POST", body: data }),
    update: (id: number, data: TerrainUpdate) =>
        request<Terrain>(`/terrains/${id}`, { method: "PATCH", body: data }),
    remove: (id: number) => request<void>(`/terrains/${id}`, { method: "DELETE" }),
};

export const materialsApi = {
    listByProject: (projectId: number, category?: string) =>
        request<Material[]>(`/projects/${projectId}/materials`, { query: { category } }),
    get: (id: number) => request<Material>(`/materials/${id}`),
    create: (projectId: number, data: MaterialCreate) =>
        request<Material>(`/projects/${projectId}/materials`, { method: "POST", body: data }),
    update: (id: number, data: MaterialUpdate) =>
        request<Material>(`/materials/${id}`, { method: "PATCH", body: data }),
    remove: (id: number) => request<void>(`/materials/${id}`, { method: "DELETE" }),
};

export const undoApi = {
    list: (projectId: number) => request<DeletedItem[]>(`/projects/${projectId}/undo`),
    undoLast: (projectId: number) =>
        request<DeletedItem>(`/projects/${projectId}/undo`, { method: "POST" }),
};

export const recommendationsApi = {
    listByProject: (projectId: number, filters: RecommendationFilters = {}) =>
        request<Recommendation[]>(`/projects/${projectId}/recommendations`, {
            query: { ...filters },
        }),
    create: (projectId: number, data: RecommendationCreate) =>
        request<Recommendation>(`/projects/${projectId}/recommendations`, {
            method: "POST",
            body: data,
        }),
    generate: (projectId: number) =>
        request<Recommendation[]>(`/projects/${projectId}/recommendations/generate`, {
            method: "POST",
        }),
    remove: (id: number) => request<void>(`/recommendations/${id}`, { method: "DELETE" }),
};

export const plansApi = {
    listByProject: (projectId: number) => request<Plan[]>(`/projects/${projectId}/plans`),
    get: (id: number) => request<Plan>(`/plans/${id}`),
    create: (projectId: number, data: PlanCreate) =>
        request<Plan>(`/projects/${projectId}/plans`, { method: "POST", body: data }),
    update: (id: number, data: PlanUpdate) =>
        request<Plan>(`/plans/${id}`, { method: "PATCH", body: data }),
    remove: (id: number) => request<void>(`/plans/${id}`, { method: "DELETE" }),
};

export const elevationsApi = {
    listByProject: (projectId: number, orientation?: Orientation) =>
        request<Elevation[]>(`/projects/${projectId}/elevations`, { query: { orientation } }),
    get: (id: number) => request<Elevation>(`/elevations/${id}`),
    create: (projectId: number, data: ElevationCreate) =>
        request<Elevation>(`/projects/${projectId}/elevations`, { method: "POST", body: data }),
    update: (id: number, data: ElevationUpdate) =>
        request<Elevation>(`/elevations/${id}`, { method: "PATCH", body: data }),
    remove: (id: number) => request<void>(`/elevations/${id}`, { method: "DELETE" }),
};

export const roomsApi = {
    listByProject: (projectId: number) => request<Room[]>(`/projects/${projectId}/rooms`),
    create: (projectId: number, data: RoomCreate) =>
        request<Room>(`/projects/${projectId}/rooms`, { method: "POST", body: data }),
    update: (id: number, data: RoomUpdate) =>
        request<Room>(`/rooms/${id}`, { method: "PATCH", body: data }),
    remove: (id: number) => request<void>(`/rooms/${id}`, { method: "DELETE" }),
};

export const componentsApi = {
    listByProject: (projectId: number, kind?: ComponentKind) =>
        request<StructuralComponent[]>(`/projects/${projectId}/components`, { query: { kind } }),
    create: (projectId: number, data: ComponentCreate) =>
        request<StructuralComponent>(`/projects/${projectId}/components`, {
            method: "POST",
            body: data,
        }),
    update: (id: number, data: ComponentUpdate) =>
        request<StructuralComponent>(`/components/${id}`, { method: "PATCH", body: data }),
    remove: (id: number) => request<void>(`/components/${id}`, { method: "DELETE" }),
};

export const structureApi = {
    /**
     * The model of a project. The slope of each terrain is needed to draw it inclined, and the
     * route does not include it yet: when it is missing, it is read from the list of terrains
     * and added. If that second call fails, the model is still returned, drawn flat.
     */
    get: async (projectId: number): Promise<Structure> => {
        const structure = await request<Structure>(`/projects/${projectId}/structure`);

        if (
            structure.terrains.length === 0 ||
            structure.terrains.every((terrain) => terrain.slope_percent !== undefined)
        ) {
            return structure;
        }

        const slopes = await request<Terrain[]>(`/projects/${projectId}/terrains`)
            .then((terrains) => new Map(terrains.map((item) => [item.id, item.slope_percent])))
            .catch(() => new Map<number, number | null>());

        return {
            ...structure,
            terrains: structure.terrains.map((terrain) => ({
                ...terrain,
                slope_percent: terrain.slope_percent ?? slopes.get(terrain.id) ?? null,
            })),
        };
    },
    setRoof: (projectId: number, roof: RoofKind) =>
        request<void>(`/projects/${projectId}/structure/roof`, { method: "PATCH", body: { roof } }),
    setSurface: (projectId: number, element: StructureElement, surface: SurfaceMaterialId) =>
        request<void>(`/projects/${projectId}/structure/${element.kind}/${element.id}/surface`, {
            method: "PATCH",
            body: { surface },
        }),
};

export const filesApi = {
    listByProject: (projectId: number) => request<ProjectFile[]>(`/projects/${projectId}/files`),
    upload: (projectId: number, file: File) =>
        upload<ProjectFile>(`/projects/${projectId}/files`, file),
    contentUrl: (id: number) => apiUrl(`/files/${id}/content`),
    remove: (id: number) => request<void>(`/files/${id}`, { method: "DELETE" }),
};

export const conversationsApi = {
    status: () => request<AssistantStatus>("/assistant/status"),
    listByProject: (projectId: number) =>
        request<Conversation[]>(`/projects/${projectId}/conversations`),
    create: (projectId: number, title?: string) =>
        request<Conversation>(`/projects/${projectId}/conversations`, {
            method: "POST",
            body: { title },
        }),
    get: (id: number) => request<ConversationDetail>(`/conversations/${id}`),
    sendMessage: (id: number, content: string) =>
        request<ConversationMessage[]>(`/conversations/${id}/messages`, {
            method: "POST",
            body: { content },
        }),
    remove: (id: number) => request<void>(`/conversations/${id}`, { method: "DELETE" }),
};

export const summaryApi = {
    get: () => request<Summary>("/summary"),
};

export const spatialApi = {
    rooms: (projectId: number) =>
        request<RoomSpatial[]>("/api/v1/rooms", { query: { project_id: projectId } }),
    get: (projectId: number) =>
        request<SpatialData>("/api/v1/spatial-data", { query: { project_id: projectId } }),
};

export const walkthroughApi = {
    get: (projectId: number) =>
        request<Walkthrough>("/api/v1/interior-walkthrough", { query: { project_id: projectId } }),
    createLog: (data: RenovationLogCreate) =>
        request<RenovationLog>("/api/v1/interior-walkthrough/logs", { method: "POST", body: data }),
    setLogStatus: (id: number, status: RenovationStatus) =>
        request<RenovationLog>(`/api/v1/interior-walkthrough/logs/${id}`, {
            method: "PATCH",
            body: { status },
        }),
};

/**
 * The work log of one project: the tasks. A named function on purpose: the cache of
 * `loadAcrossProjects` is keyed by it, so the Tasks screen and the projects timeline share it.
 */
export const loadProjectTasks = (projectId: number) =>
    walkthroughApi.get(projectId).then((walkthrough) => walkthrough.renovation_logs);
