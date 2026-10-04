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
    ProjectUpdate,
    RegisterRequest,
    Summary,
    Recommendation,
    RecommendationCreate,
    RecommendationFilters,
    Room,
    RoomCreate,
    RoomUpdate,
    StructuralComponent,
    Structure,
    Terrain,
    TerrainCreate,
    TerrainUpdate,
    User,
} from "../types/api";
import { apiUrl, request, upload } from "./http";

export const healthApi = {
    check: () => request<{ status: string }>("/health"),
};

export const authApi = {
    me: () => request<User>("/auth/me"),
    register: (data: RegisterRequest) =>
        request<User>("/auth/register", { method: "POST", body: data }),
    login: (data: LoginRequest) =>
        request<User>("/auth/login", { method: "POST", body: data }),
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
    create: (data: ProjectCreate) =>
        request<Project>("/projects", { method: "POST", body: data }),
    update: (id: number, data: ProjectUpdate) =>
        request<Project>(`/projects/${id}`, { method: "PATCH", body: data }),
    remove: (id: number) => request<void>(`/projects/${id}`, { method: "DELETE" }),
};

export async function loadAcrossProjects<T>(
    loader: (projectId: number) => Promise<T[]>,
): Promise<{ projects: Project[]; items: T[] }> {
    const projects = await projectsApi.list();
    const lists = await Promise.all(projects.map((project) => loader(project.id)));

    return { projects, items: lists.flat() };
}

export const terrainsApi = {
    listByProject: (projectId: number) =>
        request<Terrain[]>(`/projects/${projectId}/terrains`),
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
    get: (projectId: number) => request<Structure>(`/projects/${projectId}/structure`),
};

export const filesApi = {
    listByProject: (projectId: number) =>
        request<ProjectFile[]>(`/projects/${projectId}/files`),
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
