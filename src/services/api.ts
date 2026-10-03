import type {
    Elevation,
    ElevationCreate,
    ElevationUpdate,
    Material,
    MaterialCreate,
    MaterialUpdate,
    Orientation,
    Plan,
    PlanCreate,
    PlanUpdate,
    Project,
    ProjectCreate,
    ProjectFilters,
    ProjectUpdate,
    Terrain,
    TerrainCreate,
    TerrainUpdate,
    User,
    UserCreate,
} from "../types/api";
import { request } from "./http";

export const healthApi = {
    check: () => request<{ status: string }>("/health"),
};

export const usersApi = {
    list: () => request<User[]>("/users"),
    get: (id: number) => request<User>(`/users/${id}`),
    create: (data: UserCreate) => request<User>("/users", { method: "POST", body: data }),
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
