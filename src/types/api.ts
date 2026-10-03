// Mirrors backend/app/schemas.py. Keep both files in sync.

export type ProjectStatus = "draft" | "active" | "archived";
export type Orientation = "north" | "south" | "east" | "west";
export type RecommendationSource = "ai" | "user" | "system";
export type DeletedItemKind = "terrain" | "material" | "plan" | "elevation";

// A deletion that can still be undone. The backend keeps this history in memory.
export interface DeletedItem {
    kind: DeletedItemKind;
    label: string;
}

export interface Recommendation {
    id: number;
    project_id: number;
    category: string;
    content: string;
    source: RecommendationSource;
    created_at: string;
}

export interface RecommendationCreate {
    category: string;
    content: string;
}

export interface RecommendationFilters {
    category?: string;
    source?: RecommendationSource;
}

export interface Plan {
    id: number;
    project_id: number;
    file_id: number | null;
    title: string;
    level: string | null;
    scale: string | null;
    created_at: string;
}

export interface PlanCreate {
    file_id?: number | null;
    title: string;
    level?: string | null;
    scale?: string | null;
}

export type PlanUpdate = Partial<PlanCreate>;

export interface Elevation {
    id: number;
    project_id: number;
    file_id: number | null;
    title: string;
    orientation: Orientation;
    created_at: string;
}

export interface ElevationCreate {
    file_id?: number | null;
    title: string;
    orientation: Orientation;
}

export type ElevationUpdate = Partial<ElevationCreate>;

export interface User {
    id: number;
    name: string;
    email: string;
    created_at: string;
}

export interface UserCreate {
    name: string;
    email: string;
}

export interface Project {
    id: number;
    owner_id: number;
    name: string;
    description: string | null;
    location: string | null;
    status: ProjectStatus;
    created_at: string;
    updated_at: string;
}

export interface ProjectCreate {
    owner_id: number;
    name: string;
    description?: string | null;
    location?: string | null;
    status?: ProjectStatus;
}

export type ProjectUpdate = Partial<Omit<ProjectCreate, "owner_id">>;

export interface ProjectFilters {
    owner_id?: number;
    status?: ProjectStatus;
    search?: string;
}

export interface Terrain {
    id: number;
    project_id: number;
    name: string;
    area_m2: number;
    slope_percent: number | null;
    soil_type: string | null;
    latitude: number | null;
    longitude: number | null;
    created_at: string;
}

export interface TerrainCreate {
    name: string;
    area_m2: number;
    slope_percent?: number | null;
    soil_type?: string | null;
    latitude?: number | null;
    longitude?: number | null;
}

export type TerrainUpdate = Partial<TerrainCreate>;

export interface Material {
    id: number;
    project_id: number;
    name: string;
    category: string | null;
    unit: string;
    quantity: number;
    unit_cost: number;
    created_at: string;
}

export interface MaterialCreate {
    name: string;
    category?: string | null;
    unit: string;
    quantity?: number;
    unit_cost?: number;
}

export type MaterialUpdate = Partial<MaterialCreate>;

// Named ProjectFile to avoid clashing with the DOM File type.
export interface ProjectFile {
    id: number;
    project_id: number;
    filename: string;
    mime_type: string;
    size_bytes: number;
    created_at: string;
}
